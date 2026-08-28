import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireShipmentPermission } from "@/lib/shipments/shipment-access";
import { fetchTrackingEvents } from "@/lib/tracking/tracking-service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, { params }: RouteParams) {
  const { id: shipmentId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const access = await requireShipmentPermission(
    supabase,
    user.id,
    shipmentId,
    "upload"
  );
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const result = await fetchTrackingEvents(shipmentId, user.id);
    return NextResponse.json(result);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to refresh tracking";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
