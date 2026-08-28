import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, GitBranch, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUserProfileForUser, getOrganizationIdForUser } from "@/lib/auth/get-organization-id";
import { AppHeader } from "@/components/layout/app-header";
import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard";
import { Button } from "@/components/ui/button";

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const organizationId = await getOrganizationIdForUser(supabase, user.id);
  if (!organizationId) {
    redirect("/dashboard");
  }

  const profile = await getUserProfileForUser(supabase, user.id);
  const orgName =
    profile?.organizations &&
    typeof profile.organizations === "object" &&
    "name" in profile.organizations
      ? (profile.organizations as { name: string }).name
      : undefined;

  return (
    <div className="min-h-screen bg-slate-50 print:hidden">
      <AppHeader organizationName={orgName} userEmail={profile?.email} />
      <main className="mx-auto max-w-7xl px-4 py-8 print:hidden sm:px-6 lg:px-8">
        <Button variant="ghost" size="sm" asChild className="mb-6">
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to dashboard
          </Link>
        </Button>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div />
          <Button variant="outline" size="sm" asChild>
            <Link href="/analytics/governance">
              <ShieldCheck className="me-2 h-4 w-4" />
              Data governance
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/analytics/network">
              <GitBranch className="me-2 h-4 w-4" />
              Trade network
            </Link>
          </Button>
        </div>
        <AnalyticsDashboard organizationName={orgName} />
      </main>
    </div>
  );
}
