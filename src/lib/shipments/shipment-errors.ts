/** Map Postgres/Supabase errors to user-friendly shipment messages. */
export function formatShipmentInsertError(
  error: { message?: string; code?: string } | null
): string {
  if (!error?.message) return "Failed to create shipment";

  const msg = error.message.toLowerCase();

  if (
    error.code === "23505" ||
    msg.includes("shipments_organization_id_shipment_ref_key") ||
    msg.includes("duplicate key")
  ) {
    return "A shipment with this reference already exists in your organization. Use a different reference or open the existing shipment from your dashboard.";
  }

  if (msg.includes("row-level security")) {
    return "Permission denied. Run the RLS fix SQL in Supabase, then try again.";
  }

  return error.message;
}

export function isDuplicateShipmentRefError(
  error: { message?: string; code?: string } | null
): boolean {
  if (!error) return false;
  const msg = error.message?.toLowerCase() ?? "";
  return (
    error.code === "23505" ||
    msg.includes("shipments_organization_id_shipment_ref_key") ||
    msg.includes("duplicate key")
  );
}
