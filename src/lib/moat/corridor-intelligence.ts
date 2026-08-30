import { createAdminClient } from "@/lib/supabase/admin";
import type { ClearanceStage, Party } from "@/types/database";
import type { SupportedJurisdiction } from "./corridor-intelligence-utils";
import {
  computeMoatStrength,
  jurisdictionFromDestination,
  mergeDiscrepancyCounts,
  normalizePartyName,
  partyRiskSignal,
  scoreVsBenchmark,
  type MoatStrengthTier,
} from "./corridor-intelligence-utils";

export interface CorridorBaseline {
  jurisdiction_code: SupportedJurisdiction;
  label: string;
  benchmark_passport_score: number;
  median_days_to_ready: number | null;
  common_blockers: string[];
  playbook_tips: string[];
}

export interface OrgCorridorProfile {
  shipments_total: number;
  cleared_assistive_count: number;
  blocked_count: number;
  avg_passport_score: number | null;
  top_discrepancy_types: Array<{ type: string; count: number }>;
}

export interface PartyMemoryInsight {
  party_id: string;
  name: string;
  role: string;
  signal: ReturnType<typeof partyRiskSignal>;
  shipment_count: number;
  blocked_count: number;
}

export interface CorridorMoatInsights {
  jurisdiction: SupportedJurisdiction | null;
  jurisdiction_label: string | null;
  moat_strength: MoatStrengthTier;
  moat_score: number;
  moat_label: string;
  platform_benchmark: CorridorBaseline | null;
  org_profile: OrgCorridorProfile | null;
  shipment_score: number | null;
  score_comparison: ReturnType<typeof scoreVsBenchmark>;
  party_insights: PartyMemoryInsight[];
  playbook_tips: string[];
  common_blockers: string[];
  advantages: string[];
}

export interface RecordCorridorOutcomeInput {
  organizationId: string;
  shipmentId: string;
  destinationCountry: string | null;
  clearanceStage: ClearanceStage;
  passportScore: number | null;
  parties: Pick<Party, "id" | "name" | "role">[];
  openDiscrepancyTypes: string[];
}

async function loadBaseline(
  jurisdiction: SupportedJurisdiction
): Promise<CorridorBaseline | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("corridor_intelligence_baselines")
    .select("*")
    .eq("jurisdiction_code", jurisdiction)
    .maybeSingle();

  if (!data) return null;

  return {
    jurisdiction_code: data.jurisdiction_code as SupportedJurisdiction,
    label: data.label,
    benchmark_passport_score: Number(data.benchmark_passport_score),
    median_days_to_ready:
      data.median_days_to_ready != null ? Number(data.median_days_to_ready) : null,
    common_blockers: Array.isArray(data.common_blockers)
      ? (data.common_blockers as string[])
      : [],
    playbook_tips: Array.isArray(data.playbook_tips)
      ? (data.playbook_tips as string[])
      : [],
  };
}

export async function recordCorridorOutcome(
  input: RecordCorridorOutcomeInput
): Promise<void> {
  const jurisdiction = jurisdictionFromDestination(input.destinationCountry);
  if (!jurisdiction) return;

  const admin = createAdminClient();
  const isCleared = input.clearanceStage === "cleared_assistive";
  const isBlocked = input.clearanceStage === "blocked";

  const { data: existingProfile } = await admin
    .from("organization_corridor_profiles")
    .select("*")
    .eq("organization_id", input.organizationId)
    .eq("jurisdiction_code", jurisdiction)
    .maybeSingle();

  const prevTotal = existingProfile?.shipments_total ?? 0;
  const prevAvg = existingProfile?.avg_passport_score ?? null;
  const nextTotal = prevTotal + 1;
  const nextAvg =
    input.passportScore != null
      ? prevAvg != null
        ? Math.round(((prevAvg * prevTotal + input.passportScore) / nextTotal) * 100) / 100
        : input.passportScore
      : prevAvg;

  const prevDiscrepancies = Array.isArray(existingProfile?.top_discrepancy_types)
    ? (existingProfile.top_discrepancy_types as Array<{ type: string; count: number }>)
    : [];

  await admin.from("organization_corridor_profiles").upsert(
    {
      organization_id: input.organizationId,
      jurisdiction_code: jurisdiction,
      shipments_total: nextTotal,
      cleared_assistive_count:
        (existingProfile?.cleared_assistive_count ?? 0) + (isCleared ? 1 : 0),
      blocked_count: (existingProfile?.blocked_count ?? 0) + (isBlocked ? 1 : 0),
      avg_passport_score: nextAvg,
      top_discrepancy_types: mergeDiscrepancyCounts(
        prevDiscrepancies,
        input.openDiscrepancyTypes
      ),
      last_cleared_at: isCleared ? new Date().toISOString() : existingProfile?.last_cleared_at,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "organization_id,jurisdiction_code" }
  );

  for (const party of input.parties) {
    const normalized = normalizePartyName(party.name);
    if (!normalized) continue;

    const { data: memory } = await admin
      .from("party_corridor_memory")
      .select("*")
      .eq("organization_id", input.organizationId)
      .eq("party_name_normalized", normalized)
      .eq("party_role", party.role)
      .maybeSingle();

    const count = (memory?.shipment_count ?? 0) + 1;
    const prevPartyAvg = memory?.avg_passport_score ?? null;
    const nextPartyAvg =
      input.passportScore != null
        ? prevPartyAvg != null
          ? Math.round(((prevPartyAvg * (count - 1) + input.passportScore) / count) * 100) /
            100
          : input.passportScore
        : prevPartyAvg;

    await admin.from("party_corridor_memory").upsert(
      {
        organization_id: input.organizationId,
        party_name_normalized: normalized,
        party_role: party.role,
        shipment_count: count,
        blocked_count: (memory?.blocked_count ?? 0) + (isBlocked ? 1 : 0),
        cleared_count: (memory?.cleared_count ?? 0) + (isCleared ? 1 : 0),
        avg_passport_score: nextPartyAvg,
        last_shipment_id: input.shipmentId,
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "organization_id,party_name_normalized,party_role" }
    );
  }
}

function buildAdvantages(
  orgProfile: OrgCorridorProfile | null,
  moatScore: number,
  partyInsights: PartyMemoryInsight[]
): string[] {
  const advantages: string[] = [];

  if ((orgProfile?.shipments_total ?? 0) >= 5) {
    advantages.push(
      "Your organization has corridor-specific clearance history — Passport learns from your past shipments."
    );
  }
  if ((orgProfile?.cleared_assistive_count ?? 0) >= 3) {
    advantages.push(
      "Repeat assistive clearances on this corridor improve playbook accuracy for your team."
    );
  }
  if (partyInsights.some((p) => p.signal === "trusted")) {
    advantages.push(
      "Trusted counterparties identified from your shipment network reduce repeat review cycles."
    );
  }
  if (partyInsights.some((p) => p.signal === "high_risk")) {
    advantages.push(
      "Counterparty memory flagged repeat blockers — review before filing to avoid customs delays."
    );
  }
  if (moatScore >= 70) {
    advantages.push(
      "Strong corridor memory moat — switching costs increase as audit and party history compound."
    );
  }
  if (advantages.length === 0) {
    advantages.push(
      "Every cleared shipment builds proprietary corridor intelligence exclusive to your organization."
    );
  }

  return advantages.slice(0, 4);
}

export async function getCorridorMoatInsights(
  shipmentId: string,
  organizationId: string
): Promise<CorridorMoatInsights> {
  const admin = createAdminClient();

  const { data: shipment } = await admin
    .from("shipments")
    .select("destination_country")
    .eq("id", shipmentId)
    .single();

  const jurisdiction = jurisdictionFromDestination(shipment?.destination_country);
  if (!jurisdiction) {
    return {
      jurisdiction: null,
      jurisdiction_label: null,
      moat_strength: "building",
      moat_score: 0,
      moat_label: "Building corridor memory",
      platform_benchmark: null,
      org_profile: null,
      shipment_score: null,
      score_comparison: "unknown",
      party_insights: [],
      playbook_tips: [],
      common_blockers: [],
      advantages: [
        "Set a supported import corridor (Ghana, Nigeria, Kenya) to unlock corridor intelligence.",
      ],
    };
  }

  const [
    baseline,
    { data: orgProfileRow },
    { data: parties },
    { data: latestScore },
    { count: partyMemoryCount },
  ] = await Promise.all([
    loadBaseline(jurisdiction),
    admin
      .from("organization_corridor_profiles")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("jurisdiction_code", jurisdiction)
      .maybeSingle(),
    admin.from("parties").select("id, name, role").eq("shipment_id", shipmentId),
    admin
      .from("passport_scores")
      .select("overall_score")
      .eq("shipment_id", shipmentId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from("party_corridor_memory")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId),
  ]);

  const orgProfile: OrgCorridorProfile | null = orgProfileRow
    ? {
        shipments_total: orgProfileRow.shipments_total,
        cleared_assistive_count: orgProfileRow.cleared_assistive_count,
        blocked_count: orgProfileRow.blocked_count,
        avg_passport_score:
          orgProfileRow.avg_passport_score != null
            ? Number(orgProfileRow.avg_passport_score)
            : null,
        top_discrepancy_types: Array.isArray(orgProfileRow.top_discrepancy_types)
          ? (orgProfileRow.top_discrepancy_types as Array<{ type: string; count: number }>)
          : [],
      }
    : null;

  const partyInsights: PartyMemoryInsight[] = [];

  for (const party of parties ?? []) {
    const normalized = normalizePartyName(party.name);
    const { data: memory } = await admin
      .from("party_corridor_memory")
      .select("shipment_count, blocked_count, cleared_count")
      .eq("organization_id", organizationId)
      .eq("party_name_normalized", normalized)
      .eq("party_role", party.role)
      .maybeSingle();

    partyInsights.push({
      party_id: party.id,
      name: party.name,
      role: party.role,
      signal: partyRiskSignal({
        shipmentCount: memory?.shipment_count ?? 0,
        blockedCount: memory?.blocked_count ?? 0,
        clearedCount: memory?.cleared_count ?? 0,
      }),
      shipment_count: memory?.shipment_count ?? 0,
      blocked_count: memory?.blocked_count ?? 0,
    });
  }

  const moat = computeMoatStrength({
    orgShipmentsOnCorridor: orgProfile?.shipments_total ?? 0,
    orgClearedOnCorridor: orgProfile?.cleared_assistive_count ?? 0,
    partyMemoryCount: partyMemoryCount ?? 0,
  });

  const shipmentScore =
    latestScore?.overall_score != null ? Number(latestScore.overall_score) : null;

  const orgBlockers = (orgProfile?.top_discrepancy_types ?? []).map((d) => d.type);
  const commonBlockers = [
    ...new Set([...(baseline?.common_blockers ?? []), ...orgBlockers]),
  ].slice(0, 6);

  return {
    jurisdiction,
    jurisdiction_label: baseline?.label ?? jurisdiction,
    moat_strength: moat.tier,
    moat_score: moat.score,
    moat_label: moat.label,
    platform_benchmark: baseline,
    org_profile: orgProfile,
    shipment_score: shipmentScore,
    score_comparison: scoreVsBenchmark(
      shipmentScore,
      baseline?.benchmark_passport_score ?? 78
    ),
    party_insights: partyInsights,
    playbook_tips: baseline?.playbook_tips ?? [],
    common_blockers: commonBlockers,
    advantages: buildAdvantages(orgProfile, moat.score, partyInsights),
  };
}

export async function getOrganizationMoatSummary(organizationId: string) {
  const admin = createAdminClient();

  const [{ data: profiles }, { count: partyCount }] = await Promise.all([
    admin
      .from("organization_corridor_profiles")
      .select("*")
      .eq("organization_id", organizationId),
    admin
      .from("party_corridor_memory")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId),
  ]);

  const totalShipments = (profiles ?? []).reduce((sum, p) => sum + p.shipments_total, 0);
  const totalCleared = (profiles ?? []).reduce(
    (sum, p) => sum + p.cleared_assistive_count,
    0
  );

  const moat = computeMoatStrength({
    orgShipmentsOnCorridor: totalShipments,
    orgClearedOnCorridor: totalCleared,
    partyMemoryCount: partyCount ?? 0,
  });

  return {
    moat_strength: moat.tier,
    moat_score: moat.score,
    corridors_tracked: profiles?.length ?? 0,
    total_shipments: totalShipments,
    total_cleared: totalCleared,
    counterparty_memories: partyCount ?? 0,
    profiles: profiles ?? [],
  };
}
