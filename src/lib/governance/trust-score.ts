import { createAdminClient } from "@/lib/supabase/admin";
import { isOpenSanctionsConfigured } from "@/lib/governance/external-sources";
import { calculateDataQuality } from "./data-quality";
import { buildShipmentLineage } from "./lineage-builder";
import { getActiveSourcesForShipment, listTrustedSources } from "./source-registry";

export interface TrustMetrics {
  trustScore: number;
  dataQualityScore: number;
  passportScore: number | null;
  lineageCompleteness: number;
  sourceReliabilityAvg: number;
  humanOverrideRate: number;
  aiConfidenceAvg: number | null;
  governanceGrade: "A" | "B" | "C" | "D" | "F";
}

export interface ShipmentTrustReport {
  shipmentId: string;
  metrics: TrustMetrics;
  quality: Awaited<ReturnType<typeof calculateDataQuality>>;
  lineage: Awaited<ReturnType<typeof buildShipmentLineage>>;
  connectedSources: Awaited<ReturnType<typeof getActiveSourcesForShipment>>;
  recommendations: string[];
}

export interface ShipmentTrustRanking {
  shipment_id: string;
  shipment_ref: string;
  trust_score: number;
  governance_grade: string;
  calculated_at: string;
}

export interface ProvenanceFeedItem {
  id: string;
  shipment_id: string | null;
  shipment_ref: string | null;
  entity_type: string;
  field_path: string | null;
  source_id: string;
  source_name: string;
  transformation: string | null;
  confidence: number | null;
  recorded_at: string;
}

export interface ConnectorStatus {
  id: string;
  name: string;
  connected: boolean;
  description: string;
}

export interface OrgGovernanceSummary {
  avgTrustScore: number | null;
  avgDataQuality: number | null;
  snapshotCount: number;
  provenanceEventCount: number;
  connectedSourceCatalog: Awaited<ReturnType<typeof listTrustedSources>>;
  sourcesByType: Record<string, number>;
  gradeDistribution: Record<string, number>;
  trustTrend: Array<{ label: string; avgTrust: number; count: number }>;
  shipmentRankings: ShipmentTrustRanking[];
  recentProvenance: ProvenanceFeedItem[];
  connectors: ConnectorStatus[];
  qualityDimensions: {
    completeness: number;
    accuracy: number;
    consistency: number;
    timeliness: number;
    validity: number;
  };
  recommendations: string[];
}

function gradeFromScore(score: number): TrustMetrics["governanceGrade"] {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 45) return "D";
  return "F";
}

function buildRecommendations(
  metrics: TrustMetrics,
  quality: Awaited<ReturnType<typeof calculateDataQuality>>
): string[] {
  const recs: string[] = [];

  if (quality.indicators.missingCoreDocuments > 0) {
    recs.push("Upload missing core trade documents (invoice, packing list, bill of lading).");
  }
  if (quality.indicators.extractionsNeedingReview > 0) {
    recs.push("Review and confirm extractions awaiting human validation.");
  }
  if (quality.indicators.openDiscrepancies > 0) {
    recs.push("Resolve open discrepancies to improve consistency and accuracy scores.");
  }
  if (metrics.lineageCompleteness < 70) {
    recs.push("Run verification and ensure documents are fully processed to strengthen lineage.");
  }
  if (metrics.aiConfidenceAvg != null && metrics.aiConfidenceAvg < 75) {
    recs.push("Low extraction confidence — re-upload clearer documents or confirm fields manually.");
  }
  if (metrics.humanOverrideRate > 0.3) {
    recs.push("High human override rate — consider improving source document quality.");
  }
  if (metrics.trustScore >= 85 && recs.length === 0) {
    recs.push("Data trust is strong — maintain document hygiene and periodic verification runs.");
  }

  return recs.slice(0, 5);
}

/** Unified trust score combining quality, passport score, lineage, and source reliability. */
export async function calculateShipmentTrust(
  shipmentId: string,
  organizationId: string
): Promise<ShipmentTrustReport> {
  const admin = createAdminClient();

  const [quality, lineage, connectedSources] = await Promise.all([
    calculateDataQuality(shipmentId),
    buildShipmentLineage(shipmentId),
    getActiveSourcesForShipment(shipmentId),
  ]);

  const { data: latestScore } = await admin
    .from("passport_scores")
    .select("overall_score")
    .eq("shipment_id", shipmentId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: extractions } = await admin
    .from("document_extractions")
    .select("confidence, document_id")
    .in(
      "document_id",
      (
        await admin.from("documents").select("id").eq("shipment_id", shipmentId)
      ).data?.map((d) => d.id) ?? []
    );

  const confidences = (extractions ?? [])
    .map((e) => e.confidence)
    .filter((c): c is number => c != null);
  const aiConfidenceAvg =
    confidences.length > 0
      ? Math.round((confidences.reduce((a, b) => a + b, 0) / confidences.length) * 100)
      : null;

  const sourceReliabilityAvg =
    connectedSources.length > 0
      ? Math.round(
          connectedSources.reduce((s, src) => s + Number(src.reliability_score), 0) /
            connectedSources.length
        )
      : 80;

  const lineageCompleteness = Math.min(
    100,
    Math.round(
      (lineage.summary.documentCount > 0 ? 30 : 0) +
        (lineage.summary.extractionCount > 0 ? 30 : 0) +
        (lineage.summary.provenanceEventCount > 0 ? 25 : 0) +
        (lineage.summary.verificationRunCount > 0 ? 15 : 0)
    )
  );

  const humanOverrideRate =
    quality.indicators.documentsUploaded > 0
      ? quality.indicators.humanOverrideCount / quality.indicators.documentsUploaded
      : 0;

  const passportScore = latestScore?.overall_score ?? null;

  const trustScore = Math.round(
    quality.dimensions.overall * 0.35 +
      (passportScore ?? quality.dimensions.overall) * 0.25 +
      sourceReliabilityAvg * 0.15 +
      lineageCompleteness * 0.15 +
      (aiConfidenceAvg ?? 70) * 0.1 -
      humanOverrideRate * 15
  );

  const clampedTrust = Math.max(0, Math.min(100, trustScore));

  const metrics: TrustMetrics = {
    trustScore: clampedTrust,
    dataQualityScore: quality.dimensions.overall,
    passportScore,
    lineageCompleteness,
    sourceReliabilityAvg,
    humanOverrideRate: Math.round(humanOverrideRate * 100) / 100,
    aiConfidenceAvg,
    governanceGrade: gradeFromScore(clampedTrust),
  };

  await admin.from("shipment_trust_snapshots").insert({
    shipment_id: shipmentId,
    organization_id: organizationId,
    trust_score: metrics.trustScore,
    data_quality_score: metrics.dataQualityScore,
    lineage_completeness: metrics.lineageCompleteness,
    source_reliability_avg: metrics.sourceReliabilityAvg,
    human_override_rate: metrics.humanOverrideRate,
    metrics: {
      passport_score: passportScore,
      ai_confidence_avg: aiConfidenceAvg,
      governance_grade: metrics.governanceGrade,
      sources: connectedSources.map((s) => s.id),
    },
  }).then(({ error }) => {
    if (error) console.warn("[Trust] snapshot skipped:", error.message);
  });

  return {
    shipmentId,
    metrics,
    quality,
    lineage,
    connectedSources,
    recommendations: buildRecommendations(metrics, quality),
  };
}

function groupSourcesByType(
  sources: Awaited<ReturnType<typeof listTrustedSources>>
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const s of sources) {
    counts[s.source_type] = (counts[s.source_type] ?? 0) + 1;
  }
  return counts;
}

function getConnectorStatus(): ConnectorStatus[] {
  return [
    {
      id: "opensanctions",
      name: "OpenSanctions",
      connected: isOpenSanctionsConfigured(),
      description: "Live sanctions and PEP screening",
    },
    {
      id: "sendgrid",
      name: "SendGrid",
      connected: Boolean(process.env.SENDGRID_API_KEY),
      description: "Email notifications and alerts",
    },
    {
      id: "tracking",
      name: "Freight tracking",
      connected: (process.env.TRACKING_PROVIDER ?? "mock") !== "mock",
      description: "Live container and vessel tracking",
    },
    {
      id: "stripe",
      name: "Stripe billing",
      connected: Boolean(process.env.STRIPE_SECRET_KEY),
      description: "Subscription and plan management",
    },
  ];
}

function buildOrgRecommendations(summary: {
  avgTrustScore: number | null;
  avgDataQuality: number | null;
  provenanceEventCount: number;
  connectors: ConnectorStatus[];
}): string[] {
  const recs: string[] = [];

  if (summary.avgTrustScore != null && summary.avgTrustScore < 70) {
    recs.push("Organization trust score is below target — prioritize document completeness and verification.");
  }
  if (summary.provenanceEventCount < 10) {
    recs.push("Limited provenance history — process more documents to build auditable lineage.");
  }
  if (!summary.connectors.find((c) => c.id === "opensanctions")?.connected) {
    recs.push("Enable OpenSanctions for live party screening against global watchlists.");
  }
  if (summary.avgDataQuality != null && summary.avgDataQuality < 75) {
    recs.push("Data quality is below benchmark — review shipments with open discrepancies or missing core documents.");
  }
  if (recs.length === 0) {
    recs.push("Governance posture is healthy — continue confirming extractions and running verification checks.");
  }

  return recs.slice(0, 4);
}

/** Org-level trust and governance summary with trends and rankings. */
export async function calculateOrgGovernanceSummary(
  organizationId: string
): Promise<OrgGovernanceSummary> {
  const admin = createAdminClient();
  const allSources = await listTrustedSources();
  const connectors = getConnectorStatus();

  const { data: recentSnapshots } = await admin
    .from("shipment_trust_snapshots")
    .select(
      "shipment_id, trust_score, data_quality_score, lineage_completeness, human_override_rate, calculated_at, metrics"
    )
    .eq("organization_id", organizationId)
    .order("calculated_at", { ascending: false })
    .limit(200);

  const snapshots = recentSnapshots ?? [];

  const latestByShipment = new Map<
    string,
    (typeof snapshots)[number]
  >();
  for (const snap of snapshots) {
    if (!latestByShipment.has(snap.shipment_id)) {
      latestByShipment.set(snap.shipment_id, snap);
    }
  }

  const latestSnapshots = Array.from(latestByShipment.values());
  const avgTrust =
    latestSnapshots.length > 0
      ? Math.round(
          latestSnapshots.reduce((s, r) => s + Number(r.trust_score), 0) /
            latestSnapshots.length
        )
      : null;

  const avgDataQuality =
    latestSnapshots.length > 0
      ? Math.round(
          latestSnapshots.reduce((s, r) => s + Number(r.data_quality_score), 0) /
            latestSnapshots.length
        )
      : null;

  const gradeDistribution: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  for (const snap of latestSnapshots) {
    const metrics = snap.metrics as { governance_grade?: string } | null;
    const grade = metrics?.governance_grade ?? gradeFromScore(Number(snap.trust_score));
    gradeDistribution[grade] = (gradeDistribution[grade] ?? 0) + 1;
  }

  const trendBuckets = new Map<string, { total: number; count: number }>();
  for (const snap of snapshots) {
    const week = snap.calculated_at.slice(0, 10);
    const bucket = trendBuckets.get(week) ?? { total: 0, count: 0 };
    bucket.total += Number(snap.trust_score);
    bucket.count += 1;
    trendBuckets.set(week, bucket);
  }

  const trustTrend = Array.from(trendBuckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-8)
    .map(([label, { total, count }]) => ({
      label,
      avgTrust: Math.round(total / count),
      count,
    }));

  const shipmentIds = latestSnapshots.map((s) => s.shipment_id);
  const { data: shipmentRefs } =
    shipmentIds.length > 0
      ? await admin.from("shipments").select("id, shipment_ref").in("id", shipmentIds)
      : { data: [] as Array<{ id: string; shipment_ref: string }> };

  const refById = new Map((shipmentRefs ?? []).map((s) => [s.id, s.shipment_ref]));

  const shipmentRankings: ShipmentTrustRanking[] = latestSnapshots
    .map((snap) => {
      const metrics = snap.metrics as { governance_grade?: string } | null;
      return {
        shipment_id: snap.shipment_id,
        shipment_ref: refById.get(snap.shipment_id) ?? snap.shipment_id.slice(0, 8),
        trust_score: Number(snap.trust_score),
        governance_grade: metrics?.governance_grade ?? gradeFromScore(Number(snap.trust_score)),
        calculated_at: snap.calculated_at,
      };
    })
    .sort((a, b) => a.trust_score - b.trust_score)
    .slice(0, 10);

  let recentProvenance: ProvenanceFeedItem[] = [];
  try {
    const { data: prov } = await admin
      .from("data_provenance_events")
      .select(
        "id, shipment_id, entity_type, field_path, source_id, transformation, confidence, recorded_at, trusted_sources(name), shipments(shipment_ref)"
      )
      .eq("organization_id", organizationId)
      .order("recorded_at", { ascending: false })
      .limit(15);

    recentProvenance = (prov ?? []).map((event) => {
      const source =
        event.trusted_sources &&
        typeof event.trusted_sources === "object" &&
        "name" in event.trusted_sources
          ? (event.trusted_sources as { name: string }).name
          : event.source_id;
      const shipmentJoined = event.shipments as
        | { shipment_ref: string }
        | { shipment_ref: string }[]
        | null;
      const shipmentRaw = Array.isArray(shipmentJoined)
        ? shipmentJoined[0] ?? null
        : shipmentJoined;
      return {
        id: event.id,
        shipment_id: event.shipment_id,
        shipment_ref: shipmentRaw?.shipment_ref ?? null,
        entity_type: event.entity_type,
        field_path: event.field_path,
        source_id: event.source_id,
        source_name: source,
        transformation: event.transformation,
        confidence: event.confidence,
        recorded_at: event.recorded_at,
      };
    });
  } catch {
    // provenance table may be missing before migration 019
  }

  let provenanceCount = 0;
  try {
    const { count } = await admin
      .from("data_provenance_events")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId);
    provenanceCount = count ?? 0;
  } catch {
    provenanceCount = 0;
  }

  let qualityDimensions = {
    completeness: 0,
    accuracy: 0,
    consistency: 0,
    timeliness: 0,
    validity: 0,
  };

  if (latestSnapshots.length > 0) {
    const { data: shipments } = await admin
      .from("shipments")
      .select("id")
      .eq("organization_id", organizationId)
      .order("updated_at", { ascending: false })
      .limit(15);

    let n = 0;
    for (const s of shipments ?? []) {
      const q = await calculateDataQuality(s.id);
      qualityDimensions.completeness += q.dimensions.completeness;
      qualityDimensions.accuracy += q.dimensions.accuracy;
      qualityDimensions.consistency += q.dimensions.consistency;
      qualityDimensions.timeliness += q.dimensions.timeliness;
      qualityDimensions.validity += q.dimensions.validity;
      n++;
    }
    if (n > 0) {
      qualityDimensions = {
        completeness: Math.round(qualityDimensions.completeness / n),
        accuracy: Math.round(qualityDimensions.accuracy / n),
        consistency: Math.round(qualityDimensions.consistency / n),
        timeliness: Math.round(qualityDimensions.timeliness / n),
        validity: Math.round(qualityDimensions.validity / n),
      };
    }
  }

  const summary: OrgGovernanceSummary = {
    avgTrustScore: avgTrust,
    avgDataQuality,
    snapshotCount: latestSnapshots.length,
    provenanceEventCount: provenanceCount ?? 0,
    connectedSourceCatalog: allSources,
    sourcesByType: groupSourcesByType(allSources),
    gradeDistribution,
    trustTrend,
    shipmentRankings,
    recentProvenance,
    connectors,
    qualityDimensions,
    recommendations: buildOrgRecommendations({
      avgTrustScore: avgTrust,
      avgDataQuality,
      provenanceEventCount: provenanceCount,
      connectors,
    }),
  };

  return summary;
}

/** @deprecated Use calculateOrgGovernanceSummary */
export async function calculateOrgTrustSummary(organizationId: string) {
  const summary = await calculateOrgGovernanceSummary(organizationId);
  return {
    avgTrustScore: summary.avgTrustScore,
    snapshotCount: summary.snapshotCount,
    provenanceEventCount: summary.provenanceEventCount,
    connectedSourceCatalog: summary.connectedSourceCatalog,
    sourcesByType: summary.sourcesByType,
  };
}
