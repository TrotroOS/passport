import { IntlErrorCode, type IntlError } from "next-intl";

/** Turn `analytics.kpiShipments` into `Analytics Kpi Shipments`. */
export function formatMissingTranslationKey(path: string): string {
  return path
    .split(".")
    .filter(Boolean)
    .map((part) =>
      part
        .replace(/[_-]+/g, " ")
        .replace(/([a-z\d])([A-Z])/g, "$1 $2")
        .replace(/\s+/g, " ")
        .trim()
    )
    .map((part) =>
      part
        .split(" ")
        .map((word) =>
          word ? word.charAt(0).toUpperCase() + word.slice(1) : word
        )
        .join(" ")
    )
    .join(" ");
}

export function missingMessageFallback({
  namespace,
  key,
}: {
  namespace?: string;
  key: string;
}): string {
  const path = [namespace, key].filter(Boolean).join(".");
  return formatMissingTranslationKey(path);
}

export function handleIntlError(error: IntlError): void {
  if (error.code === IntlErrorCode.MISSING_MESSAGE) {
    return;
  }
  console.error(error);
}
