import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LoginForm } from "@/components/auth/login-form";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");

  return buildPageMetadata({
    title: t("loginMetaTitle"),
    description: t("loginMetaDescription"),
    path: "/login",
    noIndex: true,
  });
}

export default function LoginPage() {
  return <LoginForm />;
}
