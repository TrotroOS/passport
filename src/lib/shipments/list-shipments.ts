import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrganizationIdForUser } from "@/lib/auth/get-organization-id";
import { getShipmentAccess } from "@/lib/shipments/shipment-access";
import type { Shipment } from "@/types/database";

/** List shipments owned by the user's organization. */
export async function listShipmentsForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<Shipment[]> {
  const { data: shipments, error } = await supabase
    .from("shipments")
    .select("*")
    .order("created_at", { ascending: false });

  if (!error && shipments) {
    const organizationId = await getOrganizationIdForUser(supabase, userId);
    if (organizationId) {
      return shipments.filter((s) => s.organization_id === organizationId);
    }
    if (shipments.length > 0) return shipments;
  }

  const organizationId = await getOrganizationIdForUser(supabase, userId);
  if (!organizationId) {
    return shipments ?? [];
  }

  const admin = createAdminClient();
  const { data: adminShipments } = await admin
    .from("shipments")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  return adminShipments ?? [];
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
