import { createAdminClient } from "@/lib/supabase/admin";
import type { AnalyticsDateRange } from "./date-range";
import { dateRangeCutoff } from "./date-range";

export type ComplianceAlertSeverity = "critical" | "warning" | "info";

export interface ComplianceAlert {
  id: string;
  severity: ComplianceAlertSeverity;
  category: "score" | "discrepancy" | "screening" | "task" | "document" | "risk";
  title: string;
  description: string;
  shipmentId: string;
  shipmentRef: string;
  actionUrl: string;
  createdAt: string;
}

/** Aggregate actionable compliance alerts for an organization. */
export async function getComplianceAlerts(
  organizationId: string,
  dateRange: AnalyticsDateRange = "90d",
  limit = 20
): Promise<ComplianceAlert[]> {
  const admin = createAdminClient();
  const cutoff = dateRangeCutoff(dateRange);

  let shipmentQuery = admin
    .from("shipments")
    .select("id, shipment_ref, status, created_at")
    .eq("organization_id", organizationId)
    .order("updated_at", { ascending: false })
    .limit(100);

  if (cutoff) {
    shipmentQuery = shipmentQuery.gte("created_at", cutoff.toISOString());
  }

  const { data: shipments } = await shipmentQuery;
  if (!shipments?.length) return [];

  const shipmentIds = shipments.map((s) => s.id);
  const shipmentRefById = new Map(shipments.map((s) => [s.id, s.shipment_ref]));

  const [
    { data: scores },
    { data: discrepancies },
    { data: screenings },
    { data: tasks },
    { data: riskAssessments },
    { data: documents },
  ] = await Promise.all([
    admin
      .from("passport_scores")
      .select("shipment_id, overall_score, created_at")
      .in("shipment_id", shipmentIds)
      .order("created_at", { ascending: false }),
    admin
      .from("discrepancies")
      .select("shipment_id, severity, status, discrepancy_type, created_at")
      .in("shipment_id", shipmentIds)
      .eq("status", "open"),
    admin
      .from("party_screenings")
      .select("shipment_id, match_status, screened_name, match_score, screened_at")
      .in("shipment_id", shipmentIds)
      .in("match_status", ["potential_match", "confirmed_match"]),
    admin
      .from("workflow_tasks")
      .select("shipment_id, title, priority, status, created_at")
      .in("shipment_id", shipmentIds)
      .in("status", ["open", "in_progress"])
      .eq("priority", "urgent"),
    admin
      .from("risk_assessments")
      .select("shipment_id, risk_level, overall_risk_score, created_at")
      .in("shipment_id", shipmentIds)
      .in("risk_level", ["high", "critical"])
      .order("created_at", { ascending: false }),
    admin
      .from("documents")
      .select("shipment_id, doc_type")
      .in("shipment_id", shipmentIds),
  ]);

  const alerts: ComplianceAlert[] = [];
  const seen = new Set<string>();

  function pushAlert(alert: Omit<ComplianceAlert, "id">) {
    const key = `${alert.shipmentId}:${alert.category}:${alert.title}`;
    if (seen.has(key)) return;
    seen.add(key);
    alerts.push({ ...alert, id: key });
  }

  const latestScoreByShipment = new Map<string, number>();
  for (const score of scores ?? []) {
    if (!latestScoreByShipment.has(score.shipment_id)) {
      latestScoreByShipment.set(score.shipment_id, score.overall_score ?? 0);
    }
  }

  for (const [shipmentId, overallScore] of Array.from(latestScoreByShipment.entries())) {
    if (overallScore < 50) {
      pushAlert({
        severity: "critical",
        category: "score",
        title: "Low Passport Score",
        description: `Score ${overallScore}/100 — review verification and documents`,
        shipmentId,
        shipmentRef: shipmentRefById.get(shipmentId) ?? shipmentId,
        actionUrl: `/shipments/${shipmentId}`,
        createdAt: new Date().toISOString(),
      });
    } else if (overallScore < 70) {
      pushAlert({
        severity: "warning",
        category: "score",
        title: "Passport Score below target",
        description: `Score ${overallScore}/100 — address open issues before clearance`,
        shipmentId,
        shipmentRef: shipmentRefById.get(shipmentId) ?? shipmentId,
        actionUrl: `/shipments/${shipmentId}`,
        createdAt: new Date().toISOString(),
      });
    }
  }

  for (const d of discrepancies ?? []) {
    if (d.severity === "critical") {
      pushAlert({
        severity: "critical",
        category: "discrepancy",
        title: "Critical discrepancy open",
        description: String(d.discrepancy_type).replace(/_/g, " "),
        shipmentId: d.shipment_id,
        shipmentRef: shipmentRefById.get(d.shipment_id) ?? d.shipment_id,
        actionUrl: `/shipments/${d.shipment_id}`,
        createdAt: d.created_at,
      });
    }
  }

  for (const s of screenings ?? []) {
    pushAlert({
      severity: s.match_status === "confirmed_match" ? "critical" : "warning",
      category: "screening",
      title:
        s.match_status === "confirmed_match"
          ? "Sanctions list match"
          : "Potential sanctions match",
      description: `${s.screened_name} (${s.match_score}% match)`,
      shipmentId: s.shipment_id,
      shipmentRef: shipmentRefById.get(s.shipment_id) ?? s.shipment_id,
      actionUrl: `/shipments/${s.shipment_id}`,
      createdAt: s.screened_at,
    });
  }

  for (const t of tasks ?? []) {
    pushAlert({
      severity: "warning",
      category: "task",
      title: "Urgent task pending",
      description: t.title,
      shipmentId: t.shipment_id,
      shipmentRef: shipmentRefById.get(t.shipment_id) ?? t.shipment_id,
      actionUrl: `/shipments/${t.shipment_id}`,
      createdAt: t.created_at,
    });
  }

  const latestRiskByShipment = new Map<string, { level: string; score: number }>();
  for (const r of riskAssessments ?? []) {
    if (!latestRiskByShipment.has(r.shipment_id)) {
      latestRiskByShipment.set(r.shipment_id, {
        level: r.risk_level,
        score: r.overall_risk_score ?? 0,
      });
    }
  }

  for (const [shipmentId, risk] of Array.from(latestRiskByShipment.entries())) {
    pushAlert({
      severity: risk.level === "critical" ? "critical" : "warning",
      category: "risk",
      title: `${risk.level.charAt(0).toUpperCase()}${risk.level.slice(1)} risk assessment`,
      description: `Overall risk score ${risk.score}/100`,
      shipmentId,
      shipmentRef: shipmentRefById.get(shipmentId) ?? shipmentId,
      actionUrl: `/shipments/${shipmentId}`,
      createdAt: new Date().toISOString(),
    });
  }

  const docsByShipment = new Map<string, Set<string>>();
  for (const doc of documents ?? []) {
    if (!docsByShipment.has(doc.shipment_id)) {
      docsByShipment.set(doc.shipment_id, new Set());
    }
    docsByShipment.get(doc.shipment_id)!.add(doc.doc_type);
  }

  for (const shipment of shipments) {
    const docs = docsByShipment.get(shipment.id) ?? new Set();
    const core = ["invoice", "packing_list", "bill_of_lading"];
    const missing = core.filter((t) => !docs.has(t));
    if (missing.length >= 2 && shipment.status !== "archived") {
      pushAlert({
        severity: "info",
        category: "document",
        title: "Incomplete document set",
        description: `Missing ${missing.map((m) => m.replace(/_/g, " ")).join(", ")}`,
        shipmentId: shipment.id,
        shipmentRef: shipment.shipment_ref,
        actionUrl: `/shipments/${shipment.id}`,
        createdAt: shipment.created_at,
      });
    }
  }

  const severityOrder: Record<ComplianceAlertSeverity, number> = {
    critical: 0,
    warning: 1,
    info: 2,
  };

  return alerts
    .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
    .slice(0, limit);
}
