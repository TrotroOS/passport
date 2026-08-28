import { isProduction } from "@/lib/env";

/** Canonical public app URL for links in emails, invites, and API docs. */
export function getAppUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (url) return url;
  if (isProduction()) {
    throw new Error("NEXT_PUBLIC_APP_URL is required in production");
  }
  return "http://localhost:3000";
}

export function getInvitationUrl(invitationId: string, origin?: string | null): string {
  const base = (origin ?? getAppUrl()).replace(/\/$/, "");
  return `${base}/invitations/${invitationId}`;
}

export function isEmailDeliveryConfigured(): boolean {
  return Boolean(process.env.SENDGRID_API_KEY);
}
