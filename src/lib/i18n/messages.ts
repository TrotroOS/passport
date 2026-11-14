import type { Locale } from "@/i18n/config";
import en from "../../../messages/en.json";
import fr from "../../../messages/fr.json";
import pt from "../../../messages/pt.json";
import ar from "../../../messages/ar.json";
import { formatMissingTranslationKey } from "@/lib/i18n/missing-message";

type MessageTree = typeof en;

const catalogs: Record<Locale, MessageTree> = { en, fr, pt, ar };

export function getMessagesForLocale(locale: string): MessageTree {
  if (locale in catalogs) {
    return catalogs[locale as Locale];
  }
  return en;
}

export function formatNotificationMessage(
  locale: string,
  key: keyof MessageTree["notifications"],
  params: Record<string, string>
): string {
  let template = getMessagesForLocale(locale).notifications[key];
  for (const [name, value] of Object.entries(params)) {
    template = template.replace(new RegExp(`\\{${name}\\}`, "g"), value);
  }
  return template;
}

export function translateStatus(locale: string, status: string): string {
  const messages = getMessagesForLocale(locale);
  const statusMap = messages.status as Record<string, string>;
  return statusMap[status] ?? formatMissingTranslationKey(status);
}

export function translateEventType(locale: string, eventType: string): string {
  const messages = getMessagesForLocale(locale);
  const events = messages.events as Record<string, string>;
  return events[eventType] ?? formatMissingTranslationKey(eventType);
}
