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

  const edges: ShipmentGraph["edges"] = [];
  const shipmentNode = `shipment:${shipmentId}`;

  for (const party of parties ?? []) {
    edges.push({
      from: shipmentNode,
      to: `party:${party.id}`,
      relationship: party.role,
    });
  }
  for (const product of products ?? []) {
    edges.push({
      from: shipmentNode,
      to: `product:${product.id}`,
      relationship: "contains",
    });
  }
  for (const doc of documents ?? []) {
    edges.push({
      from: shipmentNode,
      to: `document:${doc.id}`,
      relationship: "has_document",
    });
  }
  for (const check of verificationChecks ?? []) {
    edges.push({
      from: shipmentNode,
      to: `verification_check:${check.id}`,
      relationship: "verified_by",
    });
  }
  for (const d of discrepancies ?? []) {
    edges.push({
      from: shipmentNode,
      to: `discrepancy:${d.id}`,
      relationship: "has_discrepancy",
    });
  }
  for (const rc of regulatoryChecks ?? []) {
    edges.push({
      from: shipmentNode,
      to: `regulatory_check:${rc.id}`,
      relationship: "regulated_by",
    });
  }
  for (const task of workflowTasks ?? []) {
    edges.push({
      from: shipmentNode,
      to: `workflow_task:${task.id}`,
      relationship: "has_task",
    });
  }

  return {
    shipment,
    parties: parties ?? [],
    products: products ?? [],
    documents: documents ?? [],
    verification_checks: verificationChecks ?? [],
    discrepancies: discrepancies ?? [],
    regulatory_checks: regulatoryChecks ?? [],
    workflow_tasks: workflowTasks ?? [],
    passport_score: passportScores?.[0] ?? null,
    risk_assessment: riskAssessments?.[0] ?? null,
    risk_factors: riskFactors ?? [],
    edges,
  };
}
