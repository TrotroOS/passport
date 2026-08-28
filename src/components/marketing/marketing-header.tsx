"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { PassportLogo } from "@/components/brand/passport-logo";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "#audiences", key: "audiences" as const },
  { href: "#features", key: "features" as const },
  { href: "#how-it-works", key: "howItWorks" as const },
  { href: "#compare", key: "compare" as const },
  { href: "#corridors", key: "corridors" as const },
  { href: "#pricing", key: "pricing" as const },
  { href: "/help", key: "help" as const, external: true },
];

interface MarketingHeaderProps {
  isAuthenticated: boolean;
}

export function MarketingHeader({ isAuthenticated }: MarketingHeaderProps) {
  const t = useTranslations("marketing.nav");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <header className="sticky top-0 z-50 border-b bg-background/90 backdrop-blur-md supports-[backdrop-filter]:bg-background/75">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:h-16 sm:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-2">
            <PassportLogo height={32} className="sm:hidden" />
            <PassportLogo height={36} className="hidden sm:block" />
            <span className="truncate text-base font-semibold tracking-tight sm:text-lg">
              Passport
            </span>
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.key}
                href={link.href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {t(link.key)}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <LanguageSwitcher />
            {isAuthenticated ? (
              <Button asChild size="sm">
                <Link href="/dashboard">{t("dashboard")}</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/login">{t("signIn")}</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/signup">{t("getStarted")}</Link>
                </Button>
              </>
            )}
          </div>

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border bg-background/80 md:hidden"
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      <div
        className={cn(
          "fixed inset-0 z-40 bg-background/60 backdrop-blur-sm transition-opacity duration-300 md:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        aria-hidden={!open}
        onClick={() => setOpen(false)}
      />

      <div
        className={cn(
          "fixed inset-x-0 top-14 z-50 max-h-[calc(100dvh-3.5rem)] overflow-y-auto border-b bg-background shadow-lg transition-all duration-300 ease-out md:hidden",
          open ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0"
        )}
      >
        <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-4">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.key}
              href={link.href}
              className="rounded-xl px-4 py-3 text-base font-medium text-foreground active:bg-muted"
              onClick={() => setOpen(false)}
            >
              {t(link.key)}
            </Link>
          ))}
          <div className="mt-3 flex flex-col gap-2 border-t pt-4">
            <LanguageSwitcher />
            {isAuthenticated ? (
              <Button asChild className="h-11 w-full">
                <Link href="/dashboard" onClick={() => setOpen(false)}>
                  {t("dashboard")}
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="outline" className="h-11 w-full">
                  <Link href="/login" onClick={() => setOpen(false)}>
                    {t("signIn")}
                  </Link>
                </Button>
                <Button asChild className="h-11 w-full">
                  <Link href="/signup" onClick={() => setOpen(false)}>
                    {t("getStarted")}
                  </Link>
                </Button>
              </>
            )}
          </div>
        </nav>
      </div>
    </>
  );
}
