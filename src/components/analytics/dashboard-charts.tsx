"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowRight, Ship, AlertTriangle, Container } from "lucide-react";
import { formatMonthLabel } from "@/lib/analytics/date-range";
import { useLocalizedStatus } from "@/lib/i18n/use-localized-status";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const RISK_COLORS: Record<string, string> = {
  low: "#10b981",
  medium: "#f59e0b",
  high: "#f97316",
  critical: "#ef4444",
};

const STATUS_COLORS = [
  "#64748b",
  "#2563eb",
  "#f59e0b",
  "#10b981",
  "#ef4444",
  "#8b5cf6",
];

export function DashboardCharts() {
  const localizedStatus = useLocalizedStatus();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<Record<string, unknown> | null>(null);
  const [compliance, setCompliance] = useState<Array<{ label: string; score: number | null }>>(
    []
  );
  const [statusBreakdown, setStatusBreakdown] = useState<
    Array<{ status: string; count: number; name: string }>
  >([]);
  const [tracking, setTracking] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    const q = "dateRange=90d";
    Promise.all([
      fetch(`/api/analytics/summary?${q}`),
      fetch(`/api/analytics/compliance-trend?${q}`),
      fetch(`/api/analytics/shipment-status?${q}`),
      fetch(`/api/analytics/tracking-summary?${q}`),
    ])
      .then(async ([summaryRes, complianceRes, statusRes, trackingRes]) => {
        if (!summaryRes.ok) return;
        const [summaryData, complianceData, statusData, trackingData] = await Promise.all([
          summaryRes.json(),
          complianceRes.json(),
          statusRes.json(),
          trackingRes.json(),
        ]);
        setSummary(summaryData);
        const points =
          (complianceData.compliance as { points?: Array<Record<string, unknown>> })?.points ?? [];
        setCompliance(
          points.slice(-6).map((p) => ({
            label: formatMonthLabel(String(p.month)),
            score: p.avgOverallScore != null ? Number(p.avgOverallScore) : null,
          }))
        );
        setStatusBreakdown(
          ((statusData.breakdown as Array<{ status: string; count: number }>) ?? []).map(
            (row) => ({
              ...row,
              name: localizedStatus(row.status),
            })
          )
        );
        setTracking(trackingData);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once on mount
  }, []);

  if (loading) {
    return (
      <div className="mb-8 grid gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="h-48 animate-pulse bg-slate-100 pt-6" />
          </Card>
        ))}
      </div>
    );
  }

  if (!summary) return null;

  const riskPie = summary.riskDistribution
    ? Object.entries(summary.riskDistribution as Record<string, number>)
        .filter(([, v]) => v > 0)
        .map(([name, value]) => ({
          name: localizedStatus(name),
          value,
          key: name,
        }))
    : [];

  return (
    <div className="mb-8 min-w-0 space-y-4 overflow-hidden print:hidden">
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold">Overview (last 90 days)</h2>
        <Button variant="ghost" size="sm" asChild className="w-fit shrink-0">
          <Link href="/analytics">
            Full analytics
            <ArrowRight className="ms-2 h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="grid min-w-0 gap-4 lg:grid-cols-3">
        <Card className="min-w-0 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Compliance trend</CardTitle>
            <CardDescription>Avg Passport Score by month</CardDescription>
          </CardHeader>
          <CardContent className="h-44 min-w-0 overflow-hidden">
            {compliance.length === 0 ? (
              <p className="text-sm text-muted-foreground">No score history yet</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <LineChart data={compliance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} width={28} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Ship className="h-4 w-4 shrink-0" />
              Shipment status
            </CardTitle>
            <CardDescription>Current pipeline breakdown</CardDescription>
          </CardHeader>
          <CardContent className="h-44 min-w-0 overflow-hidden">
            {statusBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground">No shipments in range</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={statusBreakdown} layout="vertical" margin={{ left: 8 }}>
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={72}
                    tick={{ fontSize: 10 }}
                  />
                  <Tooltip />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {statusBreakdown.map((_, i) => (
                      <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Risk distribution</CardTitle>
            <CardDescription>Latest assessments</CardDescription>
          </CardHeader>
          <CardContent className="h-44 min-w-0 overflow-hidden">
            {riskPie.length === 0 ? (
              <p className="text-sm text-muted-foreground">No risk data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <PieChart>
                  <Pie
                    data={riskPie}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={40}
                    outerRadius={65}
                    paddingAngle={2}
                  >
                    {riskPie.map((entry) => (
                      <Cell
                        key={entry.key}
                        fill={RISK_COLORS[entry.key] ?? "#94a3b8"}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {tracking ? (
        <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <Container className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{String(tracking.containersTracked ?? 0)}</p>
                <p className="text-xs text-muted-foreground">Containers tracked</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-2xl font-bold">{String(tracking.shipmentsWithTracking ?? 0)}</p>
              <p className="text-xs text-muted-foreground">Shipments with tracking</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <AlertTriangle className="h-8 w-8 text-amber-500" />
              <div>
                <p className="text-2xl font-bold">{String(tracking.delayedEvents ?? 0)}</p>
                <p className="text-xs text-muted-foreground">Delay events</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-2xl font-bold">{String(tracking.delivered ?? 0)}</p>
              <p className="text-xs text-muted-foreground">Deliveries recorded</p>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
