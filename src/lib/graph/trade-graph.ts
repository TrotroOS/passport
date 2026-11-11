import { createAdminClient } from "@/lib/supabase/admin";

export interface ShipmentGraph {
  shipment: Record<string, unknown>;
  parties: Record<string, unknown>[];
  products: Record<string, unknown>[];
  documents: Record<string, unknown>[];
  verification_checks: Record<string, unknown>[];
  discrepancies: Record<string, unknown>[];
  regulatory_checks: Record<string, unknown>[];
  workflow_tasks: Record<string, unknown>[];
  passport_score: Record<string, unknown> | null;
  risk_assessment: Record<string, unknown> | null;
  risk_factors: Record<string, unknown>[];
  edges: Array<{ from: string; to: string; relationship: string }>;
}

export async function getShipmentGraph(
  shipmentId: string
): Promise<ShipmentGraph | null> {
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
    { data: discrepancies },
    { data: regulatoryChecks },
    { data: workflowTasks },
    { data: passportScores },
    { data: riskAssessments },
    { data: riskFactors },
  ] = await Promise.all([
    admin.from("parties").select("*").eq("shipment_id", shipmentId),
    admin.from("products").select("*").eq("shipment_id", shipmentId),
    admin.from("documents").select("*").eq("shipment_id", shipmentId),
    admin.from("verification_checks").select("*").eq("shipment_id", shipmentId),
    admin.from("discrepancies").select("*").eq("shipment_id", shipmentId),
    admin
      .from("regulatory_checks")
      .select("*, regulations(title, authority, rule_type)")
      .eq("shipment_id", shipmentId),
    admin.from("workflow_tasks").select("*").eq("shipment_id", shipmentId),
    admin
      .from("passport_scores")
      .select("*")
      .eq("shipment_id", shipmentId)
      .order("created_at", { ascending: false })
      .limit(1),
    admin
      .from("risk_assessments")
      .select("*")
      .eq("shipment_id", shipmentId)
      .order("created_at", { ascending: false })
      .limit(1),
    admin.from("risk_factors").select("*").eq("shipment_id", shipmentId),
  ]);

  return buildShipmentGraphFromLoaded({
    shipment,
    parties: parties ?? [],
    products: products ?? [],
    documents: documents ?? [],
    verificationChecks: verificationChecks ?? [],
    discrepancies: discrepancies ?? [],
    regulatoryChecks: regulatoryChecks ?? [],
    workflowTasks: workflowTasks ?? [],
    passportScore: passportScores?.[0] ?? null,
    riskAssessment: riskAssessments?.[0] ?? null,
    riskFactors: riskFactors ?? [],
  });
}

/** Build the graph from rows already loaded on the shipment page (no extra queries). */
export function buildShipmentGraphFromLoaded(input: {
  shipment: Record<string, unknown>;
  parties: Record<string, unknown>[];
  products: Record<string, unknown>[];
  documents: Record<string, unknown>[];
  verificationChecks: Record<string, unknown>[];
  discrepancies: Record<string, unknown>[];
  regulatoryChecks: Record<string, unknown>[];
  workflowTasks: Record<string, unknown>[];
  passportScore: Record<string, unknown> | null;
  riskAssessment: Record<string, unknown> | null;
  riskFactors: Record<string, unknown>[];
}): ShipmentGraph {
  const shipmentId = String(input.shipment.id);
  const edges: ShipmentGraph["edges"] = [];
  const shipmentNode = `shipment:${shipmentId}`;

  for (const party of input.parties) {
    edges.push({
      from: shipmentNode,
      to: `party:${party.id}`,
      relationship: String(party.role ?? "party"),
    });
  }
  for (const product of input.products) {
    edges.push({
      from: shipmentNode,
      to: `product:${product.id}`,
      relationship: "contains",
    });
  }
  for (const doc of input.documents) {
    edges.push({
      from: shipmentNode,
      to: `document:${doc.id}`,
      relationship: "has_document",
    });
  }
  for (const check of input.verificationChecks) {
    edges.push({
      from: shipmentNode,
      to: `verification_check:${check.id}`,
      relationship: "verified_by",
    });
  }
  for (const d of input.discrepancies) {
    edges.push({
      from: shipmentNode,
      to: `discrepancy:${d.id}`,
      relationship: "has_discrepancy",
    });
  }
  for (const rc of input.regulatoryChecks) {
    edges.push({
      from: shipmentNode,
      to: `regulatory_check:${rc.id}`,
      relationship: "regulated_by",
    });
  }
  for (const task of input.workflowTasks) {
    edges.push({
      from: shipmentNode,
      to: `workflow_task:${task.id}`,
      relationship: "has_task",
    });
  }

  return {
    shipment: input.shipment,
    parties: input.parties,
    products: input.products,
    documents: input.documents,
    verification_checks: input.verificationChecks,
    discrepancies: input.discrepancies,
    regulatory_checks: input.regulatoryChecks,
    workflow_tasks: input.workflowTasks,
    passport_score: input.passportScore,
    risk_assessment: input.riskAssessment,
    risk_factors: input.riskFactors,
    edges,
  };
}
