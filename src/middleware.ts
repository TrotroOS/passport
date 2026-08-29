import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const GOOGLE_SITE_VERIFICATION_PATH = "/google67e218557784b354.html";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === GOOGLE_SITE_VERIFICATION_PATH || pathname.endsWith(".html")) {
    return NextResponse.next();
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|google67e218557784b354\\.html|robots\\.txt|sitemap\\.xml|manifest\\.webmanifest|opengraph-image|logo\\.png).*)",
  ],
};
