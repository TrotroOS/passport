import type { SupabaseClient } from "@supabase/supabase-js";
import { notifyOwnerOrgMembers } from "@/lib/collaboration/owner-org-notify";

export async function notifyCollaborationComment(
  admin: SupabaseClient,
  params: {
    organizationId: string;
    shipmentId: string;
    shipmentRef: string;
    commenterUserId: string;
    commenterName: string;
    commentPreview: string;
  }
): Promise<void> {
  const preview =
    params.commentPreview.length > 240
      ? `${params.commentPreview.slice(0, 237)}…`
      : params.commentPreview;

  try {
    await notifyOwnerOrgMembers(admin, {
      organizationId: params.organizationId,
      shipmentId: params.shipmentId,
      shipmentRef: params.shipmentRef,
      excludeUserId: params.commenterUserId,
      subjectKey: "collaborationCommentSubject",
      bodyKey: "collaborationCommentBody",
      linkLabel: "View conversation",
      bodyParams: {
        commenter: params.commenterName,
        comment: preview,
      },
    });
  } catch (err) {
    console.error("[Collaboration] Comment notification email failed:", err);
  }
}
