import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getHsCodeChecksForShipment } from "@/lib/hs-code/hs-code-engine";
import { requireShipmentPermission } from "@/lib/shipments/shipment-access";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
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
    "view"
  );
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const checks = await getHsCodeChecksForShipment(shipmentId);
  return NextResponse.json({ checks });
}
