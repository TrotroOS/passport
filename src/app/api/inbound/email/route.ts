import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit/rate-limit";
import { parseEmailAddress } from "@/lib/inbound/normalize";
import { processInboundMessage } from "@/lib/inbound/process-inbound";
import { findUserByEmail } from "@/lib/inbound/user-lookup";
import { verifyInboundEmailSecret } from "@/lib/inbound/verify-webhook";
import { sendGridInboundFieldSchema } from "@/lib/inbound/validations";
import { ApiError } from "@/lib/errors/api-error";

export const runtime = "nodejs";

/**
 * SendGrid Inbound Parse webhook (multipart/form-data).
 * Configure SendGrid to POST parsed emails here with header x-passport-inbound-secret.
 */
export async function POST(request: NextRequest) {
  if (!verifyInboundEmailSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const fields = {
    from: String(formData.get("from") ?? formData.get("sender") ?? ""),
    subject: String(formData.get("subject") ?? ""),
    text: String(formData.get("text") ?? formData.get("plain") ?? ""),
    html: String(formData.get("html") ?? ""),
    to: String(formData.get("to") ?? ""),
  };

  const parsed = sendGridInboundFieldSchema.safeParse(fields);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const senderEmail = parseEmailAddress(parsed.data.from);

  try {
    await checkRateLimit(`inbound:email:${senderEmail}`, "inbound_message");
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    throw err;
  }

  const attachments: { fileName: string; mimeType?: string; buffer: Buffer }[] =
    [];

  for (let i = 1; i <= 10; i++) {
    const entry = formData.get(`attachment${i}`);
    if (entry instanceof File) {
      attachments.push({
        fileName: entry.name || `attachment-${i}`,
        mimeType: entry.type,
        buffer: Buffer.from(await entry.arrayBuffer()),
      });
    }
  }

  const rawAttachment = formData.get("attachment");
  if (rawAttachment instanceof File) {
    attachments.push({
      fileName: rawAttachment.name || "attachment",
      mimeType: rawAttachment.type,
      buffer: Buffer.from(await rawAttachment.arrayBuffer()),
    });
  }

  const identifiedUser = await findUserByEmail(senderEmail);

  // Process asynchronously after quick 200 — fire and forget for heavy work
  const bodyText = parsed.data.text || stripHtml(parsed.data.html ?? "");

  processInboundMessage({
    channel: "email",
    senderAddress: senderEmail,
    subject: parsed.data.subject,
    bodyText,
    attachments,
    identifiedUser,
  }).catch((err) => console.error("[Inbound/email] Processing failed:", err));

  return NextResponse.json({ received: true });
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
