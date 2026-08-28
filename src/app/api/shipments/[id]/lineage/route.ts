import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildShipmentLineage } from "@/lib/governance/lineage-builder";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: shipmentId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: shipment } = await supabase
    .from("shipments")
    .select("id")
    .eq("id", shipmentId)
    .single();

  if (!shipment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const lineage = await buildShipmentLineage(shipmentId);
  return NextResponse.json(lineage);
}
