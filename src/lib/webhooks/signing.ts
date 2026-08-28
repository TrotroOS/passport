import { createHmac, randomBytes, timingSafeEqual } from "crypto";

export interface WebhookSignatureHeaders {
  signature: string;
  timestamp: string;
  nonce: string;
}

const REPLAY_WINDOW_MS = 5 * 60 * 1000;

export function generateWebhookNonce(): string {
  return randomBytes(16).toString("hex");
}

export function signWebhookPayload(
  payload: string,
  secret: string,
  timestamp: string,
  nonce: string
): string {
  const signedContent = `${timestamp}.${nonce}.${payload}`;
  return createHmac("sha256", secret).update(signedContent).digest("hex");
}

export function buildWebhookHeaders(
  payload: string,
  secret: string
): WebhookSignatureHeaders & { eventType?: string } {
  const timestamp = new Date().toISOString();
  const nonce = generateWebhookNonce();
  const signature = signWebhookPayload(payload, secret, timestamp, nonce);

  return { signature, timestamp, nonce };
}

export function verifyWebhookSignature(
  payload: string,
  secret: string,
  headers: {
    signature: string;
    timestamp: string;
    nonce: string;
  }
): { valid: boolean; reason?: string } {
  const ts = new Date(headers.timestamp).getTime();
  if (Number.isNaN(ts)) {
    return { valid: false, reason: "Invalid timestamp" };
  }

  const age = Math.abs(Date.now() - ts);
  if (age > REPLAY_WINDOW_MS) {
    return { valid: false, reason: "Timestamp outside replay window" };
  }

  const expected = signWebhookPayload(
    payload,
    secret,
    headers.timestamp,
    headers.nonce
  );

  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(headers.signature, "hex");
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return { valid: false, reason: "Signature mismatch" };
    }
  } catch {
    return { valid: false, reason: "Invalid signature format" };
  }

  return { valid: true };
}
