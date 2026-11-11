"use client";

import dynamic from "next/dynamic";

export const AnalyticsDashboardLazy = dynamic(
  () =>
    import("@/components/analytics/analytics-dashboard").then((mod) => ({
      default: mod.AnalyticsDashboard,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-4">
        <div className="h-24 animate-pulse rounded-lg border bg-slate-50" />
        <div className="h-64 animate-pulse rounded-lg border bg-slate-50" />
      </div>
    ),
  }
);
