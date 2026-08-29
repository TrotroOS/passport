import type { SupabaseClient } from "@supabase/supabase-js";
import { formatNotificationMessage } from "@/lib/i18n/messages";
import { resolveEmailAppUrl } from "@/lib/app-url";
import { sendEmail } from "@/lib/notifications/email";

export interface OwnerOrgRecipient {
  id: string;
  email: string;
  preferred_language: string | null;
}

export async function listOwnerOrgEmailRecipients(
  admin: SupabaseClient,
  organizationId: string,
  excludeUserId?: string | null
): Promise<OwnerOrgRecipient[]> {
  const { data: users } = await admin
    .from("users")
    .select("id, email, preferred_language")
    .eq("organization_id", organizationId)
    .not("email", "is", null);

  return (users ?? []).filter(
    (user): user is OwnerOrgRecipient =>
      Boolean(user.email) && user.id !== excludeUserId
  );
}

export async function notifyOwnerOrgMembers(
  admin: SupabaseClient,
  params: {
    organizationId: string;
    shipmentId: string;
    shipmentRef: string;
    excludeUserId?: string | null;
    subjectKey: "invitationViewedSubject" | "collaborationCommentSubject";
    bodyKey: "invitationViewedBody" | "collaborationCommentBody";
    bodyParams: Record<string, string>;
  }
): Promise<number> {
  const recipients = await listOwnerOrgEmailRecipients(
    admin,
    params.organizationId,
    params.excludeUserId
  );

  if (recipients.length === 0) return 0;

  const link = `${resolveEmailAppUrl()}/shipments/${params.shipmentId}`;
  let sent = 0;

  for (const recipient of recipients) {
    const locale = recipient.preferred_language ?? "en";
    const subject = formatNotificationMessage(locale, params.subjectKey, {
      shipmentRef: params.shipmentRef,
      ...params.bodyParams,
    });
    const body = formatNotificationMessage(locale, params.bodyKey, {
      shipmentRef: params.shipmentRef,
      link,
      ...params.bodyParams,
    });

    const ok = await sendEmail({
      to: recipient.email,
      subject,
      text: body,
      category: "email_alerts",
      userId: recipient.id,
    });
    if (ok) sent++;
  }

  return sent;
}
