import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAuditEvent } from "@/lib/audit";
import {
  getExternalInviteById,
  updateExternalInviteStatus,
} from "@/lib/collaboration/external-invite-store";
import {
  getInvitationForUser,
  linkPendingInvitationsForUser,
} from "@/lib/collaboration/link-pending-invitations";
import { hasInviteeEmailColumn } from "@/lib/collaboration/schema-support";

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
    .select("email, organization_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.organization_id) {
    return NextResponse.json(
      { error: "Complete your account setup before accepting invitations" },
      { status: 400 }
    );
  }

  const userEmail = profile.email ?? user.email ?? "";
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

  const supportsInviteeEmail = await hasInviteeEmailColumn(admin);

  if ("_external" in invitation && invitation._external) {
    const externalInvite = await getExternalInviteById(admin, id);
    if (!externalInvite) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    }

    const { data: created, error } = await admin
      .from("shipment_collaborators")
      .insert({
        shipment_id: externalInvite.shipment_id,
        organization_id: profile.organization_id,
        user_id: user.id,
        role: externalInvite.role,
        status: "active",
        invited_by: externalInvite.invited_by,
        invited_at: externalInvite.invited_at,
        accepted_at: new Date().toISOString(),
        revoked_at: null,
      })
      .select()
      .single();

    if (error || !created) {
      return NextResponse.json(
        { error: error?.message ?? "Failed to accept invitation" },
        { status: 500 }
      );
    }

    await updateExternalInviteStatus(admin, id, "active");

    const { data: shipment } = await admin
      .from("shipments")
      .select("organization_id, shipment_ref")
      .eq("id", created.shipment_id)
      .single();

    if (shipment) {
      await writeAuditEvent(admin, {
        organizationId: shipment.organization_id,
        userId: user.id,
        action: "collaborator.accepted",
        entityType: "shipment_collaborator",
        entityId: created.id,
        shipmentId: created.shipment_id,
        metadata: {
          collaborator_organization_id: created.organization_id,
          role: created.role,
          migrated_from_external_invite: true,
        },
      });
    }

    return NextResponse.json({
      collaborator: created,
      shipment_id: created.shipment_id,
    });
  }

  const updatePayload: Record<string, unknown> = {
    status: "active",
    user_id: user.id,
    organization_id: profile.organization_id,
    accepted_at: new Date().toISOString(),
    revoked_at: null,
  };

  if (supportsInviteeEmail) {
    updatePayload.invitee_email = userEmail.trim().toLowerCase();
  }

  const { data: updated, error } = await admin
    .from("shipment_collaborators")
    .update(updatePayload)
    .eq("id", id)
    .select("*, shipments(organization_id, shipment_ref)")
    .single();

  if (error || !updated) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to accept invitation" },
      { status: 500 }
    );
  }

  const shipment = updated.shipments as {
    organization_id: string;
    shipment_ref: string;
  };

  await writeAuditEvent(admin, {
    organizationId: shipment.organization_id,
    userId: user.id,
    action: "collaborator.accepted",
    entityType: "shipment_collaborator",
    entityId: updated.id,
    shipmentId: updated.shipment_id,
    metadata: {
      collaborator_organization_id: updated.organization_id,
      role: updated.role,
    },
  });

  return NextResponse.json({
    collaborator: updated,
    shipment_id: updated.shipment_id,
  });
}
