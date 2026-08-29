import { getInboundConfig } from "@/lib/inbound/config";
import { resolveEmailAppUrl } from "@/lib/app-url";
import {
  emailSubjectHeading,
  TRANSACTIONAL_EMAIL_FOOTER,
} from "@/lib/notifications/email-copy";
import {
  buildTransactionalEmailHtml,
  paragraphsToEmailHtml,
} from "@/lib/notifications/invite-email-html";

export interface InboundResponsePayload {
  channel: "email" | "whatsapp";
  recipient: string;
  shipmentRef: string;
  shipmentId: string;
  documentCount: number;
  shipmentCreated: boolean;
  processingNote?: string;
}

function dashboardUrl(shipmentId: string): string {
  return `${resolveEmailAppUrl()}/shipments/${shipmentId}`;
}

export async function sendInboundResponse(
  payload: InboundResponsePayload
): Promise<void> {
  if (payload.channel === "email") {
    await sendEmailResponse(payload);
  } else {
    await sendWhatsAppResponse(payload);
  }
}

async function sendEmailResponse(payload: InboundResponsePayload): Promise<void> {
  const apiKey = process.env.SENDGRID_API_KEY;
  const from =
    process.env.INBOUND_EMAIL_FROM ??
    `Passport <noreply@${getInboundConfig().inboundEmailDomain}>`;

  const link = dashboardUrl(payload.shipmentId);
  const subject = `Passport — Documents received for ${payload.shipmentRef}`;
  const body = buildEmailBody(payload, link);
  const html = buildInboundEmailHtml(subject, body, link);

  if (!apiKey) {
    console.info("[Inbound] Email response skipped (SENDGRID_API_KEY not set)", {
      shipmentId: payload.shipmentId,
      shipmentRef: payload.shipmentRef,
    });
    return;
  }

  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: payload.recipient }] }],
      from: { email: parseFromEmail(from), name: parseFromName(from) },
      subject,
      content: [
        { type: "text/plain", value: body },
        { type: "text/html", value: html },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`SendGrid error: ${response.status} ${text}`);
  }
}

async function sendWhatsAppResponse(payload: InboundResponsePayload): Promise<void> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM ?? getInboundConfig().whatsappNumber;

  const link = dashboardUrl(payload.shipmentId);
  const text = buildWhatsAppBody(payload, link);

  if (!sid || !token) {
    console.info("[Inbound] WhatsApp response skipped (Twilio not configured)", {
      shipmentId: payload.shipmentId,
      shipmentRef: payload.shipmentRef,
    });
    return;
  }

  const to = payload.recipient.startsWith("whatsapp:")
    ? payload.recipient
    : `whatsapp:${payload.recipient}`;

  const form = new URLSearchParams({
    To: to,
    From: from.startsWith("whatsapp:") ? from : `whatsapp:${from}`,
    Body: text,
  });

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Twilio error: ${response.status} ${text}`);
  }
}

export async function sendUnknownSenderReply(
  channel: "email" | "whatsapp",
  recipient: string
): Promise<void> {
  const signupUrl = resolveEmailAppUrl();

  if (channel === "email") {
    const apiKey = process.env.SENDGRID_API_KEY;
    const from =
      process.env.INBOUND_EMAIL_FROM ??
      `Passport <noreply@${getInboundConfig().inboundEmailDomain}>`;
    const subject = "Passport — Account not found";
    const body = [
      "Hello,",
      "",
      "We received your email but could not match the sender address to a Passport account.",
      "",
      `To submit trade documents by email, please register at ${signupUrl}/signup and forward messages from your registered email address.`,
      "",
      "If you believe this is an error, please contact your organization administrator.",
      "",
      "— Passport Trade Compliance",
    ].join("\n");
    const html = buildInboundEmailHtml(subject, body);

    if (!apiKey) {
      console.info("[Inbound] Unknown sender email skipped (SENDGRID_API_KEY not set)");
      return;
    }

    await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: recipient }] }],
        from: { email: parseFromEmail(from), name: parseFromName(from) },
        subject,
        content: [
          { type: "text/plain", value: body },
          { type: "text/html", value: html },
        ],
      }),
    });
    return;
  }

  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;
  const text = `We couldn't find a Passport account linked to this number. Sign up at ${signupUrl}/signup and add your phone in settings.`;

  if (!sid || !token || !from) {
    console.info("[Inbound] Unknown sender WhatsApp reply skipped (Twilio not configured)");
    return;
  }

  const form = new URLSearchParams({
    To: recipient.startsWith("whatsapp:") ? recipient : `whatsapp:${recipient}`,
    From: from.startsWith("whatsapp:") ? from : `whatsapp:${from}`,
    Body: text,
  });

  await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });
}

function buildEmailBody(payload: InboundResponsePayload, link: string): string {
  if (payload.documentCount === 0 && payload.processingNote) {
    return payload.processingNote;
  }

  const paragraphs = [
    "Hello,",
    `We have received ${payload.documentCount} document(s) for shipment ${payload.shipmentRef}.`,
    payload.shipmentCreated
      ? "A new draft shipment was created because no matching reference was found in your account."
      : null,
    "Your documents are now queued for processing. We will notify you when extraction and verification are complete.",
    `View shipment details: ${link}`,
    payload.processingNote?.trim() || null,
  ].filter(Boolean) as string[];

  return `${paragraphs.join("\n\n")}\n\n— Passport Trade Compliance`;
}

function buildInboundEmailHtml(subject: string, body: string, link?: string): string {
  const paragraphs = body
    .split("\n\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("—"));

  return buildTransactionalEmailHtml({
    heading: emailSubjectHeading(subject),
    bodyHtml: paragraphsToEmailHtml(paragraphs),
    link,
    linkLabel: link ? "View shipment" : undefined,
    footer: TRANSACTIONAL_EMAIL_FOOTER,
  });
}

function buildWhatsAppBody(payload: InboundResponsePayload, link: string): string {
  if (payload.documentCount === 0 && payload.processingNote) {
    return payload.processingNote;
  }

  const createdNote = payload.shipmentCreated ? " (new draft shipment created)" : "";
  return `Received ${payload.documentCount} document(s) for ${payload.shipmentRef}${createdNote}. Processing. View: ${link}`;
}

function parseFromEmail(from: string): string {
  const match = from.match(/<([^>]+)>/);
  return match?.[1] ?? from;
}

function parseFromName(from: string): string {
  const match = from.match(/^([^<]+)</);
  return match?.[1]?.trim() ?? "Passport";
}
