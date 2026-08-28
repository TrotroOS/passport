import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAuditEvent } from "@/lib/audit";
import { updateExternalInviteStatus } from "@/lib/collaboration/external-invite-store";
import {
  getInvitationForUser,
  linkPendingInvitationsForUser,
} from "@/lib/collaboration/link-pending-invitations";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, { params }: RouteParams) {
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

  const userEmail = profile?.email ?? user.email ?? "";
  await linkPendingInvitationsForUser(user.id, userEmail);

  const invitation = await getInvitationForUser(id, user.id, userEmail);
  if (!invitation) {
    return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
  }

  if (invitation.status !== "pending") {
    return NextResponse.json(
      { error: `Invitation is already ${invitation.status}` },
      { status: 400 }
    );
  }

  if ("_external" in invitation && invitation._external) {
    await updateExternalInviteStatus(admin, id, "declined");

    const { data: shipment } = await admin
      .from("shipments")
      .select("organization_id")
      .eq("id", invitation.shipment_id)
      .single();

    if (shipment) {
      await writeAuditEvent(admin, {
        organizationId: shipment.organization_id,
        userId: user.id,
        action: "collaborator.declined",
        entityType: "shipment_collaborator",
        entityId: id,
        shipmentId: invitation.shipment_id,
        metadata: { external_invite: true },
      });
    }

    return NextResponse.json({ success: true });
  }

  const { data: updated, error } = await admin
    .from("shipment_collaborators")
    .update({
      status: "declined",
      revoked_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*, shipments(organization_id)")
    .single();

  if (error || !updated) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to decline invitation" },
      { status: 500 }
    );
  }

  const shipment = updated.shipments as { organization_id: string };

  await writeAuditEvent(admin, {
    organizationId: shipment.organization_id,
    userId: user.id,
    action: "collaborator.declined",
    entityType: "shipment_collaborator",
    entityId: updated.id,
    shipmentId: updated.shipment_id,
    metadata: {
      collaborator_organization_id: updated.organization_id,
    },
  });

  return NextResponse.json({ success: true });
}
