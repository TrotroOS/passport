import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/admin-page-header";

import {

  AdminAttentionBanner,

  AdminGuidePanel,

  AdminQuickLinks,

  AdminRecentActivity,

} from "@/components/admin/admin-dashboard-panels";

import { AdminStatCard } from "@/components/admin/admin-stat-card";

import { AdminDashboardCharts } from "@/components/admin/admin-dashboard-charts";
import { fetchAdminDashboardChartsData } from "@/lib/admin/chart-data";
import { fetchAdminDashboardOverview } from "@/lib/admin/dashboard-overview";

import { getPlatformAdminContext } from "@/lib/admin/require-platform-admin";

import { ADMIN_OPERATOR_TASKS, ADMIN_SECTIONS } from "@/lib/admin/sections";

import { SUPPORT_CONTACT_EMAIL } from "@/lib/legal/types";



export default async function AdminDashboardPage() {

  const ctx = await getPlatformAdminContext();

  if (!ctx) return null;



  const [overview, charts] = await Promise.all([
    fetchAdminDashboardOverview(ctx.admin),
    fetchAdminDashboardChartsData(ctx.admin),
  ]);

  const { stats, attention } = overview;



  const attentionItems = [

    {

      label: "open feedback item(s)",

      count: attention.openFeedback,

      href: "/admin/feedback",

      severity: "warning" as const,

    },

    {

      label: "error(s) in the last 24 hours",

      count: attention.errorsLast24h,

      href: "/admin/errors",

      severity: "danger" as const,

    },

    {

      label: "failed inbound message(s)",

      count: attention.failedInbound,

      href: "/admin/inbound",

      severity: "warning" as const,

    },

    {

      label: "document(s) still processing",

      count: attention.pendingDocuments,

      href: "/admin/shipments",

      severity: "info" as const,

    },

  ];



  return (

    <div className="space-y-8">

      <AdminPageHeader

        title="Platform Dashboard"

        description="Everything you need to monitor Passport, operate the platform, and know your responsibilities as a platform admin."

      />



      <AdminAttentionBanner items={attentionItems} />



      <section>

        <h2 className="mb-4 text-lg font-semibold text-foreground">Platform metrics</h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <AdminStatCard

            label="Organizations"

            value={stats.totalOrganizations}

            href="/admin/organizations"

          />

          <AdminStatCard label="Users" value={stats.totalUsers} href="/admin/users" />

          <AdminStatCard

            label="Shipments"

            value={stats.totalShipments}

            href="/admin/shipments"

          />

          <AdminStatCard

            label="Documents processed"

            value={stats.totalDocumentsProcessed}

            hint={`${attention.pendingDocuments} in queue`}

          />

          <AdminStatCard

            label="Inbound messages"

            value={stats.totalInboundMessages}

            href="/admin/inbound"

            highlight={attention.failedInbound > 0 ? "warning" : "default"}

          />

          <AdminStatCard

            label="Model cost (USD)"

            value={`$${stats.totalAiCost.toFixed(2)}`}

            href="/admin/ai-usage"

          />

          <AdminStatCard

            label="Error logs (total)"

            value={stats.totalErrors}

            href="/admin/errors"

            highlight={attention.errorsLast24h > 0 ? "danger" : "default"}

            hint={

              attention.errorsLast24h > 0

                ? `${attention.errorsLast24h} in last 24h`

                : undefined

            }

          />

          <AdminStatCard label="Active users (7d)" value={stats.activeUsersLast7Days} />

          <AdminStatCard

            label="Platform admins"

            value={attention.platformAdmins}

            href="/admin/users"

          />

          <AdminStatCard

            label="Active regulations"

            value={attention.activeRegulations}

            href="/admin/regulations"

          />

          <AdminStatCard

            label="Active abbreviations"

            value={attention.activeAbbreviations}

            href="/admin/document-abbreviations"

          />

          <AdminStatCard

            label="Open feedback"

            value={attention.openFeedback}

            href="/admin/feedback"

            highlight={attention.openFeedback > 0 ? "warning" : "default"}

          />

        </div>

      </section>

      <AdminDashboardCharts data={charts} />

      <section>
        <h2 className="mb-4 text-lg font-semibold text-foreground">Admin sections</h2>

        <AdminQuickLinks sections={ADMIN_SECTIONS} />

      </section>



      <section>

        <h2 className="mb-4 text-lg font-semibold text-foreground">Recent activity</h2>

        <AdminRecentActivity

          errors={overview.recentErrors}

          feedback={overview.recentFeedback}

        />

      </section>



      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-foreground">Operator guide</h2>
          <Link href="/admin/runbook" className="text-sm text-primary hover:underline">
            Full runbook →
          </Link>
        </div>
        <AdminGuidePanel

          email={ctx.email}

          appUrl={overview.appUrl}

          supportEmail={SUPPORT_CONTACT_EMAIL}

          migrations={overview.migrations}
          tasks={ADMIN_OPERATOR_TASKS}

        />

      </section>

    </div>

  );

}

