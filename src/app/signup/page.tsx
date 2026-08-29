import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SignupForm } from "@/components/auth/signup-form";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");

  return buildPageMetadata({
    title: t("signupMetaTitle"),
    description: t("signupMetaDescription"),
    path: "/signup",
    noIndex: true,
  });
}

export default function SignupPage() {
  return <SignupForm />;
}
