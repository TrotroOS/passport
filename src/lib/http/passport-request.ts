import { NextResponse, type NextRequest } from "next/server";
import { defaultLocale, isLocale, LOCALE_COOKIE } from "@/i18n/config";

export function nextWithPassportContext(request: NextRequest) {
  const localeCookie = request.cookies.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(localeCookie) ? localeCookie : defaultLocale;
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-passport-path", request.nextUrl.pathname);
  requestHeaders.set("x-passport-locale", locale);
  return NextResponse.next({ request: { headers: requestHeaders } });
}
