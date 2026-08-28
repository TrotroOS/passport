"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { localeLabels, locales, type Locale } from "@/i18n/config";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const t = useTranslations("common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function onChange(nextLocale: string) {
    if (nextLocale === locale) return;

    startTransition(async () => {
      try {
        const response = await fetch("/api/user/preferences", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ preferred_language: nextLocale }),
        });
        const data = await response.json();
        if (!response.ok) {
          toast.error(data.error ?? t("error"));
          return;
        }

        document.cookie = `NEXT_LOCALE=${nextLocale};path=/;max-age=31536000;samesite=lax`;
        router.refresh();
      } catch {
        toast.error(t("error"));
      }
    });
  }

  return (
    <Select value={locale} onValueChange={onChange} disabled={isPending}>
      <SelectTrigger className="h-8 w-[130px] text-xs" aria-label={t("language")}>
        <SelectValue placeholder={t("language")} />
      </SelectTrigger>
      <SelectContent>
        {locales.map((code) => (
          <SelectItem key={code} value={code}>
            {localeLabels[code]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
