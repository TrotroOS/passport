import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { PassportLogo } from "@/components/brand/passport-logo";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { LegalFooter } from "@/components/legal/legal-footer";
import { LegalSidebar } from "@/components/legal/legal-sidebar";

export default async function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations("legal");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center">
            <PassportLogo height={28} />
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <Link href="/login" className="text-muted-foreground hover:text-foreground">
              {t("signIn")}
            </Link>
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:py-12">
        <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
          <aside className="lg:sticky lg:top-8 lg:self-start">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("hubTitle")}
            </p>
            <LegalSidebar />
          </aside>
          <main>{children}</main>
        </div>
        <div className="mt-12">
          <LegalFooter />
        </div>
      </div>
    </div>
  );
}
