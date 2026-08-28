import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { BarChart3, LogOut, Settings, Shield } from "lucide-react";
import { logoutAction } from "@/lib/actions/auth";
import { createClient } from "@/lib/supabase/server";
import { PassportLogo } from "@/components/brand/passport-logo";
import { AppActionsMenu } from "@/components/layout/app-actions-menu";
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
    <header className="overflow-x-hidden border-b bg-background print:hidden">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-2 px-4 sm:h-16 sm:gap-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4">
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
        <div className="flex shrink-0 items-center gap-0.5 sm:gap-2">
          <ThemeToggle />
          <LanguageSwitcher />
          <AppActionsMenu />
          {showAdmin ? (
            <Link
              href="/admin/dashboard"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">{t("admin")}</span>
            </Link>
          ) : null}
          <Link
            href="/analytics"
            className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline-flex sm:items-center sm:gap-1"
          >
            <BarChart3 className="h-4 w-4" />
            {t("analytics")}
          </Link>
          <Link
            href="/settings/profile"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            aria-label={t("settings")}
          >
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">{t("settings")}</span>
          </Link>
          {userEmail ? (
            <span className="hidden text-sm text-muted-foreground xl:inline">{userEmail}</span>
          ) : null}
          <form action={logoutAction} className="shrink-0">
            <Button type="submit" variant="ghost" size="sm" className="px-2 sm:px-3">
              <LogOut className="h-4 w-4 sm:me-2" />
              <span className="hidden sm:inline">{t("signOut")}</span>
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
