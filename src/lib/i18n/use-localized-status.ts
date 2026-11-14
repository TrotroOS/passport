"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import { formatMissingTranslationKey } from "@/lib/i18n/missing-message";

export function useLocalizedStatus() {
  const t = useTranslations("status");

  return useCallback(
    (key: string): string => {
      if (t.has(key as never)) {
        return t(key as never);
      }
      return formatMissingTranslationKey(key);
    },
    [t]
  );
}
