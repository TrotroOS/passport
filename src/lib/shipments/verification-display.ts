import { formatDiscrepancyComparisons } from "@/lib/shipments/discrepancy-display";
import { sanitizeUserText } from "@/lib/security/sanitize-text";

export function verificationSummary(details: Record<string, unknown> | null | undefined): {
  message: string | null;
  rows: { label: string; display: string }[];
} {
  if (!details || typeof details !== "object") {
    return { message: null, rows: [] };
  }

  const rawMessage = details.message;
  const message =
    typeof rawMessage === "string" ? sanitizeUserText(rawMessage).slice(0, 200) || null : null;

  const rest = { ...details };
  delete rest.message;
  delete rest.document_ids;
  delete rest.mismatches;

  return {
    message,
    rows: formatDiscrepancyComparisons(rest as Record<string, unknown>),
  };
}
