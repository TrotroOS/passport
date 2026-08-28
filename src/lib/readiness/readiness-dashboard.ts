import { createAdminClient } from "@/lib/supabase/admin";
import { enrichShipmentsWithSummaries, type ShipmentWithSummary } from "@/lib/shipments/dashboard-summaries";

export type ReadinessTier = "ready" | "almost" | "blocked";

export interface ReadinessShipment extends ShipmentWithSummary {
  readiness_tier: ReadinessTier;
  readiness_reasons: string[];
  missing_docs: number;
}

function classifyReadiness(row: ShipmentWithSummary): {
  tier: ReadinessTier;
  reasons: string[];
} {
  const reasons: string[] = [];

  if (row.status === "blocked" || row.status === "archived") {
    return {
      tier: "blocked",
      reasons: [row.status === "archived" ? "Shipment archived" : "Shipment is blocked"],
    };
  }

  if (row.openDiscrepancies > 0) {
    reasons.push(`${row.openDiscrepancies} open discrepancies`);
  }
  if (row.pendingTasks > 0) {
    reasons.push(`${row.pendingTasks} pending tasks`);
  }
  if (row.documentCount === 0) {
    reasons.push("No documents uploaded");
  }
  if (row.overallScore != null && row.overallScore < 70) {
    reasons.push(`Passport Score ${row.overallScore}/100 below target`);
  }
  if (row.riskLevel === "critical" || row.riskLevel === "high") {
    reasons.push(`Risk level: ${row.riskLevel}`);
  }

  const ready =
    row.openDiscrepancies === 0 &&
    row.pendingTasks === 0 &&
    row.documentCount > 0 &&
    (row.overallScore == null || row.overallScore >= 70) &&
    row.riskLevel !== "critical" &&
    row.riskLevel !== "high";

  if (ready) {
    return { tier: "ready", reasons: ["Meets clearance readiness criteria"] };
  }

  if (reasons.length <= 2 && row.documentCount > 0) {
    return { tier: "almost", reasons };
  }

  return { tier: "blocked", reasons: reasons.length ? reasons : ["Not ready for clearance"] };
}

export async function getReadinessDashboard(
  organizationId: string
): Promise<{
  ready: ReadinessShipment[];
  almost: ReadinessShipment[];
  blocked: ReadinessShipment[];
}> {
  const admin = createAdminClient();
  const { data: shipments } = await admin
    .from("shipments")
    .select("*")
    .eq("organization_id", organizationId)
    .neq("status", "archived")
    .order("updated_at", { ascending: false });

  const enriched = await enrichShipmentsWithSummaries(shipments ?? []);

  const ready: ReadinessShipment[] = [];
  const almost: ReadinessShipment[] = [];
  const blocked: ReadinessShipment[] = [];

  for (const row of enriched) {
    const { tier, reasons } = classifyReadiness(row);
    const item: ReadinessShipment = {
      ...row,
      readiness_tier: tier,
      readiness_reasons: reasons,
      missing_docs: row.documentCount === 0 ? 1 : 0,
    };
    if (tier === "ready") ready.push(item);
    else if (tier === "almost") almost.push(item);
    else blocked.push(item);
  }

  return { ready, almost, blocked };
}
