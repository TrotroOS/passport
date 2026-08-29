import {
  formatNotificationMessage,
  translateEventType,
} from "@/lib/i18n/messages";
import { resolveEmailAppUrl } from "@/lib/app-url";
import {
  emailSubjectHeading,
  TRANSACTIONAL_EMAIL_FOOTER,
} from "@/lib/notifications/email-copy";
import {
  buildTransactionalEmailHtml,
  paragraphsToEmailHtml,
} from "@/lib/notifications/invite-email-html";
import { sendEmail } from "@/lib/notifications/email";

export interface TrackingNotificationPayload {
  recipientEmail: string;
  shipmentRef: string;
  eventType: string;
  eventDescription: string;
  eventLocation?: string | null;
  eventDate?: string | null;
  shipmentId: string;
  locale?: string;
  userId?: string;
}

export async function sendTrackingEventNotification(
  payload: TrackingNotificationPayload
): Promise<void> {
  const locale = payload.locale ?? "en";

  const link = `${resolveEmailAppUrl()}/shipments/${payload.shipmentId}`;
  const localizedEventType = translateEventType(locale, payload.eventType);
  const subject = formatNotificationMessage(locale, "trackingUpdateSubject", {
    shipmentRef: payload.shipmentRef,
  });
  const body = formatNotificationMessage(locale, "trackingUpdateBody", {
    shipmentRef: payload.shipmentRef,
    eventType: localizedEventType,
    description: payload.eventDescription,
    location: payload.eventLocation ? `Location: ${payload.eventLocation}` : "",
    date: payload.eventDate ? `Date: ${payload.eventDate}` : "",
    link,
  });

  const paragraphs = body
    .split("\n\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("—"));

  const html = buildTransactionalEmailHtml({
    heading: emailSubjectHeading(subject),
    bodyHtml: paragraphsToEmailHtml(paragraphs),
    link,
    linkLabel: "View shipment",
    footer: TRANSACTIONAL_EMAIL_FOOTER,
  });

  await sendEmail({
    to: payload.recipientEmail,
    subject,
    text: body,
    html,
    category: "tracking_updates",
    userId: payload.userId,
  });
}

export async function sendTrackingWhatsAppNotification(
  phone: string,
  message: string
): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;

  if (!accountSid || !authToken || !from) {
    console.info("[Tracking] WhatsApp skipped (Twilio not configured)", {
      event: "tracking_notification",
    });
    return;
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const body = new URLSearchParams({
    From: from,
    To: phone.startsWith("whatsapp:") ? phone : `whatsapp:${phone}`,
    Body: message,
  });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Twilio error: ${response.status} ${text}`);
  }
}

export function buildTrackingWhatsAppMessage(
  locale: string,
  shipmentRef: string,
  eventType: string,
  description: string
): string {
  return formatNotificationMessage(locale, "trackingWhatsApp", {
    shipmentRef,
    eventType: translateEventType(locale, eventType),
    description,
  });
}
