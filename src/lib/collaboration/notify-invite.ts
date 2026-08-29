import { formatNotificationMessage } from "@/lib/i18n/messages";
import { getInvitationUrl } from "@/lib/app-url";
import {
  buildInviteEmailBodyHtml,
  buildInviteEmailHtml,
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
  const subject = formatNotificationMessage(locale, "collaborationInviteSubject", {
    shipmentRef: payload.shipmentRef,
  });
  const bodyKey = payload.isExternal
    ? "collaborationInviteExternalBody"
    : "collaborationInviteBody";
  const body = formatNotificationMessage(locale, bodyKey, {
    shipmentRef: payload.shipmentRef,
    orgName: payload.ownerOrganizationName,
    role: payload.role,
    link,
  });

  const html = buildInviteEmailHtml({
    heading: subject.replace(/^Passport:\s*/i, ""),
    bodyHtml: buildInviteEmailBodyHtml({
      shipmentRef: payload.shipmentRef,
      orgName: payload.ownerOrganizationName,
      role: payload.role,
      isExternal: Boolean(payload.isExternal),
    }),
    link,
    linkLabel: payload.isExternal ? "Create account & accept" : "Review invitation",
    footer:
      "Passport provides assistive trade compliance tools — not legal or customs clearance advice.",
  });

  return sendEmail({
    to: payload.recipientEmail,
    subject,
    text: body,
    html,
  });
}
