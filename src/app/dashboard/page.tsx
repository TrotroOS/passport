import Link from "next/link";
import { Plus, BarChart3, CircleHelp } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getUserProfileForUser, getOrganizationIdForUser } from "@/lib/auth/get-organization-id";
import { getAnalyticsSummary } from "@/lib/analytics/analytics-service";
import { listShipmentsForUser } from "@/lib/shipments/list-shipments";
import { enrichShipmentsWithSummaries } from "@/lib/shipments/dashboard-summaries";
import { listSharedShipmentsForUser } from "@/lib/shipments/shipment-access";
import { AppHeader } from "@/components/layout/app-header";
import { ShipmentsList } from "@/components/shipments/shipments-list";
import { DashboardCharts } from "@/components/analytics/dashboard-charts";
import { FeedbackButton } from "@/components/feedback/feedback-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function DashboardPage() {
  const supabase = await createClient();
  const t = await getTranslations("dashboard");
  const ts = await getTranslations("status");
  const tNav = await getTranslations("nav");
  const tAnalytics = await getTranslations("analytics");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const profile = await getUserProfileForUser(supabase, user.id);
  const organizationId = await getOrganizationIdForUser(supabase, user.id);

  const [rawShipments, sharedShipments, orgSummary] = await Promise.all([
    listShipmentsForUser(supabase, user.id),
    listSharedShipmentsForUser(supabase, user.id),
    organizationId
      ? getAnalyticsSummary(organizationId, "all").catch(() => null)
      : Promise.resolve(null),
  ]);

  const shipments = await enrichShipmentsWithSummaries(rawShipments);

  const orgName =
    profile?.organizations &&
    typeof profile.organizations === "object" &&
    "name" in profile.organizations
      ? (profile.organizations as { name: string }).name
      : undefined;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader organizationName={orgName} userEmail={profile?.email} />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
            <p className="text-muted-foreground">{t("subtitle")}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/help">
                <CircleHelp className="me-2 h-4 w-4" />
                {tNav("help")}
              </Link>
            </Button>
            <FeedbackButton />
            <Button variant="outline" asChild>
              <Link href="/analytics">
                <BarChart3 className="me-2 h-4 w-4" />
                {tNav("analytics")}
              </Link>
            </Button>
            <Button asChild>
              <Link href="/shipments/new">
                <Plus className="me-2 h-4 w-4" />
                {tNav("newShipment")}
              </Link>
            </Button>
          </div>
        </div>

        {orgSummary && shipments.length > 0 ? (
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{tAnalytics("kpiShipments")}</CardDescription>
                <CardTitle className="text-2xl">
                  {(orgSummary.shipmentCounts as { allTime?: number })?.allTime ?? shipments.length}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{tAnalytics("kpiAvgScore")}</CardDescription>
                <CardTitle className="text-2xl">
                  {orgSummary.avgPassportScore != null
                    ? String(orgSummary.avgPassportScore)
                    : "—"}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{tAnalytics("kpiOpenDiscrepancies")}</CardDescription>
                <CardTitle className="text-2xl">
                  {String(orgSummary.openDiscrepancies ?? 0)}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{tAnalytics("kpiPendingTasks")}</CardDescription>
                <CardTitle className="text-2xl">
                  {String(orgSummary.pendingWorkflowTasks ?? 0)}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>
        ) : null}

        {shipments.length > 0 ? <DashboardCharts /> : null}

        <ShipmentsList shipments={shipments} />

        <section className="mt-12">
          <h2 className="mb-2 text-xl font-semibold tracking-tight">{t("sharedTitle")}</h2>
          <p className="mb-4 text-sm text-muted-foreground">{t("sharedSubtitle")}</p>
          {sharedShipments.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("sharedEmpty")}</p>
          ) : (
            <ul className="space-y-3">
              {sharedShipments.map((shipment) => (
                <li key={shipment.id}>
                  <Link
                    href={`/shipments/${shipment.id}`}
                    className="block rounded-lg border bg-white p-4 shadow-sm transition hover:border-slate-300"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold">{shipment.shipment_ref}</span>
                      <Badge variant="outline">
                        {ts(shipment.collaborator_role as "viewer")}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {shipment.origin_country ?? "—"} → {shipment.destination_country ?? "—"}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {shipments.length > 0 ? (
          <p className="mt-8 text-center text-sm text-muted-foreground">
            {t("clickShipmentHint")}
          </p>
        ) : null}
      </main>
    </div>
  );
}
