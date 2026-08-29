import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { BarChart3, LogOut, Settings, Shield } from "lucide-react";
import { logoutAction } from "@/lib/actions/auth";
import { createClient } from "@/lib/supabase/server";
import { PassportLogo } from "@/components/brand/passport-logo";
import { AppActionsMenu } from "@/components/layout/app-actions-menu";
import { AppMobileNav } from "@/components/layout/app-mobile-nav";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { ShipmentSearch } from "@/components/layout/shipment-search";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";

interface AppHeaderProps {
  organizationName?: string;
  userEmail?: string;
}

export async function AppHeader({ organizationName, userEmail }: AppHeaderProps) {
  const t = await getTranslations("nav");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let showAdmin = false;
  if (user) {
    const { data: profile, error } = await supabase
      .from("users")
      .select("is_platform_admin")
      .eq("id", user.id)
      .maybeSingle();
    showAdmin = !error && profile?.is_platform_admin === true;
  }

  return (
    <header className="no-print sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 print:hidden">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-2 px-4 sm:h-16 sm:gap-3 sm:px-6 lg:px-8">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <Link href="/dashboard" className="flex shrink-0 items-center gap-2">
            <PassportLogo height={28} />
          </Link>
          {organizationName ? (
            <span className="hidden truncate text-sm text-muted-foreground lg:inline">
              {organizationName}
            </span>
          ) : null}
          <ShipmentSearch />
        </div>

        <div className="flex shrink-0 items-center gap-0.5 sm:gap-1.5">
          <ThemeToggle className="hidden sm:inline-flex" />
          <LanguageSwitcher className="hidden md:flex" />
          <AppActionsMenu />
          {showAdmin ? (
            <Link
              href="/admin/dashboard"
              className="hidden items-center gap-1 text-sm font-medium text-primary hover:underline sm:inline-flex"
            >
              <Shield className="h-4 w-4" />
              <span className="hidden md:inline">{t("admin")}</span>
            </Link>
          ) : null}
          <Link
            href="/analytics"
            className="hidden items-center gap-1 text-sm text-muted-foreground hover:text-foreground md:inline-flex"
          >
            <BarChart3 className="h-4 w-4" />
            {t("analytics")}
          </Link>
          <Link
            href="/settings/profile"
            className="hidden items-center gap-1 text-sm text-muted-foreground hover:text-foreground md:inline-flex"
            aria-label={t("settings")}
          >
            <Settings className="h-4 w-4" />
            {t("settings")}
          </Link>
          {userEmail ? (
            <span className="hidden text-sm text-muted-foreground xl:inline">{userEmail}</span>
          ) : null}
          <form action={logoutAction} className="hidden shrink-0 md:block">
            <Button type="submit" variant="ghost" size="sm" className="px-2 sm:px-3">
              <LogOut className="h-4 w-4 sm:me-2" />
              <span className="hidden sm:inline">{t("signOut")}</span>
            </Button>
          </form>
          <AppMobileNav showAdmin={showAdmin} />
        </div>
      </div>
    </header>
  );
}
