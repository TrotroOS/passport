import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getUserProfileForUser } from "@/lib/auth/get-organization-id";
import { listShipmentsForUser } from "@/lib/shipments/list-shipments";
import { enrichShipmentsWithSummaries } from "@/lib/shipments/dashboard-summaries";
import { listSharedShipmentsForUser } from "@/lib/shipments/shipment-access";
import { AppHeader } from "@/components/layout/app-header";
import { DashboardPageToolbar } from "@/components/dashboard/dashboard-page-toolbar";
import { ShipmentsList } from "@/components/shipments/shipments-list";
import { DashboardCharts } from "@/components/analytics/dashboard-charts";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const [t, ts, tAnalytics, profile] = await Promise.all([
    getTranslations("dashboard"),
    getTranslations("status"),
    getTranslations("analytics"),
    getUserProfileForUser(supabase, user.id),
  ]);

  const organizationId = profile?.organization_id ?? null;

  const [rawShipments, sharedShipments] = await Promise.all([
    listShipmentsForUser(supabase, user.id, { organizationId, limit: 50 }),
    listSharedShipmentsForUser(supabase, user.id),
  ]);

  const shipments = await enrichShipmentsWithSummaries(rawShipments);

  const scored = shipments.filter((s) => s.overallScore != null);
  const orgSummary = {
    shipmentCounts: { allTime: shipments.length },
    avgPassportScore:
      scored.length > 0
        ? Math.round(
            scored.reduce((sum, s) => sum + (s.overallScore ?? 0), 0) / scored.length
          )
        : null,
    openDiscrepancies: shipments.reduce((sum, s) => sum + s.openDiscrepancies, 0),
    pendingWorkflowTasks: shipments.reduce((sum, s) => sum + s.pendingTasks, 0),
  };

  const orgName =
    profile?.organizations &&
    typeof profile.organizations === "object" &&
    "name" in profile.organizations
      ? (profile.organizations as { name: string }).name
      : undefined;

  return (
    <div className="min-h-screen overflow-x-hidden bg-white">
      <AppHeader
        organizationName={orgName}
        userEmail={profile?.email}
        isPlatformAdmin={profile?.is_platform_admin === true}
      />
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="mb-8 flex min-w-0 flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-6">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
            <p className="mt-1 max-w-prose text-sm leading-relaxed text-muted-foreground sm:text-base">
              {t("subtitle")}
            </p>
          </div>
          <DashboardPageToolbar />
        </div>

        {orgSummary && shipments.length > 0 ? (
          <div className="mb-8 grid gap-4 print:hidden sm:grid-cols-2 lg:grid-cols-4">
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

        <section className="mt-12 min-w-0">
          <h2 className="mb-2 text-xl font-semibold tracking-tight">{t("sharedTitle")}</h2>
          <p className="mb-4 text-sm text-muted-foreground">{t("sharedSubtitle")}</p>
          {sharedShipments.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("sharedEmpty")}</p>
          ) : (
            <ul className="min-w-0 space-y-3">
              {sharedShipments.map((shipment) => (
                <li key={shipment.id}>
                  <Link
                    href={`/shipments/${shipment.id}`}
                    className="block min-w-0 rounded-lg border bg-white p-4 shadow-sm transition hover:border-slate-300"
                  >
                    <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <span className="truncate font-semibold">{shipment.shipment_ref}</span>
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
