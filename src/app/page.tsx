import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MarketingLanding } from "@/components/marketing/marketing-landing";
import { MarketingJsonLd } from "@/components/seo/marketing-json-ld";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { SITE_KEYWORDS } from "@/lib/seo/site";

export const preferredRegion = ["fra1"];

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("marketing");
  return buildPageMetadata({
    title: t("metaTitle"),
    description: t("metaDescription"),
    path: "/",
    keywords: [...SITE_KEYWORDS],
  });
}

export default async function HomePage() {
  const t = await getTranslations("marketing");

  return (
    <>
      <MarketingJsonLd
        title={t("metaTitle")}
        description={t("metaDescription")}
      />
      <MarketingLanding />
    </>
  );
}
