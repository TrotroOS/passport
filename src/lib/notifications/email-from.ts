const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

export interface EmailFromAddress {
  email: string;
  name: string;
}

function firstEmailIn(value: string | undefined | null): string | null {
  const match = value?.match(EMAIL_RE);
  return match ? match[0] : null;
}

function displayNameFrom(raw: string, fallback: string): string {
  const withoutAngle = raw.replace(/<[^>]*>/g, "").replace(/^["']|["']$/g, "").trim();
  return withoutAngle || fallback;
}

/**
 * SendGrid requires a verified from address. Prefer SENDGRID_FROM_EMAIL
 * (no angle brackets, so Windows/Vercel CLI cannot strip it) then parse
 * INBOUND_EMAIL_FROM even if the display-name brackets were eaten.
 */
export function resolveSendgridFromAddress(): EmailFromAddress {
  const fallbackName = process.env.SENDGRID_FROM_NAME?.trim() || "Seadell";
  const dedicated = firstEmailIn(process.env.SENDGRID_FROM_EMAIL);

  if (dedicated) {
    return { email: dedicated, name: fallbackName };
  }

  const inbound = process.env.INBOUND_EMAIL_FROM?.trim() ?? "";
  const inboundEmail = firstEmailIn(inbound);
  if (inboundEmail) {
    return {
      email: inboundEmail,
      name: displayNameFrom(inbound, fallbackName),
    };
  }

  throw new Error(
    "No valid SendGrid from address. Set SENDGRID_FROM_EMAIL to a verified sender (for example you@gmail.com)."
  );
}
