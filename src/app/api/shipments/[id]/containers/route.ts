import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireShipmentPermission } from "@/lib/shipments/shipment-access";
import { addContainerSchema } from "@/lib/validations";
import {
  addContainerToShipment,
  listContainersForShipment,
} from "@/lib/tracking/tracking-service";

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

  const containers = await listContainersForShipment(shipmentId);
  return NextResponse.json({ containers });
}

export async function POST(request: Request, { params }: RouteParams) {
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

  const body = await request.json().catch(() => ({}));
  const parsed = addContainerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  try {
    const result = await addContainerToShipment(
      shipmentId,
      {
        containerNumber: parsed.data.container_number,
        containerType: parsed.data.container_type,
        sealNumber: parsed.data.seal_number,
        carrier: parsed.data.carrier,
        vesselName: parsed.data.vessel_name,
        voyageNumber: parsed.data.voyage_number,
        billOfLadingNumber: parsed.data.bill_of_lading_number,
      },
      user.id
    );

    return NextResponse.json(
      {
        container: result.container,
        tracking: result.fetchResult,
      },
      { status: 201 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to add container";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
