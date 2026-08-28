import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { defaultLocale, isLocale, LOCALE_COOKIE, type Locale } from "@/i18n/config";

export async function getUserPreferredLanguage(userId: string): Promise<Locale> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("users")
    .select("preferred_language")
    .eq("id", userId)
    .maybeSingle();

  return isLocale(data?.preferred_language) ? data.preferred_language : defaultLocale;
}

export async function getLocaleForUser(userId?: string | null): Promise<Locale> {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  if (isLocale(cookieLocale)) {
    return cookieLocale;
  }

  if (userId) {
    return getUserPreferredLanguage(userId);
  }

  return defaultLocale;
}

export function localeCookieOptions(locale: Locale) {
  return {
    name: LOCALE_COOKIE,
    value: locale,
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax" as const,
  };
}
