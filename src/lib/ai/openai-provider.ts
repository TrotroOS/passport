import OpenAI from "openai";
import type { AIProvider, ClassifyAndExtractResult } from "./provider";
import { getAIConfig } from "./provider";
import {
  aiClassificationResponseSchema,
  DOCUMENT_TYPES,
  validateExtractedData,
  type DocumentTypeName,
} from "./schemas";
import {
  buildSystemPrompt,
  buildTextUserPrompt,
  buildVisionUserPrompt,
  PROMPT_VERSION,
  type ClassificationHints,
} from "./prompts";
import {
  buildAbbreviationLookup,
  mapClassificationToCanonical,
  type DocumentAbbreviation,
} from "@/lib/trade/abbreviations";
import { normalizeIncoterm } from "@/lib/trade/incoterms";

const INPUT_COST_PER_1M = 2.5;
const OUTPUT_COST_PER_1M = 10.0;

function estimateCost(inputTokens: number, outputTokens: number): number {
  return (
    (inputTokens / 1_000_000) * INPUT_COST_PER_1M +
    (outputTokens / 1_000_000) * OUTPUT_COST_PER_1M
  );
}

function isImageMime(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

function isPdfMime(mimeType: string): boolean {
  return mimeType === "application/pdf";
}

function parseAndValidateResponse(
  content: string,
  abbreviations: DocumentAbbreviation[],
  hintAbbreviation?: string
): ClassifyAndExtractResult {
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("AI response did not contain valid JSON");
  }

  const raw = JSON.parse(jsonMatch[0]) as unknown;
  const parsed = aiClassificationResponseSchema.safeParse(raw);

  if (!parsed.success) {
    throw new Error(
      `AI response failed schema validation: ${parsed.error.errors[0]?.message}`
    );
  }

  const lookup = buildAbbreviationLookup(abbreviations);
  const mapped = mapClassificationToCanonical(
    parsed.data.docType,
    lookup,
    DOCUMENT_TYPES
  );

  let docType = mapped.docType;
  let confidence = parsed.data.confidence;
  let extractedData = parsed.data.extractedData;
  const validationWarnings: string[] = [];
  const detectedAbbreviation =
    mapped.detectedAbbreviation ?? hintAbbreviation ?? undefined;

  if (!DOCUMENT_TYPES.includes(docType)) {
    docType = "other";
    confidence = confidence * 0.5;
    validationWarnings.push(`Unknown docType reclassified to other`);
  }

  const incoterm = normalizeIncoterm(extractedData.incoterm);
  if (incoterm) {
    extractedData = { ...extractedData, incoterm };
  }

  const fieldValidation = validateExtractedData(
    docType as DocumentTypeName,
    extractedData
  );

  if (!fieldValidation.success) {
    validationWarnings.push(`Field validation: ${fieldValidation.error}`);
    extractedData = { ...extractedData, _validation_errors: fieldValidation.error };
  } else {
    extractedData = fieldValidation.data;
  }

  return {
    docType,
    confidence,
    extractedData,
    detectedAbbreviation,
    validationWarnings: validationWarnings.length > 0 ? validationWarnings : undefined,
  };
}

export class OpenAIProvider implements AIProvider {
  readonly name = "openai";
  readonly model: string;
  private client: OpenAI;

  constructor(apiKey?: string, model?: string) {
    const config = getAIConfig();
    this.model = model ?? config.model;
    this.client = new OpenAI({ apiKey: apiKey ?? process.env.OPENAI_API_KEY });
  }

  async classifyAndExtract(
    documentUrl: string,
    mimeType: string,
    hints?: ClassificationHints
  ): Promise<ClassifyAndExtractResult> {
    const start = Date.now();
    let response: OpenAI.Chat.Completions.ChatCompletion;
    const abbreviations = hints?.abbreviations ?? [];

    if (isImageMime(mimeType)) {
      response = await this.client.chat.completions.create({
        model: this.model,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: buildSystemPrompt(hints) },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: documentUrl, detail: "high" },
              },
              { type: "text", text: buildVisionUserPrompt(hints) },
            ],
          },
        ],
        max_tokens: 4096,
      });
    } else if (isPdfMime(mimeType)) {
      const pdfResponse = await fetch(documentUrl);
      if (!pdfResponse.ok) {
        throw new Error(`Failed to fetch PDF from URL: ${pdfResponse.statusText}`);
      }
      const buffer = Buffer.from(await pdfResponse.arrayBuffer());
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: buffer });
      const textResult = await parser.getText();
      await parser.destroy();
      const text = textResult.text?.trim();

      if (!text || text.length < 20) {
        response = await this.client.chat.completions.create({
          model: this.model,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: buildSystemPrompt(hints) },
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  image_url: { url: documentUrl, detail: "high" },
                },
                {
                  type: "text",
                  text: `${buildVisionUserPrompt(hints)} This appears to be a scanned PDF with no extractable text.`,
                },
              ],
            },
          ],
          max_tokens: 4096,
        });
      } else {
        response = await this.client.chat.completions.create({
          model: this.model,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: buildSystemPrompt(hints) },
            {
              role: "user",
              content: buildTextUserPrompt(text, hints),
            },
          ],
          max_tokens: 4096,
        });
      }
    } else {
      const fileResponse = await fetch(documentUrl);
      if (!fileResponse.ok) {
        throw new Error(`Failed to fetch document from URL: ${fileResponse.statusText}`);
      }
      const text = await fileResponse.text();
      response = await this.client.chat.completions.create({
        model: this.model,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: buildSystemPrompt(hints) },
          {
            role: "user",
            content: buildTextUserPrompt(text, hints),
          },
        ],
        max_tokens: 4096,
      });
    }

    const latencyMs = Date.now() - start;
    const content = response.choices[0]?.message?.content;

    if (!content) {
      throw new Error("Empty response from OpenAI");
    }

    const result = parseAndValidateResponse(
      content,
      abbreviations,
      hints?.detectedAbbreviation
    );
    const inputTokens = response.usage?.prompt_tokens ?? 0;
    const outputTokens = response.usage?.completion_tokens ?? 0;

    return {
      ...result,
      rawResponse: response,
      usage: {
        inputTokens,
        outputTokens,
        cost: estimateCost(inputTokens, outputTokens),
        latencyMs,
        model: this.model,
      },
    };
  }
}

export { PROMPT_VERSION };
