import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MarketingLanding } from "@/components/marketing/marketing-landing";
import { MarketingJsonLd } from "@/components/seo/marketing-json-ld";
import { createClient } from "@/lib/supabase/server";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { SITE_KEYWORDS } from "@/lib/seo/site";

export const dynamic = "force-dynamic";

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
  const supabase = await createClient();
  const t = await getTranslations("marketing");
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <>
      <MarketingJsonLd
        title={t("metaTitle")}
        description={t("metaDescription")}
      />
      <MarketingLanding isAuthenticated={Boolean(user)} />
    </>
  );
}
