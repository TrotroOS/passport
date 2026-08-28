import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  deliverCollaborationInvite,
  getAppOriginFromRequest,
  resolveInviteForResend,
} from "@/lib/collaboration/invite-delivery";
import { requireShipmentPermission } from "@/lib/shipments/shipment-access";

interface RouteParams {
  params: Promise<{ id: string; collaboratorId: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const { id: shipmentId, collaboratorId } = await params;
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
    "invite"
  );
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const admin = createAdminClient();
  const invite = await resolveInviteForResend(admin, shipmentId, collaboratorId);
  if (!invite) {
    return NextResponse.json({ error: "Pending invitation not found" }, { status: 404 });
  }

  const { data: ownerOrg } = await admin
    .from("organizations")
    .select("name")
    .eq("id", access.shipment.organization_id)
    .single();

  const appOrigin = getAppOriginFromRequest(request);
  const delivery = await deliverCollaborationInvite({
    recipientEmail:
      invite.kind === "external" ? invite.invite.invitee_email : invite.recipientEmail,
    shipmentRef: access.shipment.shipment_ref,
    ownerOrganizationName: ownerOrg?.name ?? "Passport organization",
    role: invite.kind === "external" ? invite.invite.role : invite.role,
    invitationId: collaboratorId,
    locale: invite.kind === "external" ? "en" : invite.locale,
    isExternal: invite.kind === "external" ? true : invite.isExternal,
    appOrigin,
  });

  return NextResponse.json({
    email_sent: delivery.email_sent,
    email_configured: delivery.email_configured,
    invitation_url: delivery.invitation_url,
  });
}
