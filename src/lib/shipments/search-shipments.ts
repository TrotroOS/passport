import { createAdminClient } from "@/lib/supabase/admin";

export interface ShipmentSearchResult {
  id: string;
  shipment_ref: string;
  status: string;
  origin_country: string | null;
  destination_country: string | null;
  match_type: "ref" | "party" | "container";
  match_label: string;
}

export async function searchShipments(
  organizationId: string,
  query: string,
  limit = 20
): Promise<ShipmentSearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const admin = createAdminClient();
  const pattern = `%${q}%`;
  const results: ShipmentSearchResult[] = [];
  const seen = new Set<string>();

  function push(
    row: {
      id: string;
      shipment_ref: string;
      status: string;
      origin_country: string | null;
      destination_country: string | null;
    },
    match_type: ShipmentSearchResult["match_type"],
    match_label: string
  ) {
    const key = `${row.id}:${match_type}:${match_label}`;
    if (seen.has(key) || results.length >= limit) return;
    seen.add(key);
    results.push({ ...row, match_type, match_label });
  }

  const { data: byRef } = await admin
    .from("shipments")
    .select("id, shipment_ref, status, origin_country, destination_country")
    .eq("organization_id", organizationId)
    .ilike("shipment_ref", pattern)
    .limit(limit);

  for (const row of byRef ?? []) {
    push(row, "ref", row.shipment_ref);
  }

  const { data: parties } = await admin
    .from("parties")
    .select(
      "name, shipment_id, shipments!inner(id, shipment_ref, status, origin_country, destination_country, organization_id)"
    )
    .eq("shipments.organization_id", organizationId)
    .ilike("name", pattern)
    .limit(limit);

  for (const p of parties ?? []) {
    const shipmentRaw = p.shipments as
      | {
          id: string;
          shipment_ref: string;
          status: string;
          origin_country: string | null;
          destination_country: string | null;
        }
      | {
          id: string;
          shipment_ref: string;
          status: string;
          origin_country: string | null;
          destination_country: string | null;
        }[]
      | null;
    const s = Array.isArray(shipmentRaw) ? shipmentRaw[0] : shipmentRaw;
    if (s) push(s, "party", p.name);
  }

  const { data: containers } = await admin
    .from("container_details")
    .select(
      "container_number, shipment_id, shipments!inner(id, shipment_ref, status, origin_country, destination_country, organization_id)"
    )
    .eq("shipments.organization_id", organizationId)
    .ilike("container_number", pattern)
    .limit(limit);

  for (const c of containers ?? []) {
    const shipmentRaw = c.shipments as
      | {
          id: string;
          shipment_ref: string;
          status: string;
          origin_country: string | null;
          destination_country: string | null;
        }
      | {
          id: string;
          shipment_ref: string;
          status: string;
          origin_country: string | null;
          destination_country: string | null;
        }[]
      | null;
    const s = Array.isArray(shipmentRaw) ? shipmentRaw[0] : shipmentRaw;
    if (s) push(s, "container", c.container_number);
  }

  return results;
}
