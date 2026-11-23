import { sanitizeUserText } from "@/lib/security/sanitize-text";

const TECHNICAL_RE =
  /postgres|supabase|pgrst|jwt|rls|stack|exception|sqlstate|permission denied|violates|uuid|node_modules|econnrefused|internal server/i;

/**
 * User-facing error copy. Drops engine/DB/stack text so toasts never leak internals.
 */
export function maskClientError(raw: unknown, fallback: string): string {
  if (typeof raw !== "string") return fallback;
  const cleaned = sanitizeUserText(raw);
  if (!cleaned || cleaned.length > 160 || TECHNICAL_RE.test(cleaned)) {
    return fallback;
  }
  return cleaned;
}
