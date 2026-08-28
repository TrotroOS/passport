"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Label } from "@/components/ui/label";

const REFERRAL_SOURCES = [
  "search",
  "broker",
  "linkedin",
  "conference",
  "colleague",
  "other",
] as const;

export function SignupAttributionFields() {
  const t = useTranslations("auth");
  const searchParams = useSearchParams();

  const utmSource = searchParams.get("utm_source") ?? "";
  const utmMedium = searchParams.get("utm_medium") ?? "";
  const utmCampaign = searchParams.get("utm_campaign") ?? "";

  return (
    <>
      {utmSource ? <input type="hidden" name="utmSource" value={utmSource} /> : null}
      {utmMedium ? <input type="hidden" name="utmMedium" value={utmMedium} /> : null}
      {utmCampaign ? <input type="hidden" name="utmCampaign" value={utmCampaign} /> : null}

      <div className="space-y-2">
        <Label htmlFor="referralSource">{t("referralSource")}</Label>
        <select
          id="referralSource"
          name="referralSource"
          defaultValue=""
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <option value="">{t("referralSourcePlaceholder")}</option>
          {REFERRAL_SOURCES.map((source) => (
            <option key={source} value={source}>
              {t(`referralSources.${source}`)}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">{t("referralSourceHint")}</p>
      </div>
    </>
  );
}
