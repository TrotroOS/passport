import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { writeAuditEvent } from "@/lib/audit";
import { updateShipmentSchema } from "@/lib/validations";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: shipment, error } = await supabase
    .from("shipments")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !shipment) {
    return NextResponse.json({ error: "Shipment not found" }, { status: 404 });
  }

  const [{ data: parties }, { data: products }, { data: documents }] =
    await Promise.all([
      supabase.from("parties").select("*").eq("shipment_id", id),
      supabase.from("products").select("*").eq("shipment_id", id),
      supabase.from("documents").select("*").eq("shipment_id", id),
    ]);

  return NextResponse.json({
    shipment: {
      ...shipment,
      parties: parties ?? [],
      products: products ?? [],
      documents: documents ?? [],
    },
  });
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = updateShipmentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { data: existing } = await supabase
    .from("shipments")
    .select("organization_id")
    .eq("id", id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Shipment not found" }, { status: 404 });
  }

  const { data: shipment, error } = await supabase
    .from("shipments")
    .update(parsed.data)
    .eq("id", id)
    .select()
    .single();

  if (error || !shipment) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to update shipment" },
      { status: 500 }
    );
  }

  await writeAuditEvent(supabase, {
    organizationId: existing.organization_id,
    userId: user.id,
    action: "shipment.updated",
    entityType: "shipment",
    entityId: shipment.id,
    shipmentId: shipment.id,
    metadata: parsed.data as Record<string, unknown>,
  });

  return NextResponse.json({ shipment });
}
