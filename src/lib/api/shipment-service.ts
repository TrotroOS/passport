import { createAdminClient } from "@/lib/supabase/admin";
import type { ApiKeyContext } from "@/lib/api/api-key-auth";

export async function getShipmentForOrg(
  shipmentId: string,
  organizationId: string
) {
  const admin = createAdminClient();
  const { data: shipment } = await admin
    .from("shipments")
    .select("*")
    .eq("id", shipmentId)
    .eq("organization_id", organizationId)
    .single();

  return shipment;
}

export async function listShipmentsForOrg(
  organizationId: string,
  filters?: { status?: string; limit?: number }
) {
  const admin = createAdminClient();
  let query = admin
    .from("shipments")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  query = query.limit(filters?.limit ?? 50);

  const { data } = await query;
  return data ?? [];
}

export async function getFullShipmentAnalysis(shipmentId: string) {
  const { getShipmentGraph } = await import("@/lib/graph/trade-graph");
  return getShipmentGraph(shipmentId);
}

export async function updateShipmentForOrg(
  shipmentId: string,
  organizationId: string,
  updates: Record<string, unknown>
) {
  const admin = createAdminClient();

  const { data: shipment, error } = await admin
    .from("shipments")
    .update(updates)
    .eq("id", shipmentId)
    .eq("organization_id", organizationId)
    .select()
    .single();

  if (error || !shipment) {
    return null;
  }

  return shipment;
}

export type { ApiKeyContext };
