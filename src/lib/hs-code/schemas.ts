import { z } from "zod";

export const hsCodeSuggestionItemSchema = z.object({
  hs_code: z.string().min(6).max(10),
  description_match: z.string().min(1).max(500),
  confidence: z.number().min(0).max(1),
});

export const hsSuggestResponseSchema = z.object({
  suggestions: z.array(hsCodeSuggestionItemSchema).min(1).max(5),
  advisory_note: z.string().optional(),
});

export const hsVerifyResponseSchema = z.object({
  is_consistent: z.boolean(),
  reasoning: z.string().min(1).max(1000),
  confidence: z.number().min(0).max(1),
  suggested_code: z.string().min(6).max(10).optional().nullable(),
});

export type HsSuggestResponse = z.infer<typeof hsSuggestResponseSchema>;
export type HsVerifyResponse = z.infer<typeof hsVerifyResponseSchema>;

export const selectHsCodeSchema = z.object({
  suggestionId: z.string().uuid(),
  markVerified: z.boolean().optional().default(true),
});
