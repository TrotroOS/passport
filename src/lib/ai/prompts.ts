import {
  DOCUMENT_TYPES,
  getSchemaJsonSchema,
  type DocumentTypeName,
} from "./schemas";
import type { DocumentAbbreviation } from "@/lib/trade/abbreviations";
import { appendAiLanguageInstruction } from "@/lib/i18n/ai-language";

export const PROMPT_VERSION = "v2.1.0";

export interface ClassificationHints {
  uploadLabel?: string;
  fileName?: string;
  suggestedDocType?: string;
  detectedAbbreviation?: string;
  abbreviations?: DocumentAbbreviation[];
  targetLanguage?: string;
}

function buildAbbreviationBlock(abbreviations?: DocumentAbbreviation[]): string {
  if (!abbreviations?.length) return "";

  const lines = abbreviations
    .slice(0, 30)
    .map(
      (item) =>
        `- ${item.abbreviation} → ${item.canonical_doc_type}${item.description ? ` (${item.description})` : ""}`
    )
    .join("\n");

  return `
Common trade document abbreviations (map these to canonical docType values):
${lines}

If the document title, filename, or body uses an abbreviation (e.g. "BL No.", "CI", "PL"), classify using the canonical type above.
If the AI would return an abbreviation as docType, use the canonical type instead.`;
}

export function buildSystemPrompt(hints?: ClassificationHints): string {
  const schemaBlocks = DOCUMENT_TYPES.filter((t) => t !== "other")
    .map(
      (type) =>
        `### ${type}\n${getSchemaJsonSchema(type as DocumentTypeName)}`
    )
    .join("\n\n");

  const hintLines: string[] = [];
  if (hints?.uploadLabel) {
    hintLines.push(
      `Uploader labeled this document as "${hints.uploadLabel}" — verify independently.`
    );
  }
  if (hints?.fileName) {
    hintLines.push(`Original filename: "${hints.fileName}".`);
  }
  if (hints?.suggestedDocType) {
    hintLines.push(
      `Abbreviation analysis suggests type "${hints.suggestedDocType}" — confirm from document content.`
    );
  }
  if (hints?.detectedAbbreviation) {
    hintLines.push(
      `Detected trade abbreviation "${hints.detectedAbbreviation}" in filename or metadata.`
    );
  }

  const base = `You are a trade compliance document analyst specializing in international shipment documentation.

Your task:
1. CLASSIFY the document into exactly one type: ${DOCUMENT_TYPES.join(", ")}
2. EXTRACT all relevant fields for that type into extractedData

${hintLines.length ? `Classification hints:\n${hintLines.map((l) => `- ${l}`).join("\n")}` : ""}
${buildAbbreviationBlock(hints?.abbreviations)}

Return ONLY valid JSON with this exact top-level structure:
{
  "docType": "<one of: ${DOCUMENT_TYPES.join(", ")}>",
  "confidence": <number 0.0-1.0>,
  "extractedData": { <fields for the classified type> }
}

Rules:
- Use null for any field not found in the document
- Use ISO 8601 dates (YYYY-MM-DD)
- Use numeric types for amounts, weights, quantities (not strings)
- For line_items arrays, include every row visible in the document
- confidence reflects overall classification AND extraction quality
- Use confidence < 0.5 for blurry, incomplete, or ambiguous documents
- Use confidence >= 0.8 only when document type and key fields are clearly legible
- Extract incoterm when present (labels: Incoterm, Delivery Terms, Terms of Sale). Store as uppercase Incoterm 2020 code (EXW, FCA, FOB, CFR, CIF, DAP, DDP, etc.) in extractedData.incoterm
- Packing lists and invoices often include incoterm in headers or notes — extract when visible

Field schemas by document type:

${schemaBlocks}

### other
${getSchemaJsonSchema("other")}`;

  return appendAiLanguageInstruction(base, hints?.targetLanguage ?? "en");
}

export function buildVisionUserPrompt(hints?: ClassificationHints): string {
  const extra =
    hints?.suggestedDocType || hints?.detectedAbbreviation
      ? ` Pay attention to abbreviations such as ${hints.detectedAbbreviation ?? "BL/CI/PL"} and classify to the canonical document type.`
      : "";
  return `Analyze this trade document. Classify its type and extract all fields per the schema, including incoterm when present.${extra} Return JSON only.`;
}

export function buildTextUserPrompt(
  documentText: string,
  hints?: ClassificationHints
): string {
  const extra =
    hints?.suggestedDocType || hints?.detectedAbbreviation
      ? `\nHint: abbreviation analysis suggests "${hints.suggestedDocType ?? hints.detectedAbbreviation}".`
      : "";
  return `Analyze this trade document text. Classify its type and extract all fields per the schema, including incoterm when present.${extra} Return JSON only.

--- DOCUMENT TEXT ---
${documentText.slice(0, 30000)}`;
}
