"use client";

import Link from "next/link";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { AdminDashboardChartsData } from "@/lib/admin/chart-data";

const SERIES_COLORS = {
  shipments: "#2563eb",
  users: "#10b981",
  organizations: "#8b5cf6",
  cost: "#2563eb",
  requests: "#64748b",
  errors: "#ef4444",
};

const STATUS_PALETTE = [
  "#64748b",
  "#2563eb",
  "#f59e0b",
  "#10b981",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
];

const FEEDBACK_COLORS: Record<string, string> = {
  open: "#f59e0b",
  acknowledged: "#2563eb",
  closed: "#10b981",
};

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium text-foreground">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="text-muted-foreground" style={{ color: entry.color }}>
          {entry.name}: <span className="font-semibold text-foreground">{entry.value}</span>
        </p>
      ))}
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-full min-h-[180px] items-center justify-center">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

interface AdminDashboardChartsProps {
  data: AdminDashboardChartsData;
}

export function AdminDashboardCharts({ data }: AdminDashboardChartsProps) {
  const hasActivity = data.activityTrend.some(
    (d) => d.shipments > 0 || d.users > 0 || d.organizations > 0
  );
  const hasAi = data.aiTrend.some((d) => d.requests > 0);
  const hasErrors = data.errorTrend.some((d) => d.count > 0);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Platform analytics</h2>
          <p className="text-sm text-muted-foreground">
            Trends and distribution across all tenants — last 30 days unless noted
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/ai-usage">
            Model usage detail
            <ArrowRight className="ms-2 h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Platform growth</CardTitle>
            <CardDescription>New shipments, users, and organizations per day</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            {!hasActivity ? (
              <EmptyChart message="No new activity in the last 30 days" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.activityTrend} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    width={32}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line
                    type="monotone"
                    dataKey="shipments"
                    name="Shipments"
                    stroke={SERIES_COLORS.shipments}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="users"
                    name="Users"
                    stroke={SERIES_COLORS.users}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="organizations"
                    name="Organizations"
                    stroke={SERIES_COLORS.organizations}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Shipment pipeline</CardTitle>
            <CardDescription>Status distribution (all shipments)</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            {data.shipmentStatus.length === 0 ? (
              <EmptyChart message="No shipments yet" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.shipmentStatus}
                    dataKey="count"
                    nameKey="name"
                    innerRadius={52}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {data.shipmentStatus.map((entry, i) => (
                      <Cell key={entry.key ?? entry.name} fill={STATUS_PALETTE[i % STATUS_PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                  <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Model usage & cost</CardTitle>
            <CardDescription>AI requests and daily spend (USD)</CardDescription>
          </CardHeader>
          <CardContent className="h-56">
            {!hasAi ? (
              <EmptyChart message="No AI usage in the last 30 days" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.aiTrend} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="adminCostFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={SERIES_COLORS.cost} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={SERIES_COLORS.cost} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    yAxisId="cost"
                    orientation="left"
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    width={36}
                    tickFormatter={(v) => `$${v}`}
                  />
                  <YAxis
                    yAxisId="req"
                    orientation="right"
                    allowDecimals={false}
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    width={28}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area
                    yAxisId="cost"
                    type="monotone"
                    dataKey="cost"
                    name="Cost (USD)"
                    stroke={SERIES_COLORS.cost}
                    fill="url(#adminCostFill)"
                    strokeWidth={2}
                  />
                  <Line
                    yAxisId="req"
                    type="monotone"
                    dataKey="requests"
                    name="Requests"
                    stroke={SERIES_COLORS.requests}
                    strokeWidth={2}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Error volume</CardTitle>
            <CardDescription>Application errors per day (last 14 days)</CardDescription>
          </CardHeader>
          <CardContent className="h-56">
            {!hasErrors ? (
              <EmptyChart message="No errors logged in the last 14 days" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.errorTrend} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    width={28}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="count" name="Errors" fill={SERIES_COLORS.errors} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top organizations</CardTitle>
            <CardDescription>By shipment count</CardDescription>
          </CardHeader>
          <CardContent className="h-56">
            {data.topOrganizations.length === 0 ? (
              <EmptyChart message="No organization data yet" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.topOrganizations}
                  layout="vertical"
                  margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={100}
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="count" name="Shipments" fill={SERIES_COLORS.shipments} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Feedback status</CardTitle>
            <CardDescription>User submissions by workflow state</CardDescription>
          </CardHeader>
          <CardContent className="h-56">
            {data.feedbackStatus.length === 0 ? (
              <EmptyChart message="No feedback submitted yet" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.feedbackStatus}
                    dataKey="count"
                    nameKey="name"
                    innerRadius={48}
                    outerRadius={72}
                    paddingAngle={3}
                  >
                    {data.feedbackStatus.map((entry) => (
                      <Cell
                        key={entry.key ?? entry.name}
                        fill={FEEDBACK_COLORS[entry.key ?? ""] ?? "#94a3b8"}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
