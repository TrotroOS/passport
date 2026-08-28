/**
 * Deterministic text matching utilities for cross-document verification.
 */

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeName(name: string): string {
  return normalizeText(name);
}

export function tokenize(text: string): Set<string> {
  return new Set(
    normalizeText(text)
      .split(" ")
      .filter((t) => t.length > 1)
  );
}

export function jaccardSimilarity(a: string, b: string): number {
  if (!a.trim() || !b.trim()) return 0;
  const setA = tokenize(a);
  const setB = tokenize(b);
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  for (const token of Array.from(setA)) {
    if (setB.has(token)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0)
  );

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

export function levenshteinRatio(a: string, b: string): number {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const maxLen = Math.max(na.length, nb.length);
  if (maxLen === 0) return 1;
  return 1 - levenshteinDistance(na, nb) / maxLen;
}

export function namesMatch(a: string, b: string, fuzzyThreshold = 0.9): boolean {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  return levenshteinRatio(na, nb) >= fuzzyThreshold;
}

export function descriptionsSimilar(
  a: string,
  b: string,
  threshold = 0.85
): boolean {
  return (
    jaccardSimilarity(a, b) >= threshold ||
    levenshteinRatio(a, b) >= threshold
  );
}

export function percentDifference(a: number, b: number): number {
  if (a === 0 && b === 0) return 0;
  const baseline = Math.max(Math.abs(a), Math.abs(b));
  if (baseline === 0) return 0;
  return (Math.abs(a - b) / baseline) * 100;
}

export function sumLineItemQuantities(
  lineItems: unknown
): number | null {
  if (!Array.isArray(lineItems) || lineItems.length === 0) return null;
  let sum = 0;
  let hasValue = false;
  for (const item of lineItems) {
    if (item && typeof item === "object" && "quantity" in item) {
      const qty = (item as { quantity: unknown }).quantity;
      if (typeof qty === "number" && !isNaN(qty)) {
        sum += qty;
        hasValue = true;
      }
    }
  }
  return hasValue ? sum : null;
}

export function collectDescriptions(lineItems: unknown): string[] {
  if (!Array.isArray(lineItems)) return [];
  return lineItems
    .map((item) => {
      if (!item || typeof item !== "object") return "";
      const obj = item as Record<string, unknown>;
      const parts = [obj.product, obj.description].filter(
        (v) => typeof v === "string" && v.trim()
      );
      return parts.join(" ");
    })
    .filter(Boolean);
}
