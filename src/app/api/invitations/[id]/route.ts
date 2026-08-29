import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getInvitationForUser } from "@/lib/collaboration/link-pending-invitations";
import { recordInvitationViewed } from "@/lib/collaboration/invitation-view-tracking";

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

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("users")
    .select("email")
    .eq("id", user.id)
    .maybeSingle();

  const invitation = await getInvitationForUser(
    id,
    user.id,
    profile?.email ?? user.email ?? ""
  );

  if (!invitation) {
    return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
  }

  const { data: shipment } = await admin
    .from("shipments")
    .select("id, shipment_ref, origin_country, destination_country, status, organization_id")
    .eq("id", invitation.shipment_id)
    .single();

  const { data: ownerOrg } = shipment
    ? await admin
        .from("organizations")
        .select("name")
        .eq("id", shipment.organization_id)
        .single()
    : { data: null };

  const isExternal =
    ("_external" in invitation && invitation._external) ||
    (!invitation.user_id && Boolean(invitation.invitee_email));

  if (invitation.status === "pending" && shipment) {
    await recordInvitationViewed(admin, {
      invitationId: invitation.id,
      shipmentId: shipment.id,
      organizationId: shipment.organization_id,
      shipmentRef: shipment.shipment_ref,
      viewerUserId: user.id,
      viewerLabel: profile?.email ?? user.email ?? null,
      inviteeEmail:
        "invitee_email" in invitation
          ? (invitation.invitee_email as string | null)
          : null,
    });
  }

  return NextResponse.json({
    invitation: {
      id: invitation.id,
      role: invitation.role,
      status: invitation.status,
      invited_at: invitation.invited_at,
      is_external: isExternal,
      shipment,
      owner_organization_name: ownerOrg?.name ?? null,
    },
  });
}
