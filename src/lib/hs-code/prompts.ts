import { appendAiLanguageInstruction } from "@/lib/i18n/ai-language";
import type { Locale } from "@/i18n/config";

export const HS_PROMPT_VERSION = "v1.1.0";

export const HS_ADVISORY =
  "AI HS code suggestions are advisory only. A licensed customs broker or qualified classifier must confirm the final HS classification before customs filing.";

export function buildHsSuggestSystemPrompt(targetLanguage?: Locale | string): string {
  const base = [
    "You are a trade classification assistant for import shipments.",
    "Suggest the top 3 most likely Harmonized System (HS) codes for a product.",
    "Use WCO HS nomenclature. Prefer 6-digit codes; 8-digit Ghana tariff codes are acceptable.",
    "Return ONLY valid JSON matching the schema.",
    "Never claim legal certainty — suggestions require human verification.",
    HS_ADVISORY,
  ].join(" ");
  return appendAiLanguageInstruction(base, targetLanguage ?? "en");
}

export function buildHsSuggestUserPrompt(input: {
  productName: string;
  description: string | null;
  quantity: number | null;
  unit: string | null;
  unitPrice: number | null;
  currency: string;
  countryOfOrigin: string | null;
  originCountry: string | null;
  destinationCountry: string | null;
}): string {
  return JSON.stringify(
    {
      task: "suggest_hs_codes",
      product: {
        name: input.productName,
        description: input.description,
        quantity: input.quantity,
        unit: input.unit,
        unit_price: input.unitPrice,
        currency: input.currency,
        country_of_origin: input.countryOfOrigin,
      },
      shipment: {
        origin_country: input.originCountry,
        destination_country: input.destinationCountry,
      },
      response_schema: {
        suggestions: [
          {
            hs_code: "string (6-10 digits, numeric only)",
            description_match: "string (brief reasoning)",
            confidence: "number 0-1",
          },
        ],
        advisory_note: "string (optional reminder about human verification)",
      },
      instruction: "Return exactly 3 suggestions ordered by confidence descending.",
    },
    null,
    2
  );
}

export function buildHsVerifySystemPrompt(targetLanguage?: Locale | string): string {
  const base = [
    "You assess whether an HS code is consistent with a product description for customs classification.",
    "Return ONLY valid JSON.",
    "If inconsistent or uncertain, set is_consistent to false and optionally suggest a better code.",
    HS_ADVISORY,
  ].join(" ");
  return appendAiLanguageInstruction(base, targetLanguage ?? "en");
}

export function buildHsVerifyUserPrompt(input: {
  productName: string;
  description: string | null;
  hsCode: string;
  originCountry: string | null;
  destinationCountry: string | null;
}): string {
  return JSON.stringify(
    {
      task: "verify_hs_code",
      product: {
        name: input.productName,
        description: input.description,
        hs_code: input.hsCode,
      },
      shipment: {
        origin_country: input.originCountry,
        destination_country: input.destinationCountry,
      },
      response_schema: {
        is_consistent: "boolean",
        reasoning: "string",
        confidence: "number 0-1",
        suggested_code: "string or null",
      },
    },
    null,
    2
  );
}
