import { createAdminClient } from "@/lib/supabase/admin";

export interface EntityGraphResult {
  entity_type: string;
  entity_id: string;
  query?: Record<string, string>;
  shipments: Array<{
    id: string;
    shipment_ref: string;
    status: string;
    origin_country: string | null;
    destination_country: string | null;
    created_at: string;
  }>;
  count: number;
}

type ShipmentSummary = EntityGraphResult["shipments"][number];

function uniqueShipments(shipments: ShipmentSummary[]): ShipmentSummary[] {
  return Array.from(new Map(shipments.map((s) => [s.id, s])).values());
}

async function shipmentsForOrg(orgId: string, shipmentIds: string[]) {
  if (shipmentIds.length === 0) return [];
  const admin = createAdminClient();
  const { data } = await admin
    .from("shipments")
    .select("id, shipment_ref, status, origin_country, destination_country, created_at")
    .eq("organization_id", orgId)
    .in("id", shipmentIds);
  return (data ?? []) as ShipmentSummary[];
}

export async function getEntityGraph(
  entityType: string,
  entityId: string,
  organizationId: string
): Promise<EntityGraphResult | null> {
  const admin = createAdminClient();

  if (entityType === "organization") {
    const { data: shipments } = await admin
      .from("shipments")
      .select("id, shipment_ref, status, origin_country, destination_country, created_at")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(100);

    return {
      entity_type: "organization",
      entity_id: organizationId,
      shipments: shipments ?? [],
      count: shipments?.length ?? 0,
    };
  }

  if (entityType === "party" || entityType === "party_by_name") {
    let partyName = entityId;

    if (entityType === "party") {
      const { data: party } = await admin
        .from("parties")
        .select("name, role, shipment_id")
        .eq("id", entityId)
        .single();

      if (!party) return null;

      const { data: shipmentRow } = await admin
        .from("shipments")
        .select("organization_id")
        .eq("id", party.shipment_id)
        .single();

      if (!shipmentRow || shipmentRow.organization_id !== organizationId) return null;
      partyName = party.name;

      const { data: matches } = await admin
        .from("parties")
        .select("shipment_id")
        .eq("name", party.name)
        .eq("role", party.role);

      const shipmentIds = (matches ?? []).map((m) => m.shipment_id);
      const shipments = await shipmentsForOrg(organizationId, shipmentIds);

      return {
        entity_type: "party",
        entity_id: entityId,
        query: { name: party.name, role: party.role },
        shipments,
        count: shipments.length,
      };
    }

    const { data: matches } = await admin
      .from("parties")
      .select("shipment_id")
      .ilike("name", `%${partyName}%`);

    const shipmentIds = (matches ?? []).map((m) => m.shipment_id);
    const shipments = uniqueShipments(await shipmentsForOrg(organizationId, shipmentIds));

    return {
      entity_type: "party",
      entity_id: entityId,
      query: { name: partyName },
      shipments,
      count: shipments.length,
    };
  }

  if (entityType === "product") {
    const { data: product } = await admin
      .from("products")
      .select("name, hs_code, shipment_id")
      .eq("id", entityId)
      .single();

    if (!product) return null;

    const { data: shipmentRow } = await admin
      .from("shipments")
      .select("organization_id")
      .eq("id", product.shipment_id)
      .single();

    if (!shipmentRow || shipmentRow.organization_id !== organizationId) return null;

    let matches;
    if (product.hs_code) {
      ({ data: matches } = await admin
        .from("products")
        .select("shipment_id")
        .eq("hs_code", product.hs_code));
    } else {
      ({ data: matches } = await admin
        .from("products")
        .select("shipment_id")
        .ilike("name", product.name));
    }

    const shipmentIds = (matches ?? []).map((m) => m.shipment_id);
    const shipments = uniqueShipments(await shipmentsForOrg(organizationId, shipmentIds));

    return {
      entity_type: "product",
      entity_id: entityId,
      shipments,
      count: shipments.length,
    };
  }

  return null;
}
