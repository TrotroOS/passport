import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { defaultLocale, isLocale, LOCALE_COOKIE } from "./config";
import {
  handleIntlError,
  missingMessageFallback,
} from "@/lib/i18n/missing-message";

export default getRequestConfig(async () => {
  const headerLocale = (await headers()).get("x-passport-locale");
  let locale = isLocale(headerLocale) ? headerLocale : null;

  if (!locale) {
    const cookieStore = await cookies();
    const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
    locale = isLocale(cookieLocale) ? cookieLocale : defaultLocale;
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
    onError: handleIntlError,
    getMessageFallback: missingMessageFallback,
  };
});
