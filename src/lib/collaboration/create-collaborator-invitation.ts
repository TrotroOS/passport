import { createAdminClient } from "@/lib/supabase/admin";
import { writeAuditEvent } from "@/lib/audit";
import {
  createExternalInvite,
  findPendingExternalInviteByEmail,
  toShipmentCollaborator,
} from "@/lib/collaboration/external-invite-store";
import {
  deliverCollaborationInvite,
  getAppOriginFromRequest,
} from "@/lib/collaboration/invite-delivery";
import { hasInviteeEmailColumn, hasParticipantTypeColumn } from "@/lib/collaboration/schema-support";
import type {
  CollaboratorParticipantType,
  CollaboratorRole,
} from "@/types/database";

export interface CreateCollaboratorInvitationInput {
  request: Request;
  shipmentId: string;
  userId: string;
  email: string;
  role: CollaboratorRole;
  participantType: CollaboratorParticipantType;
  shipment: { organization_id: string; shipment_ref: string };
}

export interface CollaboratorInvitationResult {
  email: string;
  success: boolean;
  error?: string;
  collaborator?: unknown;
  is_external?: boolean;
  email_sent?: boolean;
  email_configured?: boolean;
  invitation_url?: string;
  email_error?: string;
}

async function respondWithInvite(
  request: Request,
  collaborator: { id: string },
  inviteEmail: string,
  inviteRole: string,
  ownerOrganizationName: string,
  shipmentRef: string,
  isExternal: boolean,
  locale = "en",
  responseCollaborator: unknown = collaborator
): Promise<Omit<CollaboratorInvitationResult, "email" | "success">> {
  const delivery = await deliverCollaborationInvite({
    recipientEmail: inviteEmail,
    shipmentRef,
    ownerOrganizationName,
    role: inviteRole,
    invitationId: collaborator.id,
    locale,
    isExternal,
    appOrigin: getAppOriginFromRequest(request),
  });

  return {
    collaborator: responseCollaborator,
    is_external: isExternal,
    email_sent: delivery.email_sent,
    email_configured: delivery.email_configured,
    invitation_url: delivery.invitation_url,
    email_error: delivery.email_error,
  };
}

export async function createCollaboratorInvitation(
  input: CreateCollaboratorInvitationInput
): Promise<CollaboratorInvitationResult> {
  const {
    request,
    shipmentId,
    userId,
    email,
    role,
    participantType,
    shipment,
  } = input;

  const admin = createAdminClient();
  const supportsInviteeEmail = await hasInviteeEmailColumn(admin);
  const supportsParticipantType = await hasParticipantTypeColumn(admin);

  function applyParticipantType(payload: Record<string, unknown>) {
    if (supportsParticipantType) {
      payload.participant_type = participantType;
    }
    return payload;
  }

  const { data: invitee } = await admin
    .from("users")
    .select("id, email, full_name, organization_id, preferred_language")
    .ilike("email", email)
    .maybeSingle();

  const { data: ownerOrg } = await admin
    .from("organizations")
    .select("name")
    .eq("id", shipment.organization_id)
    .single();

  const ownerOrganizationName = ownerOrg?.name ?? "Passport organization";

  if (invitee) {
    if (invitee.organization_id === shipment.organization_id) {
      return {
        email,
        success: false,
        error: "User is already in your organization",
      };
    }

    if (!invitee.organization_id) {
      return {
        email,
        success: false,
        error: "Invitee must complete account setup before they can be added",
      };
    }

    const { data: existing } = await admin
      .from("shipment_collaborators")
      .select("id, status")
      .eq("shipment_id", shipmentId)
      .eq("user_id", invitee.id)
      .maybeSingle();

    if (existing?.status === "active") {
      return {
        email,
        success: false,
        error: "User is already an active collaborator",
      };
    }

    if (existing?.status === "pending") {
      return {
        email,
        success: false,
        error: "An invitation is already pending for this user",
      };
    }

    const collaboratorPayload: Record<string, unknown> = applyParticipantType({
      shipment_id: shipmentId,
      organization_id: invitee.organization_id,
      user_id: invitee.id,
      role,
      status: "pending",
      invited_by: userId,
      invited_at: new Date().toISOString(),
      accepted_at: null,
      revoked_at: null,
    });

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
      return {
        email,
        success: false,
        error: error?.message ?? "Failed to create invitation",
      };
    }

    await writeAuditEvent(admin, {
      organizationId: shipment.organization_id,
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
        participant_type: participantType,
      },
    });

    const delivery = await respondWithInvite(
      request,
      collaborator,
      invitee.email,
      role,
      ownerOrganizationName,
      shipment.shipment_ref,
      false,
      invitee.preferred_language ?? "en",
      collaborator
    );

    return { email, success: true, ...delivery };
  }

  if (supportsInviteeEmail) {
    const { data: existingEmailInvite } = await admin
      .from("shipment_collaborators")
      .select("id, status")
      .eq("shipment_id", shipmentId)
      .ilike("invitee_email", email)
      .maybeSingle();

    if (existingEmailInvite?.status === "active") {
      return {
        email,
        success: false,
        error: "This email already has active access to this shipment",
      };
    }

    if (existingEmailInvite?.status === "pending") {
      return {
        email,
        success: false,
        error: "An invitation is already pending for this email",
      };
    }

    const externalPayload = applyParticipantType({
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
    });

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
      return {
        email,
        success: false,
        error: error?.message ?? "Failed to create invitation",
      };
    }

    await writeAuditEvent(admin, {
      organizationId: shipment.organization_id,
      userId,
      action: "collaborator.invited",
      entityType: "shipment_collaborator",
      entityId: collaborator.id,
      shipmentId,
      metadata: {
        invitee_email: email,
        role,
        participant_type: participantType,
        is_external: true,
      },
    });

    const delivery = await respondWithInvite(
      request,
      collaborator,
      email,
      role,
      ownerOrganizationName,
      shipment.shipment_ref,
      true,
      "en",
      collaborator
    );

    return { email, success: true, ...delivery };
  }

  const existingExternal = await findPendingExternalInviteByEmail(
    admin,
    shipmentId,
    email
  );
  if (existingExternal) {
    const delivery = await respondWithInvite(
      request,
      { id: existingExternal.id },
      email,
      existingExternal.role,
      ownerOrganizationName,
      shipment.shipment_ref,
      true,
      "en",
      toShipmentCollaborator(existingExternal)
    );

    return { email, success: true, ...delivery };
  }

  const externalInvite = await createExternalInvite(admin, {
    shipmentId,
    organizationId: shipment.organization_id,
    invitedBy: userId,
    email,
    role,
    participantType,
  });

  const delivery = await respondWithInvite(
    request,
    { id: externalInvite.id },
    email,
    role,
    ownerOrganizationName,
    shipment.shipment_ref,
    true,
    "en",
    toShipmentCollaborator(externalInvite)
  );

  return { email, success: true, ...delivery };
}
