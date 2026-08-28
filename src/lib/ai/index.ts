import type { AIProvider, AIProviderName } from "./provider";
import { getAIConfig } from "./provider";
import { OpenAIProvider } from "./openai-provider";

export function createAIProvider(): AIProvider {
  const { provider } = getAIConfig();

  switch (provider as AIProviderName) {
    case "openai":
      if (!process.env.OPENAI_API_KEY) {
        throw new Error("OPENAI_API_KEY is required when AI_PROVIDER=openai");
      }
      return new OpenAIProvider();
    case "anthropic":
      throw new Error("Anthropic provider not yet implemented. Set AI_PROVIDER=openai.");
    case "gemini":
      throw new Error("Gemini provider not yet implemented. Set AI_PROVIDER=openai.");
    default:
      throw new Error(`Unknown AI_PROVIDER: ${provider}`);
  }
}

export type { AIProvider, ClassifyAndExtractResult, AIUsage } from "./provider";
export { PROMPT_VERSION } from "./prompts";
export {
  DOCUMENT_TYPES,
  EXTRACTION_SCHEMAS,
  REQUIRED_FIELDS,
  validateExtractedData,
} from "./schemas";
