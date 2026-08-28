import {
  aiLanguageNames,
  defaultLocale,
  isLocale,
  type Locale,
} from "@/i18n/config";

export function resolveLocale(value: string | null | undefined): Locale {
  return isLocale(value) ? value : defaultLocale;
}

export function aiLanguageInstruction(locale: Locale | string): string {
  const resolved = resolveLocale(locale);
  if (resolved === "en") {
    return "";
  }

  const languageName = aiLanguageNames[resolved];
  return [
    `Respond in ${languageName}.`,
    "Keep extracted regulatory source text, legal citations, and document field values in their original language.",
    "Only translate your commentary, suggestions, and explanatory text.",
  ].join(" ");
}

export function appendAiLanguageInstruction(
  prompt: string,
  locale: Locale | string
): string {
  const instruction = aiLanguageInstruction(locale);
  if (!instruction) return prompt;
  return `${prompt}\n\n${instruction}`;
}
