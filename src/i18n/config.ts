export const locales = ["en", "fr", "pt", "ar"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";
export const LOCALE_COOKIE = "NEXT_LOCALE";

export const localeLabels: Record<Locale, string> = {
  en: "English",
  fr: "Français",
  pt: "Português",
  ar: "العربية",
};

export const rtlLocales: Locale[] = ["ar"];

export function isLocale(value: string | null | undefined): value is Locale {
  return locales.includes(value as Locale);
}

export function isRtlLocale(locale: Locale): boolean {
  return rtlLocales.includes(locale);
}

export const aiLanguageNames: Record<Locale, string> = {
  en: "English",
  fr: "French",
  pt: "Portuguese",
  ar: "Arabic",
};
