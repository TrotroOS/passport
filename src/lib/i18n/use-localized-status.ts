"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";

export function useLocalizedStatus() {
  const t = useTranslations("status");

  return useCallback(
    (key: string): string => {
      if (t.has(key as never)) {
        return t(key as never);
      }
      return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    },
    [t]
  );
}
