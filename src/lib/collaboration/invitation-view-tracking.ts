import type { SupabaseClient } from "@supabase/supabase-js";
import { writeAuditEvent } from "@/lib/audit";
import { notifyOwnerOrgMembers } from "@/lib/collaboration/owner-org-notify";

export interface InvitationViewContext {
  invitationId: string;
  shipmentId: string;
  organizationId: string;
  shipmentRef: string;
  viewerUserId?: string | null;
  viewerLabel?: string | null;
  inviteeEmail?: string | null;
}

export async function hasInvitationViewBeenRecorded(
  admin: SupabaseClient,
  invitationId: string
): Promise<boolean> {
  const { data } = await admin
    .from("audit_events")
    .select("id")
    .eq("action", "collaborator.invitation_viewed")
    .eq("entity_id", invitationId)
    .limit(1)
    .maybeSingle();

  return Boolean(data);
}

/** Record first invitation link view and notify the shipment owner org (once per invite). */
export async function recordInvitationViewed(
  admin: SupabaseClient,
  context: InvitationViewContext
): Promise<{ recorded: boolean }> {
  if (await hasInvitationViewBeenRecorded(admin, context.invitationId)) {
    return { recorded: false };
  }

  await writeAuditEvent(admin, {
    organizationId: context.organizationId,
    userId: context.viewerUserId ?? undefined,
    action: "collaborator.invitation_viewed",
    entityType: "invitation",
    entityId: context.invitationId,
    shipmentId: context.shipmentId,
    metadata: {
      viewer_label: context.viewerLabel ?? null,
      invitee_email: context.inviteeEmail ?? null,
    },
  });

  const viewerLabel =
    context.viewerLabel ??
    context.inviteeEmail ??
    "Someone";

  try {
    await notifyOwnerOrgMembers(admin, {
      organizationId: context.organizationId,
      shipmentId: context.shipmentId,
      shipmentRef: context.shipmentRef,
      excludeUserId: context.viewerUserId ?? null,
      subjectKey: "invitationViewedSubject",
      bodyKey: "invitationViewedBody",
      bodyParams: { viewer: viewerLabel },
    });
  } catch (err) {
    console.error("[Collaboration] Invitation viewed email failed:", err);
  }

  return { recorded: true };
}
