import { sendCollaborationInvite } from "@/lib/collaboration/notify-invite";
import {
  getExternalInviteById,
  type StoredExternalInvite,
} from "@/lib/collaboration/external-invite-store";
import { hasInviteeEmailColumn } from "@/lib/collaboration/schema-support";
import { getInvitationUrl, isEmailDeliveryConfigured } from "@/lib/app-url";
import type { SupabaseClient } from "@supabase/supabase-js";

export function getAppOriginFromRequest(request: Request): string | undefined {
  return request.headers.get("x-app-origin") ?? undefined;
}

export interface InviteDeliveryResult {
  email_sent: boolean;
  email_configured: boolean;
  invitation_url: string;
  email_error?: string;
}

export async function deliverCollaborationInvite(params: {
  recipientEmail: string;
  shipmentRef: string;
  ownerOrganizationName: string;
  role: string;
  invitationId: string;
  locale?: string;
  isExternal?: boolean;
  appOrigin?: string | null;
}): Promise<InviteDeliveryResult> {
  const invitationUrl = getInvitationUrl(params.invitationId, params.appOrigin);
  const emailConfigured = isEmailDeliveryConfigured();

  if (!emailConfigured) {
    return {
      email_sent: false,
      email_configured: false,
      invitation_url: invitationUrl,
    };
  }

  try {
    const emailSent = await sendCollaborationInvite(params);
    return {
      email_sent: emailSent,
      email_configured: true,
      invitation_url: invitationUrl,
    };
  } catch (err) {
    const emailError = err instanceof Error ? err.message : "Email delivery failed";
    console.error("[Collaboration] Invite email failed:", err);
    return {
      email_sent: false,
      email_configured: true,
      invitation_url: invitationUrl,
      email_error: emailError,
    };
  }
}

export async function resolveInviteForResend(
  admin: SupabaseClient,
  shipmentId: string,
  invitationId: string
): Promise<
  | {
      kind: "collaborator";
      recipientEmail: string;
      role: string;
      locale: string;
      isExternal: boolean;
    }
  | {
      kind: "external";
      invite: StoredExternalInvite;
    }
  | null
> {
  const supportsInviteeEmail = await hasInviteeEmailColumn(admin);

  type CollaboratorRow = {
    id: string;
    shipment_id: string;
    role: string;
    status: string;
    user_id: string | null;
    invitee_email?: string | null;
    users: { email: string; preferred_language: string | null } | null;
  };

  const { data: collaboratorData } = supportsInviteeEmail
    ? await admin
        .from("shipment_collaborators")
        .select(
          "id, shipment_id, role, status, user_id, invitee_email, users(email, preferred_language)"
        )
        .eq("id", invitationId)
        .eq("shipment_id", shipmentId)
        .maybeSingle()
    : await admin
        .from("shipment_collaborators")
        .select("id, shipment_id, role, status, user_id, users(email, preferred_language)")
        .eq("id", invitationId)
        .eq("shipment_id", shipmentId)
        .maybeSingle();

  const collaborator = collaboratorData as CollaboratorRow | null;

  if (collaborator) {
    if (collaborator.status !== "pending") return null;

    const user = collaborator.users as
      | { email: string; preferred_language: string | null }
      | null
      | undefined;
    const recipientEmail =
      user?.email ??
      ("invitee_email" in collaborator
        ? (collaborator.invitee_email as string | null)
        : null);
    if (!recipientEmail) return null;

    return {
      kind: "collaborator",
      recipientEmail,
      role: collaborator.role,
      locale: user?.preferred_language ?? "en",
      isExternal: !collaborator.user_id,
    };
  }

  const externalInvite = await getExternalInviteById(admin, invitationId);
  if (!externalInvite || externalInvite.shipment_id !== shipmentId) return null;
  if (externalInvite.status !== "pending") return null;

  return { kind: "external", invite: externalInvite };
}
