import { createAdminClient } from "@/lib/supabase/admin";
import {
  findExternalInvitesForEmail,
  getExternalInviteById,
} from "@/lib/collaboration/external-invite-store";
import { hasInviteeEmailColumn } from "@/lib/collaboration/schema-support";

/** Attach pending email invitations to a user after signup or login. */
export async function linkPendingInvitationsForUser(
  userId: string,
  email: string
): Promise<number> {
  const admin = createAdminClient();
  const normalizedEmail = email.trim().toLowerCase();

  const { data: profile } = await admin
    .from("users")
    .select("organization_id, email")
    .eq("id", userId)
    .maybeSingle();

  if (!profile?.organization_id) return 0;

  let linked = 0;

  if (await hasInviteeEmailColumn(admin)) {
    const { data: updated, error } = await admin
      .from("shipment_collaborators")
      .update({
        user_id: userId,
        organization_id: profile.organization_id,
        invitee_email: normalizedEmail,
        updated_at: new Date().toISOString(),
      })
      .is("user_id", null)
      .eq("status", "pending")
      .ilike("invitee_email", normalizedEmail)
      .select("id");

    if (error) {
      console.warn("[Collaboration] link pending invitations failed:", error.message);
    } else {
      linked += updated?.length ?? 0;
    }
  }

  // External invites stored in audit_events do not need linking until accept.
  const externalPending = await findExternalInvitesForEmail(admin, normalizedEmail);
  linked += externalPending.length;

  return linked;
}

export async function getInvitationForUser(
  invitationId: string,
  userId: string,
  userEmail: string
) {
  const admin = createAdminClient();
  await linkPendingInvitationsForUser(userId, userEmail);

  const { data: byUser } = await admin
    .from("shipment_collaborators")
    .select("*")
    .eq("id", invitationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (byUser) return byUser;

  if (await hasInviteeEmailColumn(admin)) {
    const { data: byEmail } = await admin
      .from("shipment_collaborators")
      .select("*")
      .eq("id", invitationId)
      .eq("status", "pending")
      .ilike("invitee_email", userEmail.trim().toLowerCase())
      .maybeSingle();

    if (byEmail) return byEmail;
  }

  const externalInvite = await getExternalInviteById(admin, invitationId);
  if (
    externalInvite &&
    externalInvite.invitee_email === userEmail.trim().toLowerCase()
  ) {
    return {
      id: externalInvite.id,
      shipment_id: externalInvite.shipment_id,
      organization_id: externalInvite.organization_id,
      user_id: null,
      invitee_email: externalInvite.invitee_email,
      role: externalInvite.role,
      status: externalInvite.status,
      invited_by: externalInvite.invited_by,
      invited_at: externalInvite.invited_at,
      accepted_at: null,
      revoked_at: null,
      created_at: externalInvite.invited_at,
      updated_at: externalInvite.invited_at,
      _external: true,
    };
  }

  return null;
}

export function isSafeRedirectPath(path: string | null | undefined): path is string {
  if (!path) return false;
  return path.startsWith("/") && !path.startsWith("//");
}
