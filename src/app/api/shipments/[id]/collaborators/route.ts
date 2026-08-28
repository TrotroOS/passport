import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAuditEvent } from "@/lib/audit";
import {
  deliverCollaborationInvite,
  getAppOriginFromRequest,
} from "@/lib/collaboration/invite-delivery";
import {
  createExternalInvite,
  findPendingExternalInviteByEmail,
  toShipmentCollaborator,
} from "@/lib/collaboration/external-invite-store";
import { hasInviteeEmailColumn } from "@/lib/collaboration/schema-support";
import {
  listCollaboratorsForShipment,
  requireShipmentPermission,
} from "@/lib/shipments/shipment-access";
import { inviteCollaboratorSchema } from "@/lib/validations";

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

  const collaborators = await listCollaboratorsForShipment(supabase, shipmentId);
  return NextResponse.json({ collaborators });
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
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
      "invite"
    );
    if ("error" in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = inviteCollaboratorSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    return await createCollaboratorInvitation({
      request,
      shipmentId,
      userId: user.id,
      email: parsed.data.email.trim().toLowerCase(),
      role: parsed.data.role,
      access,
    });
  } catch (error) {
    console.error("[Collaboration] Invite failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create invitation",
      },
      { status: 500 }
    );
  }
}

async function createCollaboratorInvitation({
  request,
  shipmentId,
  userId,
  email,
  role,
  access,
}: {
  request: Request;
  shipmentId: string;
  userId: string;
  email: string;
  role: "viewer" | "commenter" | "editor";
  access: { shipment: { organization_id: string; shipment_ref: string } };
}) {
  const admin = createAdminClient();
  const supportsInviteeEmail = await hasInviteeEmailColumn(admin);
  const appOrigin = getAppOriginFromRequest(request);

  const { data: invitee } = await admin
    .from("users")
    .select("id, email, full_name, organization_id, preferred_language")
    .ilike("email", email)
    .maybeSingle();

  const { data: ownerOrg } = await admin
    .from("organizations")
    .select("name")
    .eq("id", access.shipment.organization_id)
    .single();

  const ownerOrganizationName = ownerOrg?.name ?? "Passport organization";

  async function respondWithInvite(
    collaborator: { id: string },
    inviteEmail: string,
    inviteRole: string,
    isExternal: boolean,
    locale = "en",
    responseCollaborator: unknown = collaborator
  ) {
    const delivery = await deliverCollaborationInvite({
      recipientEmail: inviteEmail,
      shipmentRef: access.shipment.shipment_ref,
      ownerOrganizationName,
      role: inviteRole,
      invitationId: collaborator.id,
      locale,
      isExternal,
      appOrigin,
    });

    return NextResponse.json(
      {
        collaborator: responseCollaborator,
        is_external: isExternal,
        email_sent: delivery.email_sent,
        email_configured: delivery.email_configured,
        invitation_url: delivery.invitation_url,
      },
      { status: 201 }
    );
  }

  if (invitee) {
    if (invitee.organization_id === access.shipment.organization_id) {
      return NextResponse.json(
        { error: "User is already in your organization" },
        { status: 400 }
      );
    }

    if (!invitee.organization_id) {
      return NextResponse.json(
        { error: "Invitee must complete account setup before they can be added" },
        { status: 400 }
      );
    }

    const { data: existing } = await admin
      .from("shipment_collaborators")
      .select("id, status")
      .eq("shipment_id", shipmentId)
      .eq("user_id", invitee.id)
      .maybeSingle();

    if (existing?.status === "active") {
      return NextResponse.json(
        { error: "User is already an active collaborator" },
        { status: 400 }
      );
    }

    if (existing?.status === "pending") {
      return NextResponse.json(
        { error: "An invitation is already pending for this user" },
        { status: 400 }
      );
    }

    const collaboratorPayload: Record<string, unknown> = {
      shipment_id: shipmentId,
      organization_id: invitee.organization_id,
      user_id: invitee.id,
      role,
      status: "pending",
      invited_by: userId,
      invited_at: new Date().toISOString(),
      accepted_at: null,
      revoked_at: null,
    };

    if (supportsInviteeEmail) {
      collaboratorPayload.invitee_email = email;
    }

    const { data: collaborator, error } = existing
      ? await admin
          .from("shipment_collaborators")
          .update({ ...collaboratorPayload, status: "pending" })
          .eq("id", existing.id)
          .select()
          .single()
      : await admin
          .from("shipment_collaborators")
          .insert(collaboratorPayload)
          .select()
          .single();

    if (error || !collaborator) {
      throw new Error(error?.message ?? "Failed to create invitation");
    }

    await writeAuditEvent(admin, {
      organizationId: access.shipment.organization_id,
      userId,
      action: "collaborator.invited",
      entityType: "shipment_collaborator",
      entityId: collaborator.id,
      shipmentId,
      metadata: {
        invitee_user_id: invitee.id,
        invitee_email: invitee.email,
        invitee_organization_id: invitee.organization_id,
        role,
      },
    });

    return respondWithInvite(
      collaborator,
      invitee.email,
      role,
      false,
      invitee.preferred_language ?? "en"
    );
  }

  if (supportsInviteeEmail) {
    const { data: existingEmailInvite } = await admin
      .from("shipment_collaborators")
      .select("id, status")
      .eq("shipment_id", shipmentId)
      .ilike("invitee_email", email)
      .maybeSingle();

    if (existingEmailInvite?.status === "active") {
      return NextResponse.json(
        { error: "This email already has active access to this shipment" },
        { status: 400 }
      );
    }

    if (existingEmailInvite?.status === "pending") {
      return NextResponse.json(
        { error: "An invitation is already pending for this email" },
        { status: 400 }
      );
    }

    const externalPayload = {
      shipment_id: shipmentId,
      organization_id: null,
      user_id: null,
      invitee_email: email,
      role,
      status: "pending" as const,
      invited_by: userId,
      invited_at: new Date().toISOString(),
      accepted_at: null,
      revoked_at: null,
    };

    const { data: collaborator, error } = existingEmailInvite
      ? await admin
          .from("shipment_collaborators")
          .update({ ...externalPayload, status: "pending" })
          .eq("id", existingEmailInvite.id)
          .select()
          .single()
      : await admin
          .from("shipment_collaborators")
          .insert(externalPayload)
          .select()
          .single();

    if (error || !collaborator) {
      throw new Error(error?.message ?? "Failed to create invitation");
    }

    await writeAuditEvent(admin, {
      organizationId: access.shipment.organization_id,
      userId,
      action: "collaborator.invited",
      entityType: "shipment_collaborator",
      entityId: collaborator.id,
      shipmentId,
      metadata: {
        invitee_email: email,
        role,
        is_external: true,
      },
    });

    return respondWithInvite(collaborator, email, role, true);
  }

  const existingExternal = await findPendingExternalInviteByEmail(
    admin,
    shipmentId,
    email
  );
  if (existingExternal) {
    return respondWithInvite(
      { id: existingExternal.id },
      email,
      existingExternal.role,
      true,
      "en",
      toShipmentCollaborator(existingExternal)
    );
  }

  const externalInvite = await createExternalInvite(admin, {
    shipmentId,
    organizationId: access.shipment.organization_id,
    invitedBy: userId,
    email,
    role,
  });

  return respondWithInvite(
    { id: externalInvite.id },
    email,
    role,
    true,
    "en",
    toShipmentCollaborator(externalInvite)
  );
}
