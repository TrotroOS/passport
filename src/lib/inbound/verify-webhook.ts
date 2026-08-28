import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest } from "next/server";

export function verifyInboundEmailSecret(request: NextRequest): boolean {
  const secret = process.env.INBOUND_EMAIL_SECRET;
  if (!secret) {
    // Dev mode: allow without secret if explicitly enabled
    return process.env.INBOUND_ALLOW_UNVERIFIED === "true";
  }
  const header =
    request.headers.get("x-passport-inbound-secret") ??
    request.headers.get("x-inbound-secret");
  if (!header) return false;
  try {
    return timingSafeEqual(Buffer.from(header), Buffer.from(secret));
  } catch {
    return header === secret;
  }
}

/** Verify Twilio request signature (https://www.twilio.com/docs/usage/security) */
export function verifyTwilioSignature(
  request: NextRequest,
  params: Record<string, string>,
  signature: string | null
): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    return process.env.INBOUND_ALLOW_UNVERIFIED === "true";
  }
  if (!signature) return false;

  const url =
    process.env.TWILIO_WEBHOOK_URL ??
    `${process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "")}/api/inbound/whatsapp`;

  const sortedKeys = Object.keys(params).sort();
  let data = url;
  for (const key of sortedKeys) {
    data += key + params[key];
  }

  const expected = createHmac("sha1", authToken).update(data).digest("base64");

  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return expected === signature;
  }
}
