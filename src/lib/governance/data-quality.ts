import { createAdminClient } from "@/lib/supabase/admin";

export interface DataQualityDimensions {
  completeness: number;
  accuracy: number;
  consistency: number;
  timeliness: number;
  validity: number;
  overall: number;
}

export interface DataQualityReport {
  shipmentId: string;
  dimensions: DataQualityDimensions;
  indicators: {
    documentsUploaded: number;
    documentsProcessed: number;
    extractionsNeedingReview: number;
    openDiscrepancies: number;
    lowConfidenceExtractions: number;
    humanOverrideCount: number;
    missingCoreDocuments: number;
  };
  issues: string[];
}

const CORE_DOCS = ["invoice", "packing_list", "bill_of_lading"];

/** Calculate data quality dimensions for a shipment. */
export async function calculateDataQuality(
  shipmentId: string
): Promise<DataQualityReport> {
  const admin = createAdminClient();
  const issues: string[] = [];

  const [{ data: documents }, { data: discrepancies }, { data: checks }] = await Promise.all([
    admin
      .from("documents")
      .select("id, doc_type, processing_status, doc_type_confidence")
      .eq("shipment_id", shipmentId),
    admin
      .from("discrepancies")
      .select("id, status, severity")
      .eq("shipment_id", shipmentId)
      .eq("status", "open"),
    admin.from("verification_checks").select("id, status").eq("shipment_id", shipmentId),
  ]);

  const docs = documents ?? [];
  const docIds = docs.map((d) => d.id);
  let exts: Array<{ id: string; confidence: number | null; needs_human_review: boolean; document_id: string }> = [];
  if (docIds.length > 0) {
    const { data: extData } = await admin
      .from("document_extractions")
      .select("id, confidence, needs_human_review, document_id")
      .in("document_id", docIds);
    exts = extData ?? [];
  }
  const openDisc = discrepancies ?? [];
  const verificationChecks = checks ?? [];

  const uploadedTypes = new Set(docs.map((d) => d.doc_type));
  const missingCore = CORE_DOCS.filter((t) => !uploadedTypes.has(t)).length;
  const processed = docs.filter((d) => d.processing_status === "processed").length;
  const needsReview = exts.filter((e) => e.needs_human_review).length;
  const lowConfidence = exts.filter((e) => (e.confidence ?? 1) < 0.6).length;

  const { count: overrideCount } = await admin
    .from("data_provenance_events")
    .select("id", { count: "exact", head: true })
    .eq("shipment_id", shipmentId)
    .eq("transformation", "human_override");

  const { count: humanConfirmCount } = await admin
    .from("audit_events")
    .select("id", { count: "exact", head: true })
    .eq("shipment_id", shipmentId)
    .eq("action", "document.extraction.confirmed");

  const humanOverrides = overrideCount ?? humanConfirmCount ?? 0;

  const completeness =
    CORE_DOCS.length > 0
      ? Math.round(((CORE_DOCS.length - missingCore) / CORE_DOCS.length) * 100)
      : 0;

  const failedChecks = verificationChecks.filter((c) => c.status === "failed").length;
  const accuracy = Math.max(
    0,
    100 - failedChecks * 10 - openDisc.filter((d) => d.severity === "critical").length * 15
  );

  const consistency = Math.max(0, 100 - openDisc.length * 8);

  const staleDocs = docs.filter((d) => d.processing_status === "pending" || d.processing_status === "failed").length;
  const timeliness = docs.length > 0 ? Math.round(((docs.length - staleDocs) / docs.length) * 100) : 50;

  const lowConfDocs = docs.filter((d) => (d.doc_type_confidence ?? 1) < 0.5).length;
  const validity = Math.max(0, 100 - lowConfDocs * 20 - needsReview * 10);

  if (missingCore > 0) issues.push(`${missingCore} core document(s) missing`);
  if (needsReview > 0) issues.push(`${needsReview} extraction(s) need human review`);
  if (openDisc.length > 0) issues.push(`${openDisc.length} open discrepancy(ies)`);
  if (lowConfidence > 0) issues.push(`${lowConfidence} low-confidence extraction(s)`);

  const overall = Math.round(
    completeness * 0.25 +
      accuracy * 0.25 +
      consistency * 0.2 +
      timeliness * 0.15 +
      validity * 0.15
  );

  return {
    shipmentId,
    dimensions: {
      completeness,
      accuracy,
      consistency,
      timeliness,
      validity,
      overall,
    },
    indicators: {
      documentsUploaded: docs.length,
      documentsProcessed: processed,
      extractionsNeedingReview: needsReview,
      openDiscrepancies: openDisc.length,
      lowConfidenceExtractions: lowConfidence,
      humanOverrideCount: humanOverrides,
      missingCoreDocuments: missingCore,
    },
    issues,
  };
}

/** Org-wide data quality aggregates. */
export async function calculateOrgDataQuality(organizationId: string): Promise<{
  avgQuality: number;
  avgCompleteness: number;
  avgHumanOverrideRate: number;
  shipmentCount: number;
}> {
  const admin = createAdminClient();
  const { data: shipments } = await admin
    .from("shipments")
    .select("id")
    .eq("organization_id", organizationId)
    .order("updated_at", { ascending: false })
    .limit(30);

  if (!shipments?.length) {
    return { avgQuality: 0, avgCompleteness: 0, avgHumanOverrideRate: 0, shipmentCount: 0 };
  }

  let totalQuality = 0;
  let totalCompleteness = 0;
  let totalOverrideRate = 0;

  for (const s of shipments) {
    const report = await calculateDataQuality(s.id);
    totalQuality += report.dimensions.overall;
    totalCompleteness += report.dimensions.completeness;
    const overrideRate =
      report.indicators.documentsUploaded > 0
        ? report.indicators.humanOverrideCount / report.indicators.documentsUploaded
        : 0;
    totalOverrideRate += overrideRate;
  }

  const n = shipments.length;
  return {
    avgQuality: Math.round(totalQuality / n),
    avgCompleteness: Math.round(totalCompleteness / n),
    avgHumanOverrideRate: Math.round((totalOverrideRate / n) * 100) / 100,
    shipmentCount: n,
  };
}
