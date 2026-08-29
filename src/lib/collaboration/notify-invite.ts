import { formatNotificationMessage } from "@/lib/i18n/messages";
import { getInvitationUrl } from "@/lib/app-url";
import {
  emailSubjectHeading,
  formatCollaboratorRoleForEmail,
  TRANSACTIONAL_EMAIL_FOOTER,
} from "@/lib/notifications/email-copy";
import {
  buildInviteEmailBodyHtml,
  buildTransactionalEmailHtml,
} from "@/lib/notifications/invite-email-html";
import { sendEmail } from "@/lib/notifications/email";

export interface CollaborationInvitePayload {
  recipientEmail: string;
  shipmentRef: string;
  ownerOrganizationName: string;
  role: string;
  invitationId: string;
  locale?: string;
  isExternal?: boolean;
  appOrigin?: string | null;
}

export async function sendCollaborationInvite(
  payload: CollaborationInvitePayload
): Promise<boolean> {
  const locale = payload.locale ?? "en";
  const link = getInvitationUrl(payload.invitationId, payload.appOrigin);
  const roleLabel = formatCollaboratorRoleForEmail(payload.role);
  const subject = formatNotificationMessage(locale, "collaborationInviteSubject", {
    shipmentRef: payload.shipmentRef,
  });
  const bodyKey = payload.isExternal
    ? "collaborationInviteExternalBody"
    : "collaborationInviteBody";
  const body = formatNotificationMessage(locale, bodyKey, {
    shipmentRef: payload.shipmentRef,
    orgName: payload.ownerOrganizationName,
    role: roleLabel,
    link,
  });

  const html = buildTransactionalEmailHtml({
    heading: emailSubjectHeading(subject),
    bodyHtml: buildInviteEmailBodyHtml({
      shipmentRef: payload.shipmentRef,
      orgName: payload.ownerOrganizationName,
      role: roleLabel,
      isExternal: Boolean(payload.isExternal),
    }),
    link,
    linkLabel: payload.isExternal ? "Accept invitation" : "Review invitation",
    footer: TRANSACTIONAL_EMAIL_FOOTER,
  });

  return sendEmail({
    to: payload.recipientEmail,
    subject,
    text: body,
    html,
  });
}
