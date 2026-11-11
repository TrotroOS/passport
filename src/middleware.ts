import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const GOOGLE_SITE_VERIFICATION_PATH = "/google67e218557784b354.html";

function hasSupabaseAuthCookie(request: NextRequest) {
  return request.cookies.getAll().some((cookie) => cookie.name.startsWith("sb-"));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === GOOGLE_SITE_VERIFICATION_PATH || pathname.endsWith(".html")) {
    return NextResponse.next();
  }

  if (pathname === "/api/health") {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const isAuthRoute = pathname === "/login" || pathname === "/signup";
  const isPublicRoute =
    pathname === "/" ||
    isAuthRoute ||
    pathname.startsWith("/legal") ||
    pathname.startsWith("/help") ||
    pathname.startsWith("/invitations");

  // Public pages skip Auth. Login/signup still refresh so signed-in users bounce to the app.
  if (isPublicRoute && (!isAuthRoute || !hasSupabaseAuthCookie(request))) {
    return NextResponse.next();
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|google67e218557784b354\\.html|robots\\.txt|sitemap\\.xml|manifest\\.webmanifest|opengraph-image|logo\\.png|api/).*)",
  ],
};
