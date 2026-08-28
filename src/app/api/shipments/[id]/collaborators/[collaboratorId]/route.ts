import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAuditEvent } from "@/lib/audit";
import { updateExternalInviteStatus } from "@/lib/collaboration/external-invite-store";
import { requireShipmentPermission } from "@/lib/shipments/shipment-access";

interface RouteParams {
  params: Promise<{ id: string; collaboratorId: string }>;
}

export async function DELETE(_request: Request, { params }: RouteParams) {
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
    "revoke"
  );
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const admin = createAdminClient();
  const { data: collaborator, error } = await admin
    .from("shipment_collaborators")
    .update({
      status: "revoked",
      revoked_at: new Date().toISOString(),
    })
    .eq("id", collaboratorId)
    .eq("shipment_id", shipmentId)
    .select()
    .maybeSingle();

  if (error || !collaborator) {
    const externalRevoked = await updateExternalInviteStatus(
      admin,
      collaboratorId,
      "revoked"
    );
    if (!externalRevoked) {
      return NextResponse.json({ error: "Collaborator not found" }, { status: 404 });
    }

    await writeAuditEvent(admin, {
      organizationId: access.shipment.organization_id,
      userId: user.id,
      action: "collaborator.revoked",
      entityType: "shipment_collaborator",
      entityId: collaboratorId,
      shipmentId,
      metadata: {
        invitee_email: externalRevoked.invitee_email,
        external_invite: true,
      },
    });

    return NextResponse.json({ success: true });
  }

  await writeAuditEvent(admin, {
    organizationId: access.shipment.organization_id,
    userId: user.id,
    action: "collaborator.revoked",
    entityType: "shipment_collaborator",
    entityId: collaborator.id,
    shipmentId,
    metadata: {
      revoked_user_id: collaborator.user_id,
      collaborator_organization_id: collaborator.organization_id,
    },
  });

  return NextResponse.json({ success: true });
}
