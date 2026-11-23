import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { GitBranch, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUserProfileForUser, getOrganizationIdForUser } from "@/lib/auth/get-organization-id";
import { AppHeader } from "@/components/layout/app-header";
import { AnalyticsDashboardLazy } from "@/components/analytics/analytics-dashboard-lazy";
import { getSessionUser } from "@/lib/auth/get-session-user";
import { Button } from "@/components/ui/button";

export const preferredRegion = ["fra1"];

export default async function AnalyticsPage() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  const supabase = await createClient();
  const [organizationId, profile, tNav] = await Promise.all([
    getOrganizationIdForUser(supabase, user.id),
    getUserProfileForUser(supabase, user.id),
    getTranslations("nav"),
  ]);
  if (!organizationId) {
    redirect("/dashboard");
  }
  const orgName =
    profile?.organizations &&
    typeof profile.organizations === "object" &&
    "name" in profile.organizations
      ? (profile.organizations as { name: string }).name
      : undefined;

  return (
    <div className="min-h-screen bg-white print:hidden">
      <AppHeader
        organizationName={orgName}
        userEmail={profile?.email}
        isPlatformAdmin={profile?.is_platform_admin === true}
      />
      <main id="main-content" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold tracking-tight">{tNav("analytics")}</h1>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/analytics/governance">
                <ShieldCheck className="me-2 h-4 w-4" />
                {tNav("dataGovernance")}
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/analytics/network">
                <GitBranch className="me-2 h-4 w-4" />
                {tNav("tradeNetwork")}
              </Link>
            </Button>
          </div>
        </div>
        <AnalyticsDashboardLazy />
      </main>
    </div>
  );
}
