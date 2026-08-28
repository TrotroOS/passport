/** Deterministic HS code validation (Arbiter layer). */

export function normalizeHsCode(raw: string): string {
  return raw.replace(/[.\s-]/g, "").trim();
}

export function isValidHsCodeFormat(hsCode: string | null | undefined): boolean {
  if (!hsCode?.trim()) return false;
  const digits = normalizeHsCode(hsCode);
  return /^\d{6,10}$/.test(digits);
}

export function arbiterFilterSuggestions(
  suggestions: Array<{ hs_code: string; description_match: string; confidence: number }>
): Array<{ hs_code: string; description_match: string; confidence: number }> {
  const seen = new Set<string>();
  const valid: Array<{ hs_code: string; description_match: string; confidence: number }> = [];

  for (const item of suggestions) {
    const normalized = normalizeHsCode(item.hs_code);
    if (!isValidHsCodeFormat(normalized)) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    valid.push({
      hs_code: normalized,
      description_match: item.description_match.trim(),
      confidence: Math.max(0, Math.min(1, item.confidence)),
    });
  }

  return valid.sort((a, b) => b.confidence - a.confidence).slice(0, 3);
}

export function arbiterValidateSelectedCode(hsCode: string): {
  valid: boolean;
  normalized: string | null;
  error?: string;
} {
  const normalized = normalizeHsCode(hsCode);
  if (!isValidHsCodeFormat(normalized)) {
    return {
      valid: false,
      normalized: null,
      error: "HS code must be a numeric string with 6–10 digits",
    };
  }
  return { valid: true, normalized };
}
