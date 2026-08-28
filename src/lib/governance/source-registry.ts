import { createAdminClient } from "@/lib/supabase/admin";
import type { TrustedSource } from "@/types/database";

/** Map screening list_source to trusted_sources.id */
export const SOURCE_ALIASES: Record<string, string> = {
  passport_watchlist: "passport-watchlist",
  "OFAC-SDN": "ofac-sdn",
  "UN-Sanctions": "un-sanctions",
  openai: "openai",
  user: "human-analyst",
  ai: "openai",
  broker: "human-analyst",
  system: "passport-arbiter",
};

export async function listTrustedSources(): Promise<TrustedSource[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("trusted_sources")
    .select("*")
    .eq("is_active", true)
    .order("source_type")
    .order("name");

  return (data ?? []) as TrustedSource[];
}

export async function getTrustedSource(id: string): Promise<TrustedSource | null> {
  const admin = createAdminClient();
  const resolved = SOURCE_ALIASES[id] ?? id;
  const { data } = await admin
    .from("trusted_sources")
    .select("*")
    .eq("id", resolved)
    .maybeSingle();

  return (data as TrustedSource | null) ?? null;
}

export function resolveSourceId(raw: string): string {
  return SOURCE_ALIASES[raw] ?? raw;
}

/** Sources actively used for a shipment (from provenance + screenings + regulations). */
export async function getActiveSourcesForShipment(
  shipmentId: string
): Promise<TrustedSource[]> {
  const admin = createAdminClient();
  const sourceIds = new Set<string>();

  const [{ data: provenance }, { data: screenings }] = await Promise.all([
    admin
      .from("data_provenance_events")
      .select("source_id")
      .eq("shipment_id", shipmentId),
    admin
      .from("party_screenings")
      .select("list_source")
      .eq("shipment_id", shipmentId),
  ]);

  for (const p of provenance ?? []) {
    sourceIds.add(p.source_id);
  }
  for (const s of screenings ?? []) {
    sourceIds.add(resolveSourceId(s.list_source));
  }
  sourceIds.add("passport-regulations");

  const { data: sources } = await admin
    .from("trusted_sources")
    .select("*")
    .in("id", [...sourceIds])
    .eq("is_active", true);

  return (sources ?? []) as TrustedSource[];
}
