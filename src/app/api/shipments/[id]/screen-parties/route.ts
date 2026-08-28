import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrganizationIdForUser } from "@/lib/auth/get-organization-id";
import {
  getPartyScreeningsForShipment,
  screenAllPartiesForShipment,
} from "@/lib/compliance/party-screening";

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

  try {
    const screenings = await getPartyScreeningsForShipment(shipmentId);
    return NextResponse.json({ screenings });
  } catch {
    return NextResponse.json({ screenings: [] });
  }
}

export async function POST(
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

  const organizationId = await getOrganizationIdForUser(supabase, user.id);
  if (!organizationId) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const { data: shipment } = await supabase
    .from("shipments")
    .select("id, organization_id")
    .eq("id", shipmentId)
    .eq("organization_id", organizationId)
    .single();

  if (!shipment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const screenings = await screenAllPartiesForShipment(
      shipmentId,
      organizationId,
      user.id
    );
    return NextResponse.json({ screenings }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Screening failed" },
      { status: 500 }
    );
  }
}
