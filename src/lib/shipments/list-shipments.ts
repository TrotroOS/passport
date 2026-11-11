import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrganizationIdForUser } from "@/lib/auth/get-organization-id";
import { getShipmentAccess } from "@/lib/shipments/shipment-access";
import type { Shipment } from "@/types/database";

const DASHBOARD_SHIPMENT_COLUMNS =
  "id, organization_id, shipment_ref, status, origin_country, destination_country, created_at, updated_at, clearance_stage" as const;

/** List shipments owned by the user's organization. */
export async function listShipmentsForUser(
  supabase: SupabaseClient,
  userId: string,
  options?: { organizationId?: string | null; limit?: number }
): Promise<Shipment[]> {
  const limit = options?.limit ?? 50;
  const organizationId =
    options?.organizationId ?? (await getOrganizationIdForUser(supabase, userId));

  let query = supabase
    .from("shipments")
    .select(DASHBOARD_SHIPMENT_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (organizationId) {
    query = query.eq("organization_id", organizationId);
  }

  const { data: shipments, error } = await query;

  if (!error && shipments) {
    return shipments as Shipment[];
  }

  if (!organizationId) {
    return [];
  }

  const admin = createAdminClient();
  const { data: adminShipments } = await admin
    .from("shipments")
    .select(DASHBOARD_SHIPMENT_COLUMNS)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (adminShipments as Shipment[] | null) ?? [];
}

/** Fetch one shipment if the user is owner or active collaborator. */
export async function getShipmentForUser(
  supabase: SupabaseClient,
  userId: string,
  shipmentId: string
): Promise<Shipment | null> {
  const access = await getShipmentAccess(supabase, userId, shipmentId);
  return access.shipment ?? null;
}
