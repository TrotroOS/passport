import { isProduction } from "@/lib/env";

function normalizeUrl(url: string): string {
  return url.replace(/\/$/, "");
}

export function isLocalhostAppUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "[::1]"
    );
  } catch {
    return false;
  }
}

/** Canonical public app URL for links in emails, invites, and API docs. */
export function getAppUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (url) return url;
  if (isProduction()) {
    throw new Error("NEXT_PUBLIC_APP_URL is required in production");
  }
  return "http://localhost:3000";
}

/**
 * Base URL for links inside outbound email (invites, tracking, inbound replies).
 * Never uses localhost — recipients on phones cannot reach your dev machine.
 */
export function resolveEmailAppUrl(requestOrigin?: string | null): string {
  const emailOverride = process.env.EMAIL_PUBLIC_APP_URL?.trim();
  if (emailOverride && !isLocalhostAppUrl(emailOverride)) {
    return normalizeUrl(emailOverride);
  }

  const configured = getAppUrl();
  if (!isLocalhostAppUrl(configured)) {
    return configured;
  }

  if (requestOrigin?.trim() && !isLocalhostAppUrl(requestOrigin)) {
    return normalizeUrl(requestOrigin);
  }

  return configured;
}

export function getInvitationUrl(invitationId: string, origin?: string | null): string {
  const base = resolveEmailAppUrl(origin);
  return `${base}/invitations/${invitationId}`;
}

export function isEmailDeliveryConfigured(): boolean {
  return Boolean(process.env.SENDGRID_API_KEY);
}
