import { formatNotificationMessage } from "@/lib/i18n/messages";
import { getInvitationUrl } from "@/lib/app-url";
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

  return sendEmail({
    to: payload.recipientEmail,
    subject,
    text: body,
  });
}
