import type {
  Discrepancy,
  RegulatoryCheck,
  VerificationCheck,
} from "@/types/database";

const CORE_DOC_TYPES = [
  "invoice",
  "packing_list",
  "bill_of_lading",
  "import_declaration",
];

export interface ScoreBreakdown {
  overall_score: number;
  documentation_score: number;
  consistency_score: number;
  counterparty_score: number;
  regulatory_score: number | null;
  weights: {
    documentation: number;
    consistency: number;
    counterparty: number;
    regulatory?: number;
  };
  details: Record<string, unknown>;
}

export function calculateDocumentationScore(
  checks: VerificationCheck[]
): number {
  const presentCount = CORE_DOC_TYPES.filter((docType) => {
    const check = checks.find(
      (c) =>
        c.check_id === `doc_present_${docType}` ||
        (c.check_type === "missing_document" &&
          c.details &&
          typeof c.details === "object" &&
          (c.details as Record<string, unknown>).document_type === docType &&
          c.status === "passed")
    );
    return check?.status === "passed";
  }).length;

  return Math.round((presentCount / CORE_DOC_TYPES.length) * 100);
}

export function calculateConsistencyScore(
  openDiscrepancies: Discrepancy[]
): number {
  let score = 100;

  for (const d of openDiscrepancies) {
    if (
      d.discrepancy_type === "quantity_mismatch" ||
      d.discrepancy_type === "value_mismatch" ||
      d.discrepancy_type === "product_description_mismatch" ||
      d.discrepancy_type === "incomplete_extraction" ||
      d.discrepancy_type === "missing_document"
    ) {
      if (d.severity === "critical") score -= 15;
      else if (d.severity === "warning") score -= 5;
    }
  }

  return Math.max(0, score);
}

export function calculateCounterpartyScore(
  checks: VerificationCheck[],
  openDiscrepancies: Discrepancy[]
): number {
  const hasCounterpartyData = checks.some(
    (c) =>
      c.check_id === "seller_consistency" ||
      c.check_id === "buyer_consistency" ||
      c.check_id === "counterparty_data"
  );

  if (!hasCounterpartyData) return 50;

  let score = 100;

  const sellerMismatch = openDiscrepancies.some(
    (d) => d.discrepancy_type === "seller_mismatch" && d.status === "open"
  );
  const buyerMismatch = openDiscrepancies.some(
    (d) => d.discrepancy_type === "buyer_mismatch" && d.status === "open"
  );

  if (sellerMismatch) score -= 30;
  if (buyerMismatch) score -= 30;

  return Math.max(0, score);
}

export function calculateRegulatoryScoreComponent(
  regulatoryChecks: RegulatoryCheck[]
): number {
  const applicable = regulatoryChecks.filter(
    (c) => c.status !== "not_applicable"
  );
  if (applicable.length === 0) return 100;

  const passed = applicable.filter((c) => c.status === "passed").length;
  return Math.round((passed / applicable.length) * 100);
}

export function calculatePassportScoreFromData(
  checks: VerificationCheck[],
  discrepancies: Discrepancy[],
  regulatoryChecks: RegulatoryCheck[] = []
): ScoreBreakdown {
  const openDiscrepancies = discrepancies.filter((d) => d.status === "open");

  const documentation_score = calculateDocumentationScore(checks);
  const consistency_score = calculateConsistencyScore(openDiscrepancies);
  const counterparty_score = calculateCounterpartyScore(
    checks,
    openDiscrepancies
  );

  const hasRegulatoryChecks = regulatoryChecks.length > 0;
  const regulatory_score = hasRegulatoryChecks
    ? calculateRegulatoryScoreComponent(regulatoryChecks)
    : null;

  let overall_score: number;
  let weights: ScoreBreakdown["weights"];

  if (regulatory_score !== null) {
    weights = {
      documentation: 0.3,
      consistency: 0.3,
      counterparty: 0.1,
      regulatory: 0.3,
    };
    overall_score = Math.round(
      documentation_score * weights.documentation +
        consistency_score * weights.consistency +
        counterparty_score * weights.counterparty +
        regulatory_score * weights.regulatory!
    );
  } else {
    weights = { documentation: 0.4, consistency: 0.4, counterparty: 0.2 };
    overall_score = Math.round(
      documentation_score * weights.documentation +
        consistency_score * weights.consistency +
        counterparty_score * weights.counterparty
    );
  }

  const criticalCount = openDiscrepancies.filter(
    (d) => d.severity === "critical"
  ).length;
  const warningCount = openDiscrepancies.filter(
    (d) => d.severity === "warning"
  ).length;
  const failedRegulatoryCount = regulatoryChecks.filter(
    (c) => c.status === "failed"
  ).length;

  return {
    overall_score,
    documentation_score,
    consistency_score,
    counterparty_score,
    regulatory_score,
    weights,
    details: {
      open_discrepancies: openDiscrepancies.length,
      critical_discrepancies: criticalCount,
      warning_discrepancies: warningCount,
      failed_regulatory_checks: failedRegulatoryCount,
      regulatory_checks_total: regulatoryChecks.filter(
        (c) => c.status !== "not_applicable"
      ).length,
      core_documents_present: CORE_DOC_TYPES.filter((t) =>
        checks.some(
          (c) => c.check_id === `doc_present_${t}` && c.status === "passed"
        )
      ),
      core_documents_missing: CORE_DOC_TYPES.filter(
        (t) =>
          !checks.some(
            (c) => c.check_id === `doc_present_${t}` && c.status === "passed"
          )
      ),
    },
  };
}
