"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Activity,
  BarChart3,
  Bell,
  CheckCircle2,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Shield,
  X,
} from "lucide-react";
import { logoutAction } from "@/lib/actions/auth";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AppMobileNavProps {
  showAdmin?: boolean;
}

export function AppMobileNav({ showAdmin = false }: AppMobileNavProps) {
  const t = useTranslations("nav");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const links = [
    { href: "/dashboard", label: t("dashboard"), icon: LayoutDashboard },
    { href: "/analytics", label: t("analytics"), icon: BarChart3 },
    { href: "/readiness", label: t("readiness"), icon: CheckCircle2 },
    { href: "/compliance-alerts", label: t("complianceAlerts"), icon: Bell },
    { href: "/settings/profile", label: t("settings"), icon: Settings },
    { href: "/settings/activity", label: t("activity"), icon: Activity },
  ];

  return (
    <>
      <button
        type="button"
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border bg-background md:hidden"
        aria-expanded={open}
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

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
          "fixed inset-x-0 top-14 z-50 max-h-[calc(100dvh-3.5rem)] overflow-y-auto border-b bg-background shadow-lg transition-all duration-300 ease-out sm:top-16 md:hidden",
          open ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0"
        )}
      >
        <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-base font-medium text-foreground active:bg-muted"
              onClick={() => setOpen(false)}
            >
              <link.icon className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
              {link.label}
            </Link>
          ))}

          {showAdmin ? (
            <Link
              href="/admin/dashboard"
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-base font-medium text-primary active:bg-muted"
              onClick={() => setOpen(false)}
            >
              <Shield className="h-5 w-5 shrink-0" aria-hidden />
              {t("admin")}
            </Link>
          ) : null}

          <div className="mt-3 flex flex-col gap-3 border-t pt-4">
            <div className="flex items-center justify-between gap-3 px-1">
              <LanguageSwitcher compact />
              <ThemeToggle />
            </div>
            <form action={logoutAction}>
              <Button type="submit" variant="outline" className="h-11 w-full justify-start gap-3">
                <LogOut className="h-5 w-5" />
                {t("signOut")}
              </Button>
            </form>
          </div>
        </nav>
      </div>
    </>
  );
}
