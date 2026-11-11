"use client";

import dynamic from "next/dynamic";

export const DashboardChartsLazy = dynamic(
  () =>
    import("@/components/analytics/dashboard-charts").then((mod) => ({
      default: mod.DashboardCharts,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="mb-8 h-64 animate-pulse rounded-lg border bg-slate-50 print:hidden" />
    ),
  }
);
