export type ClearanceStage =
  | "pending"
  | "classifying"
  | "review_required"
  | "cleared_assistive"
  | "blocked";

export interface ClearanceClassificationInput {
  documentCount: number;
  pendingDocuments: number;
  productsTotal: number;
  productsWithoutHs: number;
  openDiscrepancies: number;
  criticalDiscrepancies: number;
  pendingTasks: number;
  failedRegulatoryChecks: number;
  overallScore: number | null;
  riskLevel: string | null;
  destinationSupported: boolean;
}

export interface ClearanceClassificationResult {
  stage: ClearanceStage;
  reasons: string[];
  recommendedActions: string[];
}

const ASSISTIVE_CLEARANCE_SCORE_MIN = 70;

export function classifyClearanceStage(
  input: ClearanceClassificationInput
): ClearanceClassificationResult {
  const reasons: string[] = [];
  const recommendedActions: string[] = [];

  if (input.pendingDocuments > 0) {
    reasons.push(`${input.pendingDocuments} document(s) still processing`);
    recommendedActions.push("Wait for document classification to finish");
    return { stage: "classifying", reasons, recommendedActions };
  }

  if (input.documentCount === 0) {
    reasons.push("No trade documents uploaded");
    recommendedActions.push("Upload invoice, packing list, and bill of lading");
    return { stage: "blocked", reasons, recommendedActions };
  }

  if (input.productsTotal === 0) {
    reasons.push("No product line items on shipment");
    recommendedActions.push("Add products so HS codes can be classified");
    return { stage: "review_required", reasons, recommendedActions };
  }

  if (input.productsWithoutHs > 0) {
    reasons.push(`${input.productsWithoutHs} product(s) missing HS classification`);
    recommendedActions.push("Review AI HS suggestions and confirm codes");
  }

  if (input.criticalDiscrepancies > 0) {
    reasons.push(`${input.criticalDiscrepancies} critical discrepancy(ies) open`);
    recommendedActions.push("Resolve critical cross-document mismatches");
  } else if (input.openDiscrepancies > 0) {
    reasons.push(`${input.openDiscrepancies} open discrepancy(ies)`);
    recommendedActions.push("Review and resolve document inconsistencies");
  }

  if (input.failedRegulatoryChecks > 0) {
    reasons.push(`${input.failedRegulatoryChecks} regulatory check(s) failed`);
    recommendedActions.push("Obtain required permits or documents for the import corridor");
  }

  if (input.pendingTasks > 0) {
    reasons.push(`${input.pendingTasks} workflow task(s) pending`);
    recommendedActions.push("Complete clearance workflow tasks");
  }

  if (input.overallScore != null && input.overallScore < ASSISTIVE_CLEARANCE_SCORE_MIN) {
    reasons.push(`Passport Score ${input.overallScore}/100 below clearance target`);
    recommendedActions.push("Improve documentation and consistency scores");
  }

  if (input.riskLevel === "critical" || input.riskLevel === "high") {
    reasons.push(`Risk level: ${input.riskLevel}`);
    recommendedActions.push("Review risk factors before filing with customs");
  }

  if (!input.destinationSupported) {
    reasons.push("Import corridor not in supported regulatory rule packs");
    recommendedActions.push("Set Ghana, Nigeria, or Kenya as destination for full regulatory screening");
  }

  const cleared =
    input.productsWithoutHs === 0 &&
    input.criticalDiscrepancies === 0 &&
    input.failedRegulatoryChecks === 0 &&
    input.pendingTasks === 0 &&
    (input.overallScore == null || input.overallScore >= ASSISTIVE_CLEARANCE_SCORE_MIN) &&
    input.riskLevel !== "critical" &&
    input.riskLevel !== "high";

  if (cleared) {
    return {
      stage: "cleared_assistive",
      reasons: [
        "Documents classified, HS codes assigned, verification and regulatory checks passed",
        "Assistive clearance ready — confirm with your licensed customs broker before filing",
      ],
      recommendedActions: ["Confirm owner readiness and share with your customs broker"],
    };
  }

  if (reasons.length <= 2 && input.criticalDiscrepancies === 0) {
    return { stage: "review_required", reasons, recommendedActions };
  }

  return { stage: "blocked", reasons, recommendedActions };
}

export function mapClearanceStageToShipmentStatus(
  stage: ClearanceStage
): "in_review" | "ready" | "blocked" | null {
  switch (stage) {
    case "cleared_assistive":
      return "ready";
    case "blocked":
      return "blocked";
    case "review_required":
    case "classifying":
      return "in_review";
    default:
      return null;
  }
}
