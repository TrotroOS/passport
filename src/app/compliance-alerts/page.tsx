import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getUserProfileForUser, getOrganizationIdForUser } from "@/lib/auth/get-organization-id";
import { AppHeader } from "@/components/layout/app-header";
import { ComplianceAlertsPanel } from "@/components/compliance/compliance-alerts-panel";
import { Button } from "@/components/ui/button";

export default async function ComplianceAlertsPage() {
  const supabase = await createClient();
  const t = await getTranslations("nav");

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
    <div className="min-h-screen bg-white">
      <AppHeader organizationName={orgName} userEmail={profile?.email} />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <Button variant="ghost" size="sm" asChild className="mb-6">
          <Link href="/dashboard">
            <ArrowLeft className="me-2 h-4 w-4" />
            {t("backToDashboard")}
          </Link>
        </Button>
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">{t("complianceAlerts")}</h1>
          <p className="text-muted-foreground">{t("complianceAlertsSubtitle")}</p>
        </div>
        <ComplianceAlertsPanel />
      </main>
    </div>
  );
}
