import { createAdminClient } from "@/lib/supabase/admin";
import { writeAuditEvent } from "@/lib/audit";
import { queryOpenSanctions } from "@/lib/governance/external-sources";
import { resolveSourceId } from "@/lib/governance/source-registry";
import type { Party, PartyScreening } from "@/types/database";

/** Curated watchlist entries (demo — replace with live OFAC/EU/UN feed in production). */
const WATCHLIST: Array<{ name: string; aliases: string[]; list: string; risk: string }> = [
  { name: "Rosneft Oil Company", aliases: ["rosneft", "rosneft oil"], list: "OFAC-SDN", risk: "sanctions" },
  { name: "Islamic Revolutionary Guard Corps", aliases: ["irgc", "revolutionary guard"], list: "OFAC-SDN", risk: "sanctions" },
  { name: "North Korea Trading Corporation", aliases: ["korea trading corp", "kitc"], list: "UN-Sanctions", risk: "sanctions" },
  { name: "Global Arms Trading LLC", aliases: ["global arms trading", "gat llc"], list: "EU-Consolidated", risk: "arms_embargo" },
  { name: "Pacific Dual-Use Exports", aliases: ["pacific dual use", "dual-use exports"], list: "BIS-Entity-List", risk: "dual_use" },
  { name: "Meridian Trading Front Co", aliases: ["meridian trading front", "mtf co"], list: "EU-Consolidated", risk: "shell_company" },
];

export type ScreeningMatchStatus = PartyScreening["match_status"];

export interface ScreeningResult {
  party_id: string;
  screened_name: string;
  match_status: ScreeningMatchStatus;
  match_score: number;
  list_source: string;
  match_details: Record<string, unknown>;
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenOverlap(a: string, b: string): number {
  const tokensA = new Set(normalizeName(a).split(" ").filter(Boolean));
  const tokensB = new Set(normalizeName(b).split(" ").filter(Boolean));
  if (tokensA.size === 0 || tokensB.size === 0) return 0;
  let overlap = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) overlap++;
  }
  return overlap / Math.max(tokensA.size, tokensB.size);
}

function screenAgainstWatchlist(partyName: string): ScreeningResult {
  const normalized = normalizeName(partyName);
  if (!normalized) {
    return {
      party_id: "",
      screened_name: partyName,
      match_status: "clear",
      match_score: 0,
      list_source: "passport-watchlist",
      match_details: { screened_at: new Date().toISOString() },
    };
  }

  let bestScore = 0;
  let bestMatch: (typeof WATCHLIST)[number] | null = null;

  for (const entry of WATCHLIST) {
    for (const candidate of [entry.name, ...entry.aliases]) {
      const candidateNorm = normalizeName(candidate);
      let score = tokenOverlap(normalized, candidateNorm);
      if (normalized.includes(candidateNorm) || candidateNorm.includes(normalized)) {
        score = Math.max(score, 0.85);
      }
      if (score > bestScore) {
        bestScore = score;
        bestMatch = entry;
      }
    }
  }

  if (!bestMatch || bestScore < 0.5) {
    return {
      party_id: "",
      screened_name: partyName,
      match_status: "clear",
      match_score: 0,
      list_source: "passport-watchlist",
      match_details: { screened_at: new Date().toISOString() },
    };
  }

  return {
    party_id: "",
    screened_name: partyName,
    match_status: bestScore >= 0.85 ? "confirmed_match" : "potential_match",
    match_score: Math.round(bestScore * 100),
    list_source: resolveSourceId(bestMatch.list),
    match_details: {
      matched_entity: bestMatch.name,
      list: bestMatch.list,
      risk_category: bestMatch.risk,
      screened_at: new Date().toISOString(),
    },
  };
}

/** Score a party against watchlist + optional OpenSanctions API. */
export async function screenPartyName(partyName: string): Promise<ScreeningResult> {
  const watchlistResult = screenAgainstWatchlist(partyName);

  const externalMatches = await queryOpenSanctions(partyName);
  if (externalMatches.length === 0) {
    return watchlistResult;
  }

  const bestExternal = externalMatches[0];
  if (bestExternal.matchScore / 100 > watchlistResult.match_score / 100) {
    return {
      party_id: "",
      screened_name: partyName,
      match_status: bestExternal.matchScore >= 85 ? "confirmed_match" : "potential_match",
      match_score: bestExternal.matchScore,
      list_source: "opensanctions",
      match_details: {
        matched_entity: bestExternal.entityName,
        list: bestExternal.listName,
        risk_category: bestExternal.riskCategory,
        source_url: bestExternal.sourceUrl,
        screened_at: new Date().toISOString(),
      },
    };
  }

  return watchlistResult;
}

/** Screen one party and persist results (one row per source). */
export async function screenAndStoreParty(
  party: Party,
  organizationId: string,
  userId?: string
): Promise<PartyScreening> {
  const admin = createAdminClient();
  const result = await screenPartyName(party.name);

  const { data: screening, error } = await admin
    .from("party_screenings")
    .upsert(
      {
        shipment_id: party.shipment_id,
        party_id: party.id,
        organization_id: organizationId,
        screened_name: party.name,
        match_status: result.match_status,
        match_score: result.match_score,
        list_source: result.list_source,
        match_details: result.match_details,
        screened_at: new Date().toISOString(),
      },
      { onConflict: "party_id,list_source" }
    )
    .select()
    .single();

  if (error || !screening) {
    throw new Error(error?.message ?? "Failed to store screening");
  }

  if (result.match_status !== "clear") {
    await writeAuditEvent(admin, {
      organizationId,
      userId,
      action: "party.screening_match",
      entityType: "party",
      entityId: party.id,
      shipmentId: party.shipment_id,
      metadata: {
        match_status: result.match_status,
        match_score: result.match_score,
        matched_entity: result.match_details.matched_entity,
        source: result.list_source,
      },
    });
  }

  return screening as PartyScreening;
}

export async function screenAllPartiesForShipment(
  shipmentId: string,
  organizationId: string,
  userId?: string
): Promise<PartyScreening[]> {
  const admin = createAdminClient();
  const { data: parties } = await admin.from("parties").select("*").eq("shipment_id", shipmentId);

  const results: PartyScreening[] = [];
  for (const party of parties ?? []) {
    results.push(await screenAndStoreParty(party as Party, organizationId, userId));
  }
  return results;
}

export async function getPartyScreeningsForShipment(
  shipmentId: string
): Promise<PartyScreening[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("party_screenings")
    .select("*")
    .eq("shipment_id", shipmentId)
    .order("match_score", { ascending: false });

  return (data ?? []) as PartyScreening[];
}
