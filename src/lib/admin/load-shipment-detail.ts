import type { SupabaseClient } from "@supabase/supabase-js";
import { getShipmentGraph } from "@/lib/graph/trade-graph";
import type {
  AuditEvent,
  Discrepancy,
  Document,
  DocumentExtraction,
  PassportScore,
  ProductCategory,
  RegulatoryCheckWithRegulation,
  RiskAssessment,
  RiskFactor,
  VerificationCheck,
  WorkflowTask,
} from "@/types/database";

export interface AdminShipmentDetail {
  shipment: Record<string, unknown>;
  organizationName: string;
  parties: Record<string, unknown>[];
  products: Record<string, unknown>[];
  documentsWithExtractions: Array<Document & { latestExtraction: DocumentExtraction | null }>;
  auditEvents: AuditEvent[];
  verificationChecks: VerificationCheck[];
  openDiscrepancies: Discrepancy[];
  resolvedDiscrepancies: Discrepancy[];
  latestScore: PassportScore | null;
  regulatoryChecks: RegulatoryCheckWithRegulation[];
  workflowTasks: WorkflowTask[];
  productCategories: ProductCategory[];
  riskFactors: RiskFactor[];
  latestRiskAssessment: RiskAssessment | null;
  tradeGraph: Awaited<ReturnType<typeof getShipmentGraph>>;
  criticalCount: number;
  failedRegulatoryCount: number;
}

export async function loadAdminShipmentDetail(
  admin: SupabaseClient,
  id: string
): Promise<AdminShipmentDetail | null> {
  const { data: shipment } = await admin
    .from("shipments")
    .select("*, organizations(name)")
    .eq("id", id)
    .single();

  if (!shipment) return null;

  const org =
    shipment.organizations && typeof shipment.organizations === "object" && "name" in shipment.organizations
      ? (shipment.organizations as { name: string }).name
      : "—";

  const [{ data: parties }, { data: products }, { data: documents }, { data: auditEvents }] =
    await Promise.all([
      admin.from("parties").select("*").eq("shipment_id", id).order("created_at"),
      admin.from("products").select("*").eq("shipment_id", id).order("created_at"),
      admin
        .from("documents")
        .select("*")
        .eq("shipment_id", id)
        .order("created_at", { ascending: false }),
      admin
        .from("audit_events")
        .select("*")
        .eq("shipment_id", id)
        .order("created_at", { ascending: false }),
    ]);

  const documentIds = (documents ?? []).map((d) => d.id);

  const { data: allExtractions } = documentIds.length
    ? await admin
        .from("document_extractions")
        .select("*")
        .in("document_id", documentIds)
        .order("created_at", { ascending: false })
    : { data: [] as DocumentExtraction[] };

  const extractionByDoc = new Map<string, DocumentExtraction>();
  for (const ext of allExtractions ?? []) {
    if (!extractionByDoc.has(ext.document_id)) {
      extractionByDoc.set(ext.document_id, ext as DocumentExtraction);
    }
  }

  const documentsWithExtractions = (documents ?? []).map((doc) => ({
    ...(doc as Document),
    latestExtraction: extractionByDoc.get(doc.id) ?? null,
  }));

  const [
    { data: verificationChecks },
    { data: allDiscrepancies },
    { data: passportScores },
    { data: regulatoryChecks },
    { data: workflowTasks },
    { data: productCategories },
    { data: riskFactors },
    { data: riskAssessments },
  ] = await Promise.all([
    admin.from("verification_checks").select("*").eq("shipment_id", id).order("check_type"),
    admin
      .from("discrepancies")
      .select("*")
      .eq("shipment_id", id)
      .order("created_at", { ascending: false }),
    admin
      .from("passport_scores")
      .select("*")
      .eq("shipment_id", id)
      .order("created_at", { ascending: false })
      .limit(1),
    admin
      .from("regulatory_checks")
      .select("*, regulations(*)")
      .eq("shipment_id", id)
      .order("created_at"),
    admin
      .from("workflow_tasks")
      .select("*")
      .eq("shipment_id", id)
      .order("priority")
      .order("created_at", { ascending: false }),
    admin.from("product_categories").select("*").order("name"),
    admin.from("risk_factors").select("*").eq("shipment_id", id),
    admin
      .from("risk_assessments")
      .select("*")
      .eq("shipment_id", id)
      .order("created_at", { ascending: false })
      .limit(1),
  ]);

  const tradeGraph = await getShipmentGraph(id);

  const latestScore = (passportScores?.[0] ?? null) as PassportScore | null;
  const openDiscrepancies = ((allDiscrepancies ?? []) as Discrepancy[]).filter(
    (d) => d.status === "open"
  );
  const resolvedDiscrepancies = ((allDiscrepancies ?? []) as Discrepancy[]).filter(
    (d) => d.status === "resolved" || d.status === "ignored"
  );
  const criticalCount = openDiscrepancies.filter((d) => d.severity === "critical").length;
  const failedRegulatoryCount = (
    (regulatoryChecks ?? []) as RegulatoryCheckWithRegulation[]
  ).filter((c) => c.status === "failed").length;
  const latestRiskAssessment = (riskAssessments?.[0] ?? null) as RiskAssessment | null;

  return {
    shipment,
    organizationName: org,
    parties: parties ?? [],
    products: products ?? [],
    documentsWithExtractions,
    auditEvents: (auditEvents ?? []) as AuditEvent[],
    verificationChecks: (verificationChecks ?? []) as VerificationCheck[],
    openDiscrepancies,
    resolvedDiscrepancies,
    latestScore,
    regulatoryChecks: (regulatoryChecks ?? []) as RegulatoryCheckWithRegulation[],
    workflowTasks: (workflowTasks ?? []) as WorkflowTask[],
    productCategories: (productCategories ?? []) as ProductCategory[],
    riskFactors: (riskFactors ?? []) as RiskFactor[],
    latestRiskAssessment,
    tradeGraph,
    criticalCount,
    failedRegulatoryCount,
  };
}
