import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LogOut, Settings, Shield } from "lucide-react";
import { logoutAction } from "@/lib/actions/auth";
import { createClient } from "@/lib/supabase/server";
import { PassportLogo } from "@/components/brand/passport-logo";
import { AppActionsMenu } from "@/components/layout/app-actions-menu";
import { AppMobileNav } from "@/components/layout/app-mobile-nav";
import { AppPrimaryNav } from "@/components/layout/app-primary-nav";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { ShipmentSearch } from "@/components/layout/shipment-search";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";

interface AppHeaderProps {
  organizationName?: string;
  userEmail?: string;
  isPlatformAdmin?: boolean;
}

export async function AppHeader({
  organizationName,
  userEmail,
  isPlatformAdmin,
}: AppHeaderProps) {
  const t = await getTranslations("nav");
  let showAdmin = isPlatformAdmin === true;

  if (isPlatformAdmin === undefined) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: profile, error } = await supabase
        .from("users")
        .select("is_platform_admin")
        .eq("id", user.id)
        .maybeSingle();
      showAdmin = !error && profile?.is_platform_admin === true;
    }
  }

  return (
    <header className="no-print sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 print:hidden">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-3 focus:z-[60] focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground"
      >
        {t("skipToContent")}
      </a>
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-2 px-4 sm:h-16 sm:gap-3 sm:px-6 lg:px-8">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4">
          <Link
            href="/dashboard"
            className="flex shrink-0 items-center gap-2"
            aria-label={organizationName ?? "Seadell"}
          >
            <PassportLogo variant="lockup" height={26} />
          </Link>
          <AppPrimaryNav />
          <ShipmentSearch />
        </div>

        <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
          <ThemeToggle className="hidden lg:inline-flex" />
          <LanguageSwitcher className="hidden lg:flex" />
          <AppActionsMenu />
          {showAdmin ? (
            <Link
              href="/admin/dashboard"
              className="hidden items-center gap-1 text-sm font-medium text-primary hover:underline sm:inline-flex"
            >
              <Shield className="h-4 w-4" />
              <span className="hidden xl:inline">{t("admin")}</span>
            </Link>
          ) : null}
          <Link
            href="/settings/profile"
            className="hidden items-center gap-1 rounded-md p-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground md:inline-flex"
            aria-label={t("settings")}
          >
            <Settings className="h-4 w-4" />
          </Link>
          {userEmail ? (
            <span className="sr-only">{userEmail}</span>
          ) : null}
          <form action={logoutAction} className="hidden shrink-0 md:block">
            <Button type="submit" variant="ghost" size="sm" className="px-2">
              <LogOut className="h-4 w-4" />
              <span className="sr-only">{t("signOut")}</span>
            </Button>
          </form>
          <AppMobileNav showAdmin={showAdmin} />
        </div>
      </div>
    </header>
  );
}
