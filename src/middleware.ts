import { NextResponse, type NextRequest } from "next/server";
import { isAccessTokenFresh } from "@/lib/auth/access-token-fresh";
import { nextWithPassportContext } from "@/lib/http/passport-request";
import { updateSession } from "@/lib/supabase/middleware";

const GOOGLE_SITE_VERIFICATION_PATH = "/google67e218557784b354.html";

function hasSupabaseAuthCookie(request: NextRequest) {
  return request.cookies.getAll().some((cookie) => cookie.name.startsWith("sb-"));
}

function passthrough(request: NextRequest) {
  return nextWithPassportContext(request);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === GOOGLE_SITE_VERIFICATION_PATH || pathname.endsWith(".html")) {
    return passthrough(request);
  }

  const isAuthRoute = pathname === "/login" || pathname === "/signup";
  const isPublicRoute =
    pathname === "/" ||
    isAuthRoute ||
    pathname.startsWith("/legal") ||
    pathname.startsWith("/help") ||
    pathname.startsWith("/invitations");

  if (isPublicRoute && (!isAuthRoute || !hasSupabaseAuthCookie(request))) {
    return passthrough(request);
  }

  if (!hasSupabaseAuthCookie(request)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Fresh access token: skip the Auth round-trip. Admin still needs a role check.
  if (!isAuthRoute && !pathname.startsWith("/admin") && isAccessTokenFresh(request)) {
    return passthrough(request);
  }

  return updateSession(request, passthrough(request));
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|google67e218557784b354\\.html|robots\\.txt|sitemap\\.xml|manifest\\.webmanifest|opengraph-image|logo\\.png|api/).*)",
  ],
};
