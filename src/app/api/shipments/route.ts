import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { insertShipmentForUser } from "@/lib/auth/get-organization-id";
import { writeAuditEvent } from "@/lib/audit";
import { createShipmentSchema } from "@/lib/validations";
import {
  formatShipmentInsertError,
  isDuplicateShipmentRefError,
} from "@/lib/shipments/shipment-errors";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: shipments, error } = await supabase
    .from("shipments")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ shipments });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createShipmentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { data: profile } = await supabase
    .from("users")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile?.organization_id) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  let { data: shipment, error } = await supabase
    .from("shipments")
    .insert({
      ...parsed.data,
      organization_id: profile.organization_id,
      created_by: user.id,
    })
    .select()
    .single();

  if (error?.message?.includes("row-level security")) {
    const fallback = await insertShipmentForUser(
      supabase,
      user.id,
      profile.organization_id,
      parsed.data
    );
    shipment = fallback.data;
    error = fallback.error as typeof error;
  }

  if (error || !shipment) {
    if (isDuplicateShipmentRefError(error)) {
      const admin = createAdminClient();
      const { data: existing } = await admin
        .from("shipments")
        .select("id, shipment_ref, organization_id, origin_country, destination_country, status, created_at")
        .eq("organization_id", profile.organization_id)
        .eq("shipment_ref", parsed.data.shipment_ref)
        .maybeSingle();

      if (existing) {
        return NextResponse.json(
          { error: formatShipmentInsertError(error), shipment: existing },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      { error: formatShipmentInsertError(error) },
      { status: 500 }
    );
  }

  await writeAuditEvent(supabase, {
    organizationId: profile.organization_id,
    userId: user.id,
    action: "shipment.created",
    entityType: "shipment",
    entityId: shipment.id,
    shipmentId: shipment.id,
    metadata: { shipment_ref: shipment.shipment_ref },
  });

  return NextResponse.json({ shipment }, { status: 201 });
}
