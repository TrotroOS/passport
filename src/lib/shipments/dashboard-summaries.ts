import { createAdminClient } from "@/lib/supabase/admin";
import type { Shipment } from "@/types/database";

export type ShipmentListSummary = {
  documentCount: number;
  overallScore: number | null;
  openDiscrepancies: number;
  pendingTasks: number;
  riskLevel: string | null;
};

export type ShipmentWithSummary = Shipment & ShipmentListSummary;

async function latestPassportScores(shipmentIds: string[]) {
  if (!shipmentIds.length) return new Map<string, number>();
  const admin = createAdminClient();
  const { data } = await admin
    .from("passport_scores")
    .select("shipment_id, overall_score, created_at")
    .in("shipment_id", shipmentIds)
    .order("created_at", { ascending: false });

  const map = new Map<string, number>();
  for (const row of data ?? []) {
    if (!map.has(row.shipment_id)) {
      map.set(row.shipment_id, Number(row.overall_score));
    }
  }
  return map;
}

async function latestRiskLevels(shipmentIds: string[]) {
  if (!shipmentIds.length) return new Map<string, string>();
  const admin = createAdminClient();
  const { data } = await admin
    .from("risk_assessments")
    .select("shipment_id, risk_level, created_at")
    .in("shipment_id", shipmentIds)
    .order("created_at", { ascending: false });

  const map = new Map<string, string>();
  for (const row of data ?? []) {
    if (!map.has(row.shipment_id)) {
      map.set(row.shipment_id, row.risk_level);
    }
  }
  return map;
}

async function countByShipment(
  table: "documents" | "discrepancies" | "workflow_tasks",
  shipmentIds: string[],
  filter?: { column: string; value: string | string[] }
) {
  const map = new Map<string, number>();
  if (!shipmentIds.length) return map;

  const admin = createAdminClient();
  let query = admin.from(table).select("shipment_id").in("shipment_id", shipmentIds);

  if (filter) {
    if (Array.isArray(filter.value)) {
      query = query.in(filter.column, filter.value);
    } else {
      query = query.eq(filter.column, filter.value);
    }
  }

  const { data } = await query;
  for (const row of data ?? []) {
    const id = row.shipment_id as string;
    map.set(id, (map.get(id) ?? 0) + 1);
  }
  return map;
}

/** Attach compliance summary stats to dashboard shipment rows. */
export async function enrichShipmentsWithSummaries(
  shipments: Shipment[]
): Promise<ShipmentWithSummary[]> {
  if (!shipments.length) return [];

  const ids = shipments.map((s) => s.id);

  const [scores, risks, documents, discrepancies, tasks] = await Promise.all([
    latestPassportScores(ids),
    latestRiskLevels(ids),
    countByShipment("documents", ids),
    countByShipment("discrepancies", ids, { column: "status", value: "open" }),
    countByShipment("workflow_tasks", ids, {
      column: "status",
      value: ["open", "in_progress", "blocked"],
    }),
  ]);

  return shipments.map((shipment) => ({
    ...shipment,
    documentCount: documents.get(shipment.id) ?? 0,
    overallScore: scores.get(shipment.id) ?? null,
    openDiscrepancies: discrepancies.get(shipment.id) ?? 0,
    pendingTasks: tasks.get(shipment.id) ?? 0,
    riskLevel: risks.get(shipment.id) ?? null,
  }));
}
