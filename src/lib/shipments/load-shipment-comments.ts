import type { SupabaseClient } from "@supabase/supabase-js";
import type { ShipmentComment } from "@/types/database";

/** Load all comments for a shipment (admin — avoids RLS gaps on cross-org user/org joins). */
export async function loadShipmentComments(
  admin: SupabaseClient,
  shipmentId: string
): Promise<ShipmentComment[]> {
  const { data, error } = await admin
    .from("shipment_comments")
    .select("*, users(id, email, full_name), organizations(id, name)")
    .eq("shipment_id", shipmentId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[Comments] Failed to load shipment comments:", error.message);
    return [];
  }

  return (data ?? []) as ShipmentComment[];
}
