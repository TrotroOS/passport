import { sanitizeUserText } from "@/lib/security/sanitize-text";

export interface DiscrepancyComparison {
  label: string;
  display: string;
}

const HIDDEN_KEY_RE =
  /^(id|.*_id|error|stack|sql|token|secret|password|exception|trace|message_raw)$/i;

const TECHNICAL_VALUE_RE =
  /postgres|supabase|pgrst|at\s+\S+\.(ts|js)|node_modules|sqlstate/i;

function humanizeKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatScalar(value: unknown): string | null {
  if (value == null) return "—";
  if (typeof value === "number" && Number.isFinite(value)) {
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string") {
    const text = sanitizeUserText(value);
    if (!text || TECHNICAL_VALUE_RE.test(text)) return null;
    return text.length > 120 ? `${text.slice(0, 117)}…` : text;
  }
  return null;
}

/**
 * Turns discrepancy.values into labeled rows. Drops ids, secrets, nested dumps, and engine errors.
 */
export function formatDiscrepancyComparisons(
  values: Record<string, unknown> | null | undefined
): DiscrepancyComparison[] {
  if (!values || typeof values !== "object" || Array.isArray(values)) {
    return [];
  }

  const rows: DiscrepancyComparison[] = [];

  for (const [key, raw] of Object.entries(values)) {
    if (HIDDEN_KEY_RE.test(key)) continue;

    const display = formatScalar(raw);
    if (display == null) continue;

    rows.push({ label: humanizeKey(key), display });
    if (rows.length >= 8) break;
  }

  return rows;
}

export function sanitizeDiscrepancyDescription(description: string | null | undefined): string {
  const text = sanitizeUserText(description ?? "");
  if (!text || TECHNICAL_VALUE_RE.test(text)) {
    return "";
  }
  return text.length > 280 ? `${text.slice(0, 277)}…` : text;
}
