import type { SupabaseClient } from "@supabase/supabase-js";
import { formatNotificationMessage } from "@/lib/i18n/messages";
import { resolveEmailAppUrl } from "@/lib/app-url";
import {
  emailSubjectHeading,
  TRANSACTIONAL_EMAIL_FOOTER,
  TRANSACTIONAL_EMAIL_SIGNOFF,
} from "@/lib/notifications/email-copy";
import {
  buildTransactionalEmailHtml,
  paragraphsToEmailHtml,
} from "@/lib/notifications/invite-email-html";
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

function buildOwnerNotificationHtml(
  subject: string,
  body: string,
  link: string,
  linkLabel: string
): string {
  const paragraphs = body
    .split("\n\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("—"));

  return buildTransactionalEmailHtml({
    heading: emailSubjectHeading(subject),
    bodyHtml: paragraphsToEmailHtml(paragraphs),
    link,
    linkLabel,
    footer: TRANSACTIONAL_EMAIL_FOOTER,
  });
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
    linkLabel?: string;
  }
): Promise<number> {
  const recipients = await listOwnerOrgEmailRecipients(
    admin,
    params.organizationId,
    params.excludeUserId
  );

  if (recipients.length === 0) return 0;

  const link = `${resolveEmailAppUrl()}/shipments/${params.shipmentId}`;
  const linkLabel = params.linkLabel ?? "View shipment";
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

    const html = buildOwnerNotificationHtml(subject, body, link, linkLabel);

    const ok = await sendEmail({
      to: recipient.email,
      subject,
      text: body,
      html,
      category: "email_alerts",
      userId: recipient.id,
    });
    if (ok) sent++;
  }

  return sent;
}

export { TRANSACTIONAL_EMAIL_SIGNOFF };
