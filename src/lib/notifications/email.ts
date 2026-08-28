import { createAdminClient } from "@/lib/supabase/admin";
import {
  shouldSendNotification,
  type NotificationChannel,
} from "@/lib/notifications/preferences";

export interface SendEmailParams {
  to: string;
  subject: string;
  text: string;
  html?: string;
  category?: NotificationChannel;
  userId?: string;
}

function parseFromAddress(): { email: string; name: string } {
  const from = process.env.INBOUND_EMAIL_FROM ?? "Passport <noreply@passport.trade>";
  const match = from.match(/^(.+?)\s*<([^>]+)>$/);
  if (match) {
    return { name: match[1].trim(), email: match[2].trim() };
  }
  return { name: "Passport", email: from };
}

async function isEmailAllowed(params: SendEmailParams): Promise<boolean> {
  if (!params.category || !params.userId) return true;

  const admin = createAdminClient();
  const { data: user } = await admin
    .from("users")
    .select("notification_preferences")
    .eq("id", params.userId)
    .maybeSingle();

  return shouldSendNotification(
    user?.notification_preferences as Record<string, boolean> | null,
    params.category
  );
}

export async function sendEmail(params: SendEmailParams): Promise<boolean> {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    console.info("[Email] Skipped (SENDGRID_API_KEY not set)", {
      to: params.to,
      subject: params.subject,
    });
    return false;
  }

  if (!(await isEmailAllowed(params))) {
    console.info("[Email] Skipped by user notification preferences", {
      to: params.to,
      category: params.category,
    });
    return false;
  }

  const from = parseFromAddress();
  const html = params.html ?? params.text.replace(/\n/g, "<br>");

  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: params.to }] }],
      from,
      subject: params.subject,
      content: [
        { type: "text/plain", value: params.text },
        { type: "text/html", value: html },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`SendGrid error: ${response.status} ${text}`);
  }

  return true;
}
