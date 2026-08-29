import { getAppUrl } from "@/lib/app-url";
import { getSupabaseUrl } from "@/lib/supabase/env";

const DEFAULT_POST_AUTH_PATH = "/dashboard";

/** Supabase Auth callback URL registered in Google Cloud / Apple Developer. */
export function getSupabaseAuthCallbackUrl(): string {
  const supabaseUrl = getSupabaseUrl().replace(/\/$/, "");
  if (!supabaseUrl) {
    throw new Error("SUPABASE_URL is not configured");
  }
  return `${supabaseUrl}/auth/v1/callback`;
}

/** Passport app callback after Supabase completes OAuth / email confirm. */
export function getAppAuthCallbackUrl(next: string = DEFAULT_POST_AUTH_PATH): string {
  return `${getAppUrl()}/auth/callback?next=${encodeURIComponent(next)}`;
}

export function isOAuthConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_OAUTH_CLIENT_ID?.trim() &&
      process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim()
  );
}

export function isAppleOAuthConfigured(): boolean {
  return Boolean(
    process.env.APPLE_OAUTH_CLIENT_ID?.trim() &&
      (process.env.APPLE_OAUTH_CLIENT_SECRET?.trim() ||
        (process.env.APPLE_OAUTH_KEY_ID?.trim() &&
          process.env.APPLE_OAUTH_TEAM_ID?.trim() &&
          process.env.APPLE_OAUTH_PRIVATE_KEY?.trim()))
  );
}
