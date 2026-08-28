import { createAdminClient } from "@/lib/supabase/admin";
import type { AnalyticsDateRange } from "./date-range";
import { dateRangeCutoff, monthKey } from "./date-range";

const CORE_DOC_TYPES = [
  "invoice",
  "packing_list",
  "bill_of_lading",
  "certificate",
  "import_declaration",
] as const;

/** Route risk scores aligned with risk engine corridors */
const ROUTE_RISK_SCORES: Record<string, number> = {
  "CN->GH": 55,
  "NG->GH": 50,
  "AE->GH": 52,
  "unknown->GH": 60,
};

function corridorKey(origin: string | null, destination: string | null): string {
  const o = origin?.trim().toUpperCase().slice(0, 2) ?? "unknown";
  const d = destination?.trim().toUpperCase().slice(0, 2) ?? "unknown";
  return `${o}->${d}`;
}


async function loadOrgShipments(organizationId: string, range: AnalyticsDateRange) {
  const admin = createAdminClient();
  const cutoff = dateRangeCutoff(range);

  let query = admin
    .from("shipments")
    .select("id, shipment_ref, origin_country, destination_country, created_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (cutoff) {
    query = query.gte("created_at", cutoff.toISOString());
  }

  const { data } = await query;
  return (data ?? []) as Array<{
    id: string;
    shipment_ref: string;
    origin_country: string | null;
    destination_country: string | null;
    created_at: string;
  }>;
}

async function loadAllOrgShipmentCount(organizationId: string) {
  const admin = createAdminClient();
  const now = new Date();
  const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const d90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  const { data: all } = await admin
    .from("shipments")
    .select("id, created_at")
    .eq("organization_id", organizationId);

  const rows = all ?? [];
  return {
    allTime: rows.length,
    last30Days: rows.filter((r) => new Date(r.created_at) >= d30).length,
    last90Days: rows.filter((r) => new Date(r.created_at) >= d90).length,
  };
}

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

async function latestRiskAssessments(shipmentIds: string[]) {
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
      map.set(row.shipment_id, row.risk_level as string);
    }
  }
  return map;
}

export async function getAnalyticsSummary(
  organizationId: string,
  range: AnalyticsDateRange
) {
  const shipments = await loadOrgShipments(organizationId, range);
  const shipmentIds = shipments.map((s) => s.id);
  const counts = await loadAllOrgShipmentCount(organizationId);

  const admin = createAdminClient();

  const [
    productsResult,
    discrepanciesResult,
    tasksResult,
    scoreMap,
    riskMap,
  ] = await Promise.all([
    shipmentIds.length
      ? admin.from("products").select("total_value").in("shipment_id", shipmentIds)
      : Promise.resolve({ data: [] }),
    shipmentIds.length
      ? admin
          .from("discrepancies")
          .select("id")
          .in("shipment_id", shipmentIds)
          .eq("status", "open")
      : Promise.resolve({ data: [] }),
    shipmentIds.length
      ? admin
          .from("workflow_tasks")
          .select("id")
          .in("shipment_id", shipmentIds)
          .in("status", ["open", "in_progress", "blocked"])
      : Promise.resolve({ data: [] }),
    latestPassportScores(shipmentIds),
    latestRiskAssessments(shipmentIds),
  ]);

  const totalValue = (productsResult.data ?? []).reduce(
    (sum, p) => sum + (Number(p.total_value) || 0),
    0
  );

  const scores = Array.from(scoreMap.values());
  const avgPassportScore =
    scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : null;

  const riskDistribution = { low: 0, medium: 0, high: 0, critical: 0 };
  for (const level of Array.from(riskMap.values())) {
    if (level in riskDistribution) {
      riskDistribution[level as keyof typeof riskDistribution]++;
    }
  }

  return {
    dateRange: range,
    shipmentsInRange: shipments.length,
    shipmentCounts: counts,
    totalImportValue: totalValue,
    avgPassportScore,
    riskDistribution,
    openDiscrepancies: (discrepanciesResult.data ?? []).length,
    pendingWorkflowTasks: (tasksResult.data ?? []).length,
  };
}

export async function getComplianceTrend(
  organizationId: string,
  range: AnalyticsDateRange
) {
  const admin = createAdminClient();
  const cutoff = dateRangeCutoff(range);

  const { data: shipments } = await admin
    .from("shipments")
    .select("id, created_at")
    .eq("organization_id", organizationId);

  const shipmentIds = (shipments ?? []).map((s) => s.id);
  if (!shipmentIds.length) return { points: [] };

  const { data: scores } = await admin
    .from("passport_scores")
    .select(
      "shipment_id, overall_score, documentation_score, consistency_score, counterparty_score, regulatory_score, created_at"
    )
    .in("shipment_id", shipmentIds)
    .order("created_at", { ascending: true });

  const byMonth = new Map<
    string,
    {
      overall: number[];
      documentation: number[];
      consistency: number[];
      counterparty: number[];
      regulatory: number[];
    }
  >();

  for (const score of scores ?? []) {
    if (cutoff && new Date(score.created_at) < cutoff) continue;
    const month = monthKey(new Date(score.created_at));
    const bucket = byMonth.get(month) ?? {
      overall: [],
      documentation: [],
      consistency: [],
      counterparty: [],
      regulatory: [],
    };
    bucket.overall.push(Number(score.overall_score));
    if (score.documentation_score != null) {
      bucket.documentation.push(Number(score.documentation_score));
    }
    if (score.consistency_score != null) {
      bucket.consistency.push(Number(score.consistency_score));
    }
    if (score.counterparty_score != null) {
      bucket.counterparty.push(Number(score.counterparty_score));
    }
    if (score.regulatory_score != null) {
      bucket.regulatory.push(Number(score.regulatory_score));
    }
    byMonth.set(month, bucket);
  }

  const avg = (values: number[]) =>
    values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null;

  const points = Array.from(byMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, bucket]) => ({
      month,
      avgOverallScore: avg(bucket.overall),
      avgDocumentationScore: avg(bucket.documentation),
      avgConsistencyScore: avg(bucket.consistency),
      avgCounterpartyScore: avg(bucket.counterparty),
      avgRegulatoryScore: avg(bucket.regulatory),
    }));

  return { points };
}

export async function getRiskDistributionTrend(
  organizationId: string,
  range: AnalyticsDateRange
) {
  const admin = createAdminClient();
  const cutoff = dateRangeCutoff(range);

  const { data: shipments } = await admin
    .from("shipments")
    .select("id")
    .eq("organization_id", organizationId);

  const shipmentIds = (shipments ?? []).map((s) => s.id);
  if (!shipmentIds.length) return { points: [] };

  const { data: assessments } = await admin
    .from("risk_assessments")
    .select("shipment_id, risk_level, created_at")
    .in("shipment_id", shipmentIds)
    .order("created_at", { ascending: true });

  const seen = new Set<string>();
  const byMonth = new Map<
    string,
    { low: number; medium: number; high: number; critical: number }
  >();

  for (const row of assessments ?? []) {
    if (cutoff && new Date(row.created_at) < cutoff) continue;
    const dedupeKey = `${row.shipment_id}::${monthKey(new Date(row.created_at))}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const month = monthKey(new Date(row.created_at));
    const bucket = byMonth.get(month) ?? {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };
    const level = row.risk_level as keyof typeof bucket;
    if (level in bucket) bucket[level]++;
    byMonth.set(month, bucket);
  }

  const points = Array.from(byMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, counts]) => ({ month, ...counts }));

  return { points };
}

export async function getDiscrepancyTrend(
  organizationId: string,
  range: AnalyticsDateRange
) {
  const admin = createAdminClient();
  const cutoff = dateRangeCutoff(range);

  const { data: shipments } = await admin
    .from("shipments")
    .select("id, created_at")
    .eq("organization_id", organizationId);

  const shipmentIds = (shipments ?? []).map((s) => s.id);
  if (!shipmentIds.length) return { points: [] };

  const { data: discrepancies } = await admin
    .from("discrepancies")
    .select("shipment_id, status, created_at")
    .in("shipment_id", shipmentIds);

  const byMonth = new Map<string, { open: number; resolved: number }>();

  for (const d of discrepancies ?? []) {
    if (cutoff && new Date(d.created_at) < cutoff) continue;
    const month = monthKey(new Date(d.created_at));
    const bucket = byMonth.get(month) ?? { open: 0, resolved: 0 };
    if (d.status === "open") bucket.open++;
    else bucket.resolved++;
    byMonth.set(month, bucket);
  }

  const points = Array.from(byMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, counts]) => ({ month, ...counts }));

  return { points };
}

export async function getSupplierPerformance(
  organizationId: string,
  range: AnalyticsDateRange
) {
  const shipments = await loadOrgShipments(organizationId, range);
  const shipmentIds = shipments.map((s) => s.id);
  if (!shipmentIds.length) return { suppliers: [] };

  const admin = createAdminClient();
  const [partiesResult, discrepanciesResult, scoreMap, riskMap] = await Promise.all([
    admin.from("parties").select("shipment_id, name, role").in("shipment_id", shipmentIds),
    admin
      .from("discrepancies")
      .select("shipment_id")
      .in("shipment_id", shipmentIds)
      .eq("status", "open"),
    latestPassportScores(shipmentIds),
    latestRiskAssessments(shipmentIds),
  ]);

  const discrepancyCountByShipment = new Map<string, number>();
  for (const d of discrepanciesResult.data ?? []) {
    discrepancyCountByShipment.set(
      d.shipment_id,
      (discrepancyCountByShipment.get(d.shipment_id) ?? 0) + 1
    );
  }

  type SupplierAgg = {
    name: string;
    shipmentIds: Set<string>;
    scores: number[];
    discrepancies: number;
    riskLevels: { low: number; medium: number; high: number; critical: number };
  };

  const suppliers = new Map<string, SupplierAgg>();

  for (const party of partiesResult.data ?? []) {
    if (party.role !== "seller") continue;
    const name = party.name?.trim() || "Unknown supplier";
    const agg: SupplierAgg = suppliers.get(name) ?? {
      name,
      shipmentIds: new Set<string>(),
      scores: [] as number[],
      discrepancies: 0,
      riskLevels: { low: 0, medium: 0, high: 0, critical: 0 },
    };
    agg.shipmentIds.add(party.shipment_id);
    const score = scoreMap.get(party.shipment_id);
    if (score != null) agg.scores.push(score);
    agg.discrepancies += discrepancyCountByShipment.get(party.shipment_id) ?? 0;
    const risk = riskMap.get(party.shipment_id);
    if (risk === "low" || risk === "medium" || risk === "high" || risk === "critical") {
      agg.riskLevels[risk]++;
    }
    suppliers.set(name, agg);
  }

  const rows = Array.from(suppliers.values())
    .map((s) => ({
      supplierName: s.name,
      shipmentCount: s.shipmentIds.size,
      avgPassportScore:
        s.scores.length > 0
          ? Math.round(s.scores.reduce((a, b) => a + b, 0) / s.scores.length)
          : null,
      openDiscrepancies: s.discrepancies,
      discrepancyRate:
        s.shipmentIds.size > 0
          ? Math.round((s.discrepancies / s.shipmentIds.size) * 100) / 100
          : 0,
      riskDistribution: s.riskLevels,
    }))
    .sort((a, b) => b.shipmentCount - a.shipmentCount)
    .slice(0, 20);

  return { suppliers: rows };
}

export async function getProductCategoryInsights(
  organizationId: string,
  range: AnalyticsDateRange
) {
  const shipments = await loadOrgShipments(organizationId, range);
  const shipmentIds = shipments.map((s) => s.id);
  if (!shipmentIds.length) return { categories: [] };

  const admin = createAdminClient();
  const { data: products } = await admin
    .from("products")
    .select(
      "shipment_id, product_category_id, hs_code_status, product_categories(id, name, code)"
    )
    .in("shipment_id", shipmentIds);

  const { data: regulatoryChecks } = await admin
    .from("regulatory_checks")
    .select("shipment_id, status, check_type, details")
    .in("shipment_id", shipmentIds)
    .eq("status", "failed");

  const { data: discrepancies } = await admin
    .from("discrepancies")
    .select("shipment_id, discrepancy_type")
    .in("shipment_id", shipmentIds)
    .eq("status", "open");

  type CatAgg = {
    name: string;
    shipmentIds: Set<string>;
    hsStatus: Record<string, number>;
    issues: Record<string, number>;
  };

  const categories = new Map<string, CatAgg>();
  const shipmentCategories = new Map<string, Set<string>>();

  for (const product of products ?? []) {
    const cat = product.product_categories as { name?: string; code?: string } | null;
    const catName = cat?.name ?? "Uncategorized";
    const agg = categories.get(catName) ?? {
      name: catName,
      shipmentIds: new Set<string>(),
      hsStatus: {},
      issues: {},
    };
    agg.shipmentIds.add(product.shipment_id);
    const hs = (product.hs_code_status as string) ?? "not_verified";
    agg.hsStatus[hs] = (agg.hsStatus[hs] ?? 0) + 1;
    categories.set(catName, agg);

    const set = shipmentCategories.get(product.shipment_id) ?? new Set<string>();
    set.add(catName);
    shipmentCategories.set(product.shipment_id, set);
  }

  for (const check of regulatoryChecks ?? []) {
    const cats = shipmentCategories.get(check.shipment_id);
    if (!cats) continue;
    const issue = `regulatory:${check.check_type}`;
    for (const catName of Array.from(cats)) {
      const agg = categories.get(catName);
      if (agg) agg.issues[issue] = (agg.issues[issue] ?? 0) + 1;
    }
  }

  for (const d of discrepancies ?? []) {
    const cats = shipmentCategories.get(d.shipment_id);
    if (!cats) continue;
    const issue = d.discrepancy_type ?? "discrepancy";
    for (const catName of Array.from(cats)) {
      const agg = categories.get(catName);
      if (agg) agg.issues[issue] = (agg.issues[issue] ?? 0) + 1;
    }
  }

  const rows = Array.from(categories.values())
    .map((c) => {
      const topIssues = Object.entries(c.issues)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([issue, count]) => ({ issue, count }));
      return {
        categoryName: c.name,
        shipmentCount: c.shipmentIds.size,
        hsCodeStatusDistribution: c.hsStatus,
        commonIssues: topIssues,
      };
    })
    .sort((a, b) => b.shipmentCount - a.shipmentCount);

  return { categories: rows };
}

export async function getCorridorInsights(
  organizationId: string,
  range: AnalyticsDateRange
) {
  const shipments = await loadOrgShipments(organizationId, range);
  if (!shipments.length) return { corridors: [] };

  const shipmentIds = shipments.map((s) => s.id);
  const scoreMap = await latestPassportScores(shipmentIds);

  const admin = createAdminClient();
  const { data: documents } = await admin
    .from("documents")
    .select("shipment_id, doc_type, doc_type_ai")
    .in("shipment_id", shipmentIds);

  type CorridorAgg = {
    origin: string;
    destination: string;
    shipmentIds: Set<string>;
    scores: number[];
    docComplete: number[];
  };

  const corridors = new Map<string, CorridorAgg>();

  for (const shipment of shipments) {
    const key = corridorKey(shipment.origin_country, shipment.destination_country);
    const agg = corridors.get(key) ?? {
      origin: shipment.origin_country ?? "—",
      destination: shipment.destination_country ?? "—",
      shipmentIds: new Set<string>(),
      scores: [],
      docComplete: [],
    };
    agg.shipmentIds.add(shipment.id);
    const score = scoreMap.get(shipment.id);
    if (score != null) agg.scores.push(score);

    const present = new Set(
      (documents ?? [])
        .filter((d) => d.shipment_id === shipment.id)
        .map((d) => d.doc_type_ai ?? d.doc_type)
    );
    const have = CORE_DOC_TYPES.filter((t) => present.has(t)).length;
    agg.docComplete.push(Math.round((have / CORE_DOC_TYPES.length) * 100));
    corridors.set(key, agg);
  }

  const rows = Array.from(corridors.values())
    .map((c) => {
      const routeKey = corridorKey(c.origin, c.destination);
      return {
        origin: c.origin,
        destination: c.destination,
        routeLabel: `${c.origin} → ${c.destination}`,
        shipmentCount: c.shipmentIds.size,
        avgPassportScore:
          c.scores.length > 0
            ? Math.round(c.scores.reduce((a, b) => a + b, 0) / c.scores.length)
            : null,
        routeRiskScore: ROUTE_RISK_SCORES[routeKey] ?? 50,
        avgDocumentationCompleteness:
          c.docComplete.length > 0
            ? Math.round(c.docComplete.reduce((a, b) => a + b, 0) / c.docComplete.length)
            : null,
      };
    })
    .sort((a, b) => b.shipmentCount - a.shipmentCount)
    .slice(0, 15);

  return { corridors: rows };
}

export async function getDocumentCompleteness(
  organizationId: string,
  range: AnalyticsDateRange
) {
  const shipments = await loadOrgShipments(organizationId, range);
  const shipmentIds = shipments.map((s) => s.id);
  if (!shipmentIds.length) {
    return {
      totalShipments: 0,
      shipmentsWithMissingCoreDocs: 0,
      missingRate: 0,
      missingByType: CORE_DOC_TYPES.map((docType) => ({
        docType,
        missingCount: 0,
        missingRate: 0,
      })),
    };
  }

  const admin = createAdminClient();
  const { data: documents } = await admin
    .from("documents")
    .select("shipment_id, doc_type, doc_type_ai")
    .in("shipment_id", shipmentIds);

  const docsByShipment = new Map<string, Set<string>>();
  for (const doc of documents ?? []) {
    const set = docsByShipment.get(doc.shipment_id) ?? new Set<string>();
    set.add(doc.doc_type_ai ?? doc.doc_type);
    docsByShipment.set(doc.shipment_id, set);
  }

  const missingByType: Record<string, number> = {};
  for (const t of CORE_DOC_TYPES) missingByType[t] = 0;

  let shipmentsWithMissing = 0;

  for (const id of shipmentIds) {
    const present = docsByShipment.get(id) ?? new Set<string>();
    let missingAny = false;
    for (const docType of CORE_DOC_TYPES) {
      if (!present.has(docType)) {
        missingByType[docType]++;
        missingAny = true;
      }
    }
    if (missingAny) shipmentsWithMissing++;
  }

  return {
    totalShipments: shipmentIds.length,
    shipmentsWithMissingCoreDocs: shipmentsWithMissing,
    missingRate: Math.round((shipmentsWithMissing / shipmentIds.length) * 100),
    missingByType: CORE_DOC_TYPES.map((docType) => ({
      docType,
      missingCount: missingByType[docType],
      missingRate: Math.round((missingByType[docType] / shipmentIds.length) * 100),
    })).sort((a, b) => b.missingCount - a.missingCount),
  };
}

export async function getShipmentStatusBreakdown(
  organizationId: string,
  range: AnalyticsDateRange
) {
  const admin = createAdminClient();
  const cutoff = dateRangeCutoff(range);
  let query = admin
    .from("shipments")
    .select("status")
    .eq("organization_id", organizationId);
  if (cutoff) query = query.gte("created_at", cutoff.toISOString());
  const { data } = await query;

  const breakdown: Record<string, number> = {};
  for (const s of data ?? []) {
    const status = s.status ?? "draft";
    breakdown[status] = (breakdown[status] ?? 0) + 1;
  }
  return {
    total: (data ?? []).length,
    breakdown: Object.entries(breakdown).map(([status, count]) => ({ status, count })),
  };
}

export async function getTrackingSummary(
  organizationId: string,
  range: AnalyticsDateRange
) {
  const shipments = await loadOrgShipments(organizationId, range);
  const shipmentIds = shipments.map((s) => s.id);
  if (!shipmentIds.length) {
    return {
      containersTracked: 0,
      shipmentsWithTracking: 0,
      delayedEvents: 0,
      inTransit: 0,
      delivered: 0,
      eventTypes: [] as Array<{ type: string; count: number }>,
    };
  }

  const admin = createAdminClient();
  const [{ data: containers }, { data: events }] = await Promise.all([
    admin.from("container_details").select("shipment_id").in("shipment_id", shipmentIds),
    admin
      .from("shipment_tracking_events")
      .select("shipment_id, event_type")
      .in("shipment_id", shipmentIds),
  ]);

  const shipmentsWithTracking = new Set((containers ?? []).map((c) => c.shipment_id)).size;
  const typeCounts = new Map<string, number>();
  let delayedEvents = 0;
  let delivered = 0;
  let inTransit = 0;

  for (const e of events ?? []) {
    const t = e.event_type ?? "other";
    typeCounts.set(t, (typeCounts.get(t) ?? 0) + 1);
    if (t === "delay") delayedEvents++;
    if (t === "delivery") delivered++;
    if (t === "vessel_departed" || t === "vessel_arrived" || t === "in_transit") inTransit++;
  }

  return {
    containersTracked: (containers ?? []).length,
    shipmentsWithTracking,
    delayedEvents,
    inTransit,
    delivered,
    eventTypes: Array.from(typeCounts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count),
  };
}

export async function getRiskFactorBreakdown(
  organizationId: string,
  range: AnalyticsDateRange
) {
  const shipments = await loadOrgShipments(organizationId, range);
  const shipmentIds = shipments.map((s) => s.id);
  if (!shipmentIds.length) return { factors: [] };

  const admin = createAdminClient();
  const { data: factors } = await admin
    .from("risk_factors")
    .select("factor_type, factor_score")
    .in("shipment_id", shipmentIds);

  const byType = new Map<string, number[]>();
  for (const f of factors ?? []) {
    const type = f.factor_type ?? "unknown";
    const scores = byType.get(type) ?? [];
    scores.push(Number(f.factor_score) || 0);
    byType.set(type, scores);
  }

  const avg = (values: number[]) =>
    values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;

  return {
    factors: Array.from(byType.entries())
      .map(([factorType, scores]) => ({
        factorType,
        avgScore: avg(scores),
        count: scores.length,
      }))
      .sort((a, b) => b.avgScore - a.avgScore),
  };
}

export async function getScoreDimensionsAverage(
  organizationId: string,
  range: AnalyticsDateRange
) {
  const shipments = await loadOrgShipments(organizationId, range);
  const shipmentIds = shipments.map((s) => s.id);
  if (!shipmentIds.length) {
    return {
      overall: null,
      documentation: null,
      consistency: null,
      counterparty: null,
      regulatory: null,
    };
  }

  const admin = createAdminClient();
  const cutoff = dateRangeCutoff(range);
  const { data: scores } = await admin
    .from("passport_scores")
    .select(
      "shipment_id, overall_score, documentation_score, consistency_score, counterparty_score, regulatory_score, created_at"
    )
    .in("shipment_id", shipmentIds)
    .order("created_at", { ascending: false });

  const latestByShipment = new Map<string, (typeof scores extends (infer T)[] | null ? T : never)>();
  for (const row of scores ?? []) {
    if (cutoff && new Date(row.created_at) < cutoff) continue;
    if (!latestByShipment.has(row.shipment_id)) {
      latestByShipment.set(row.shipment_id, row);
    }
  }

  const rows = Array.from(latestByShipment.values());
  const avgField = (field: keyof (typeof rows)[0]) => {
    const values = rows
      .map((r) => r[field])
      .filter((v): v is number => v != null)
      .map(Number);
    return values.length
      ? Math.round(values.reduce((a, b) => a + b, 0) / values.length)
      : null;
  };

  return {
    overall: avgField("overall_score"),
    documentation: avgField("documentation_score"),
    consistency: avgField("consistency_score"),
    counterparty: avgField("counterparty_score"),
    regulatory: avgField("regulatory_score"),
    shipmentCount: rows.length,
  };
}

export async function getTopPartiesForNetwork(organizationId: string, limit = 20) {
  const admin = createAdminClient();
  const { data: shipments } = await admin
    .from("shipments")
    .select("id")
    .eq("organization_id", organizationId);

  const shipmentIds = (shipments ?? []).map((s) => s.id);
  if (!shipmentIds.length) return { parties: [] };

  const { data: parties } = await admin
    .from("parties")
    .select("name, role")
    .in("shipment_id", shipmentIds);

  const counts = new Map<string, { name: string; role: string; count: number }>();
  for (const p of parties ?? []) {
    const key = `${p.role}::${p.name}`;
    const entry = counts.get(key) ?? { name: p.name, role: p.role, count: 0 };
    entry.count++;
    counts.set(key, entry);
  }

  return {
    parties: Array.from(counts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, limit),
  };
}

export { CORE_DOC_TYPES };
