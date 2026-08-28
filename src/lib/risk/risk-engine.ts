import { createAdminClient } from "@/lib/supabase/admin";
import { writeAuditEvent } from "@/lib/audit";
import type {
  Document,
  DocumentExtraction,
  Party,
  Product,
  RegulatoryCheck,
  ShipmentTrackingEvent,
  VerificationCheck,
  WorkflowTask,
} from "@/types/database";
import { isValidHsCodeFormat } from "@/lib/hs-code/arbiter";

const CORE_DOC_TYPES = [
  "invoice",
  "packing_list",
  "bill_of_lading",
  "import_declaration",
];

/** Static risky origin-destination corridors (higher = riskier) */
const RISKY_ROUTES: Record<string, number> = {
  "CN->GH": 55,
  "NG->GH": 50,
  "AE->GH": 52,
  "unknown->GH": 60,
};

export type RiskFactorType =
  | "counterparty_risk"
  | "documentation_risk"
  | "regulatory_risk"
  | "classification_risk"
  | "route_risk";

export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface RiskFactorResult {
  factor_type: RiskFactorType;
  score: number;
  weight: number;
  details: Record<string, unknown>;
}

export interface RiskAssessmentResult {
  overall_risk_score: number;
  risk_level: RiskLevel;
  breakdown: {
    factors: RiskFactorResult[];
    weights: Record<string, number>;
  };
}

function clamp(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function riskLevelFromScore(score: number): RiskLevel {
  if (score >= 80) return "critical";
  if (score >= 60) return "high";
  if (score >= 30) return "medium";
  return "low";
}

function normalizeRouteKey(origin: string | null, destination: string | null): string {
  const o = origin?.trim().toUpperCase().slice(0, 2) ?? "unknown";
  const d = destination?.trim().toUpperCase().slice(0, 2) ?? "unknown";
  return `${o}->${d}`;
}

function isValidHsCode(hsCode: string | null): boolean {
  return isValidHsCodeFormat(hsCode);
}

export function calculateCounterpartyRisk(parties: Party[]): RiskFactorResult {
  let score = 50;
  const issues: string[] = [];
  const keyParties = parties.filter((p) =>
    ["seller", "buyer"].includes(p.role)
  );

  for (const party of keyParties) {
    if (!party.tin?.trim()) {
      score += 15;
      issues.push(`${party.role}: missing TIN`);
    }
    if (!party.country?.trim()) {
      score += 10;
      issues.push(`${party.role}: missing country`);
    }
    if (!party.email?.trim()) {
      score += 5;
      issues.push(`${party.role}: missing email`);
    }
  }

  if (keyParties.length === 0) {
    score = 65;
    issues.push("No seller or buyer defined");
  }

  return {
    factor_type: "counterparty_risk",
    score: clamp(score),
    weight: 0.2,
    details: { issues, party_count: keyParties.length },
  };
}

export function calculateDocumentationRisk(
  documents: Document[],
  verificationChecks: VerificationCheck[],
  extractions: DocumentExtraction[]
): RiskFactorResult {
  let score = 0;
  const issues: string[] = [];

  const presentTypes = new Set(
    documents.map((d) => d.doc_type_ai ?? d.doc_type)
  );

  for (const docType of CORE_DOC_TYPES) {
    if (!presentTypes.has(docType)) {
      score += 20;
      issues.push(`Missing core document: ${docType}`);
    }
  }

  const failedChecks = verificationChecks.filter(
    (c) => c.status === "failed" || c.status === "warning"
  );
  score += Math.min(30, failedChecks.length * 5);
  if (failedChecks.length > 0) {
    issues.push(`${failedChecks.length} failed/warning verification checks`);
  }

  const lowConfidence = extractions.filter((e) => e.needs_human_review);
  score += lowConfidence.length * 10;
  if (lowConfidence.length > 0) {
    issues.push(`${lowConfidence.length} extractions need human review`);
  }

  const failedDocs = documents.filter((d) => d.processing_status === "failed");
  score += failedDocs.length * 15;
  if (failedDocs.length > 0) {
    issues.push(`${failedDocs.length} documents failed processing`);
  }

  return {
    factor_type: "documentation_risk",
    score: clamp(score),
    weight: 0.2,
    details: { issues },
  };
}

export function calculateRegulatoryRisk(
  regulatoryChecks: RegulatoryCheck[],
  workflowTasks: WorkflowTask[]
): RiskFactorResult {
  const applicable = regulatoryChecks.filter(
    (c) => c.status !== "not_applicable"
  );
  const failed = applicable.filter((c) => c.status === "failed");

  let score = 0;
  if (applicable.length > 0) {
    score = (failed.length / applicable.length) * 100;
  }

  const openRegTasks = workflowTasks.filter(
    (t) =>
      (t.status === "open" || t.status === "in_progress") &&
      (t.task_type === "obtain_document" || t.task_type === "verify_permit")
  );
  score += openRegTasks.length * 10;

  return {
    factor_type: "regulatory_risk",
    score: clamp(score),
    weight: 0.2,
    details: {
      failed_regulatory_checks: failed.length,
      total_applicable: applicable.length,
      open_compliance_tasks: openRegTasks.length,
    },
  };
}

export function calculateClassificationRisk(products: Product[]): RiskFactorResult {
  let score = 0;
  const issues: string[] = [];

  if (products.length === 0) {
    return {
      factor_type: "classification_risk",
      score: 40,
      weight: 0.2,
      details: { issues: ["No products defined"] },
    };
  }

  for (const product of products) {
    const status = product.hs_code_status ?? "not_verified";

    if (!product.hs_code?.trim() || status === "missing") {
      score += 25;
      issues.push(`${product.name}: missing HS code`);
    } else if (!isValidHsCode(product.hs_code)) {
      score += 20;
      issues.push(`${product.name}: invalid HS code format`);
    } else if (status === "conflict") {
      score += 22;
      issues.push(`${product.name}: HS code conflict — needs review`);
    } else if (status === "suggested") {
      score += 12;
      issues.push(`${product.name}: HS code suggested but not confirmed`);
    } else if (status === "verified") {
      score += 2;
    } else {
      score += 10;
      issues.push(`${product.name}: HS code not verified`);
    }

    if (!product.product_category_id) {
      score += 15;
      issues.push(`${product.name}: unknown product category`);
    }
  }

  return {
    factor_type: "classification_risk",
    score: clamp(score / products.length),
    weight: 0.2,
    details: { issues, product_count: products.length },
  };
}

export function calculateRouteRisk(
  originCountry: string | null,
  destinationCountry: string | null,
  trackingEvents: ShipmentTrackingEvent[] = []
): RiskFactorResult {
  const routeKey = normalizeRouteKey(originCountry, destinationCountry);
  let score = RISKY_ROUTES[routeKey] ?? 50;
  const issues: string[] = [];

  const delayEvents = trackingEvents.filter(
    (e) =>
      e.event_type === "delay" ||
      (e.description?.toLowerCase().includes("delay") ?? false)
  );

  if (delayEvents.length > 0) {
    score += Math.min(25, delayEvents.length * 10);
    issues.push(`${delayEvents.length} delay event(s) reported`);
  }

  const hasDeparted = trackingEvents.some(
    (e) => e.event_type === "vessel_departed"
  );
  const hasArrived = trackingEvents.some(
    (e) => e.event_type === "vessel_arrived"
  );

  if (hasDeparted && !hasArrived) {
    const departed = trackingEvents.find((e) => e.event_type === "vessel_departed");
    if (departed?.event_date) {
      const daysSinceDeparture =
        (Date.now() - new Date(departed.event_date).getTime()) / (24 * 60 * 60 * 1000);
      if (daysSinceDeparture > 21) {
        score += 15;
        issues.push("Vessel in transit longer than expected (>21 days)");
      }
    }
  }

  return {
    factor_type: "route_risk",
    score: clamp(score),
    weight: 0.2,
    details: {
      route: routeKey,
      origin: originCountry,
      destination: destinationCountry,
      known_corridor: routeKey in RISKY_ROUTES,
      tracking_delay_events: delayEvents.length,
      issues,
    },
  };
}

export function calculateOverallRisk(
  factors: RiskFactorResult[]
): { overall_risk_score: number; risk_level: RiskLevel } {
  const totalWeight = factors.reduce((sum, f) => sum + f.weight, 0);
  const weighted =
    totalWeight > 0
      ? factors.reduce((sum, f) => sum + f.score * f.weight, 0) / totalWeight
      : 50;

  const overall_risk_score = clamp(weighted);
  return {
    overall_risk_score,
    risk_level: riskLevelFromScore(overall_risk_score),
  };
}

async function loadRiskData(shipmentId: string) {
  const admin = createAdminClient();

  const { data: shipment } = await admin
    .from("shipments")
    .select("*")
    .eq("id", shipmentId)
    .single();

  if (!shipment) return null;

  const [
    { data: parties },
    { data: products },
    { data: documents },
    { data: verificationChecks },
    { data: regulatoryChecks },
    { data: workflowTasks },
    { data: trackingEvents },
  ] = await Promise.all([
    admin.from("parties").select("*").eq("shipment_id", shipmentId),
    admin.from("products").select("*").eq("shipment_id", shipmentId),
    admin.from("documents").select("*").eq("shipment_id", shipmentId),
    admin.from("verification_checks").select("*").eq("shipment_id", shipmentId),
    admin.from("regulatory_checks").select("*").eq("shipment_id", shipmentId),
    admin.from("workflow_tasks").select("*").eq("shipment_id", shipmentId),
    admin.from("shipment_tracking_events").select("*").eq("shipment_id", shipmentId),
  ]);

  const docIds = (documents ?? []).map((d) => d.id);
  const extractions: DocumentExtraction[] = [];

  if (docIds.length > 0) {
    const { data: extData } = await admin
      .from("document_extractions")
      .select("*")
      .in("document_id", docIds)
      .order("created_at", { ascending: false });

    const seen = new Set<string>();
    for (const ext of extData ?? []) {
      if (!seen.has(ext.document_id)) {
        seen.add(ext.document_id);
        extractions.push(ext as DocumentExtraction);
      }
    }
  }

  return {
    shipment,
    parties: (parties ?? []) as Party[],
    products: (products ?? []) as Product[],
    documents: (documents ?? []) as Document[],
    verificationChecks: (verificationChecks ?? []) as VerificationCheck[],
    regulatoryChecks: (regulatoryChecks ?? []) as RegulatoryCheck[],
    workflowTasks: (workflowTasks ?? []) as WorkflowTask[],
    trackingEvents: (trackingEvents ?? []) as ShipmentTrackingEvent[],
    extractions,
  };
}

export function calculateRiskFactorsFromData(data: NonNullable<Awaited<ReturnType<typeof loadRiskData>>>): RiskFactorResult[] {
  return [
    calculateCounterpartyRisk(data.parties),
    calculateDocumentationRisk(
      data.documents,
      data.verificationChecks,
      data.extractions
    ),
    calculateRegulatoryRisk(data.regulatoryChecks, data.workflowTasks),
    calculateClassificationRisk(data.products),
    calculateRouteRisk(
      data.shipment.origin_country,
      data.shipment.destination_country,
      data.trackingEvents
    ),
  ];
}

export async function calculateRiskFactors(
  shipmentId: string
): Promise<RiskFactorResult[]> {
  const data = await loadRiskData(shipmentId);
  if (!data) return [];
  return calculateRiskFactorsFromData(data);
}

export async function runRiskAssessment(
  shipmentId: string,
  userId?: string
): Promise<RiskAssessmentResult | null> {
  const admin = createAdminClient();
  const data = await loadRiskData(shipmentId);
  if (!data) return null;

  const factors = calculateRiskFactorsFromData(data);
  const { overall_risk_score, risk_level } = calculateOverallRisk(factors);

  const breakdown = {
    factors,
    weights: Object.fromEntries(factors.map((f) => [f.factor_type, f.weight])),
  };

  await admin.from("risk_factors").delete().eq("shipment_id", shipmentId);

  if (factors.length > 0) {
    await admin.from("risk_factors").insert(
      factors.map((f) => ({
        shipment_id: shipmentId,
        factor_type: f.factor_type,
        score: f.score,
        weight: f.weight,
        details: f.details,
      }))
    );
  }

  await admin.from("risk_assessments").insert({
    shipment_id: shipmentId,
    overall_risk_score,
    risk_level,
    breakdown,
  });

  await writeAuditEvent(admin, {
    organizationId: data.shipment.organization_id,
    userId,
    action: "risk.completed",
    entityType: "shipment",
    entityId: shipmentId,
    shipmentId,
    metadata: {
      overall_risk_score,
      risk_level,
      factor_count: factors.length,
    },
  });

  const { dispatchWebhook } = await import("@/lib/webhooks/webhook-service");
  dispatchWebhook(data.shipment.organization_id, "risk.completed", {
    shipment_id: shipmentId,
    overall_risk_score,
    risk_level,
  }).catch((err) => console.error("[Webhook] risk.completed failed:", err));

  return { overall_risk_score, risk_level, breakdown };
}
