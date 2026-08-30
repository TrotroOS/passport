import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUserProfileForUser, getOrganizationIdForUser } from "@/lib/auth/get-organization-id";
import { AppHeader } from "@/components/layout/app-header";
import { GovernanceDashboard } from "@/components/governance/governance-dashboard";
import { Button } from "@/components/ui/button";

export default async function GovernancePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const organizationId = await getOrganizationIdForUser(supabase, user.id);
  if (!organizationId) redirect("/dashboard");

  const profile = await getUserProfileForUser(supabase, user.id);
  const t = await getTranslations("governance");
  const tNav = await getTranslations("nav");
  const orgName =
    profile?.organizations &&
    typeof profile.organizations === "object" &&
    "name" in profile.organizations
      ? (profile.organizations as { name: string }).name
      : undefined;

  return (
    <div className="min-h-screen bg-white">
      <AppHeader organizationName={orgName} userEmail={profile?.email} />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Button variant="ghost" size="sm" asChild className="mb-6">
          <Link href="/analytics">
            <ArrowLeft className="me-2 h-4 w-4" />
            {tNav("analytics")}
          </Link>
        </Button>
        <div className="mb-8 flex items-center gap-3">
          <ShieldCheck className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t("pageTitle")}</h1>
            <p className="text-muted-foreground">{t("pageSubtitle")}</p>
          </div>
        </div>
        <GovernanceDashboard />
      </main>
    </div>
  );
}
