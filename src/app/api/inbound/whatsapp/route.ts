import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit/rate-limit";
import { normalizePhoneE164 } from "@/lib/inbound/normalize";
import { processInboundMessage } from "@/lib/inbound/process-inbound";
import { findUserByPhone } from "@/lib/inbound/user-lookup";
import { verifyTwilioSignature } from "@/lib/inbound/verify-webhook";
import {
  parseTwilioNumMedia,
  twilioInboundSchema,
} from "@/lib/inbound/validations";
import { ApiError } from "@/lib/errors/api-error";

export const runtime = "nodejs";

/** Twilio webhook verification (optional GET challenge). */
export async function GET() {
  return NextResponse.json({ status: "ok", service: "passport-inbound-whatsapp" });
}

/** Twilio WhatsApp inbound messages. */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const params = Object.fromEntries(new URLSearchParams(rawBody));
  const signature = request.headers.get("x-twilio-signature");

  if (!verifyTwilioSignature(request, params, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  const parsed = twilioInboundSchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const fromRaw = parsed.data.From;
  const senderPhone = normalizePhoneE164(fromRaw);

  try {
    await checkRateLimit(`inbound:whatsapp:${senderPhone}`, "inbound_message");
  } catch (err) {
    if (err instanceof ApiError) {
      return new NextResponse("<Response></Response>", {
        status: 429,
        headers: { "Content-Type": "text/xml" },
      });
    }
    throw err;
  }

  const numMedia = parseTwilioNumMedia(parsed.data.NumMedia);
  const attachments: { fileName: string; mimeType?: string; buffer: Buffer }[] =
    [];

  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;

  for (let i = 0; i < numMedia; i++) {
    const mediaUrl = params[`MediaUrl${i}`];
    const mediaType = params[`MediaContentType${i}`];
    if (!mediaUrl || !sid || !token) continue;

    try {
      const mediaRes = await fetch(mediaUrl, {
        headers: {
          Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
        },
      });
      if (!mediaRes.ok) continue;
      const buffer = Buffer.from(await mediaRes.arrayBuffer());
      const ext = extensionFromMime(mediaType);
      attachments.push({
        fileName: `whatsapp-media-${i + 1}${ext}`,
        mimeType: mediaType,
        buffer,
      });
    } catch (err) {
      console.error("[Inbound/whatsapp] Media download failed:", err);
    }
  }

  const identifiedUser = await findUserByPhone(senderPhone);

  processInboundMessage({
    channel: "whatsapp",
    senderAddress: fromRaw.startsWith("whatsapp:") ? fromRaw : `whatsapp:${senderPhone}`,
    bodyText: parsed.data.Body ?? "",
    attachments,
    identifiedUser,
  }).catch((err) => console.error("[Inbound/whatsapp] Processing failed:", err));

  return new NextResponse("<Response></Response>", {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}

function extensionFromMime(mime?: string): string {
  if (!mime) return "";
  if (mime.includes("pdf")) return ".pdf";
  if (mime.includes("png")) return ".png";
  if (mime.includes("jpeg") || mime.includes("jpg")) return ".jpg";
  if (mime.includes("spreadsheet")) return ".xlsx";
  if (mime.includes("word")) return ".docx";
  return "";
}
