export interface AIUsage {
  inputTokens: number;
  outputTokens: number;
  cost: number;
  latencyMs: number;
  model: string;
}

import type { ClassificationHints } from "./prompts";

export interface ClassifyAndExtractResult {
  docType: string;
  confidence: number;
  extractedData: Record<string, unknown>;
  rawResponse?: unknown;
  usage?: AIUsage;
  validationWarnings?: string[];
  detectedAbbreviation?: string;
}

export interface AIProvider {
  readonly name: string;
  readonly model: string;
  classifyAndExtract(
    documentUrl: string,
    mimeType: string,
    hints?: ClassificationHints
  ): Promise<ClassifyAndExtractResult>;
}

export type AIProviderName = "openai" | "anthropic" | "gemini";

export function getAIConfig() {
  const provider = (process.env.AI_PROVIDER ?? "openai") as AIProviderName;
  const model =
    process.env.AI_MODEL ??
    (provider === "openai" ? "gpt-4o-2024-08-06" : "gpt-4o");

  return { provider, model };
}
