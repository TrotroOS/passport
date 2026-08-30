import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { PassportLogo } from "@/components/brand/passport-logo";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { LegalFooter } from "@/components/legal/legal-footer";
import { buildPageMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("help");

  return buildPageMetadata({
    title: t("metaTitle"),
    description: t("metaDescription"),
    path: "/help",
  });
}

export default async function HelpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations("help");
  const tLegal = await getTranslations("legal");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4 sm:px-6">
          <Link href={user ? "/dashboard" : "/"} className="flex items-center">
            <PassportLogo height={28} />
          </Link>
          <div className="flex items-center gap-3 text-sm">
            {user ? (
              <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
                {t("backToDashboard")}
              </Link>
            ) : (
              <Link href="/login" className="text-muted-foreground hover:text-foreground">
                {tLegal("signIn")}
              </Link>
            )}
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:py-12">{children}</main>

      <div className="mx-auto max-w-3xl px-4 pb-12 sm:px-6">
        <LegalFooter />
      </div>
    </div>
  );
}
