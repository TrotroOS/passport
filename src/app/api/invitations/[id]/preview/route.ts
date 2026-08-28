import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getExternalInviteById } from "@/lib/collaboration/external-invite-store";
import { hasInviteeEmailColumn } from "@/lib/collaboration/schema-support";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** Public preview for external invitation links (no auth required). */
export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const admin = createAdminClient();
  const supportsInviteeEmail = await hasInviteeEmailColumn(admin);

  if (supportsInviteeEmail) {
    const { data: invitation } = await admin
      .from("shipment_collaborators")
      .select("id, role, status, invited_at, invitee_email, user_id, shipment_id")
      .eq("id", id)
      .maybeSingle();

    if (!invitation || invitation.status !== "pending") {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    }

    const { data: shipment } = await admin
      .from("shipments")
      .select("id, shipment_ref, origin_country, destination_country, status, organization_id")
      .eq("id", invitation.shipment_id)
      .maybeSingle();

    if (!shipment) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    }

    const { data: ownerOrg } = await admin
      .from("organizations")
      .select("name")
      .eq("id", shipment.organization_id)
      .single();

    const isExternal = !invitation.user_id && Boolean(invitation.invitee_email);

    return NextResponse.json({
      invitation: {
        id: invitation.id,
        role: invitation.role,
        status: invitation.status,
        invited_at: invitation.invited_at,
        is_external: isExternal,
        invitee_email: isExternal ? invitation.invitee_email : null,
        owner_organization_name: ownerOrg?.name ?? null,
        shipment: {
          id: shipment.id,
          shipment_ref: shipment.shipment_ref,
          origin_country: shipment.origin_country,
          destination_country: shipment.destination_country,
          status: shipment.status,
        },
      },
    });
  }

  const externalInvite = await getExternalInviteById(admin, id);
  if (!externalInvite || externalInvite.status !== "pending") {
    return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
  }

  const { data: shipment } = await admin
    .from("shipments")
    .select("id, shipment_ref, origin_country, destination_country, status, organization_id")
    .eq("id", externalInvite.shipment_id)
    .maybeSingle();

  if (!shipment) {
    return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
  }

  const { data: ownerOrg } = await admin
    .from("organizations")
    .select("name")
    .eq("id", shipment.organization_id)
    .single();

  return NextResponse.json({
    invitation: {
      id: externalInvite.id,
      role: externalInvite.role,
      status: externalInvite.status,
      invited_at: externalInvite.invited_at,
      is_external: true,
      invitee_email: externalInvite.invitee_email,
      owner_organization_name: ownerOrg?.name ?? null,
      shipment: {
        id: shipment.id,
        shipment_ref: shipment.shipment_ref,
        origin_country: shipment.origin_country,
        destination_country: shipment.destination_country,
        status: shipment.status,
      },
    },
  });
}
