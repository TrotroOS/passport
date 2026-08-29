import { getAppUrl } from "@/lib/app-url";
import { isSafeRedirectPath } from "@/lib/collaboration/link-pending-invitations";

const DEFAULT_POST_AUTH_PATH = "/dashboard";

export function getAuthCallbackUrl(next?: string | null): string {
  const redirectPath =
    next && isSafeRedirectPath(next) ? next : DEFAULT_POST_AUTH_PATH;
  return `${getAppUrl()}/auth/callback?next=${encodeURIComponent(redirectPath)}`;
}

export function resolvePostAuthPath(next?: string | null): string {
  if (next && isSafeRedirectPath(next)) {
    return next;
  }
  return DEFAULT_POST_AUTH_PATH;
}
