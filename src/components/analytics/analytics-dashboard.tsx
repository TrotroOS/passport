"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
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
import { useTranslations } from "next-intl";
import type { AnalyticsDateRange } from "@/lib/analytics/date-range";
import { formatMonthLabel } from "@/lib/analytics/date-range";
import { useLocalizedStatus } from "@/lib/i18n/use-localized-status";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const RISK_COLORS = {
  low: "#10b981",
  medium: "#f59e0b",
  high: "#f97316",
  critical: "#ef4444",
};

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-slate-200 ${className ?? ""}`} />;
}

export function AnalyticsDashboard() {
  const t = useTranslations("analytics");
  const localizedStatus = useLocalizedStatus();
  const [dateRange, setDateRange] = useState<AnalyticsDateRange>("90d");
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const hasLoadedRef = useRef(false);
  const [summary, setSummary] = useState<Record<string, unknown> | null>(null);
  const [compliance, setCompliance] = useState<Record<string, unknown> | null>(null);
  const [riskTrend, setRiskTrend] = useState<Record<string, unknown> | null>(null);
  const [suppliers, setSuppliers] = useState<Record<string, unknown> | null>(null);
  const [categories, setCategories] = useState<Record<string, unknown> | null>(null);
  const [corridors, setCorridors] = useState<Record<string, unknown> | null>(null);
  const [documents, setDocuments] = useState<Record<string, unknown> | null>(null);
  const [discrepancyTrend, setDiscrepancyTrend] = useState<Array<Record<string, unknown>>>([]);
  const [scoreDimensions, setScoreDimensions] = useState<Record<string, unknown> | null>(null);
  const [riskFactors, setRiskFactors] = useState<Array<Record<string, unknown>>>([]);
  const [tracking, setTracking] = useState<Record<string, unknown> | null>(null);
  const [statusBreakdownRaw, setStatusBreakdownRaw] = useState<
    Array<{ status: string; count: number }>
  >([]);

  const dateOptions = useMemo(
    () =>
      [
        { value: "30d" as const, label: t("last30Days") },
        { value: "90d" as const, label: t("last90Days") },
        { value: "1y" as const, label: t("lastYear") },
        { value: "all" as const, label: t("allTime") },
      ],
    [t]
  );

  const statusBreakdown = useMemo(
    () =>
      statusBreakdownRaw.map((row) => ({
        ...row,
        name: localizedStatus(row.status),
      })),
    [statusBreakdownRaw, localizedStatus]
  );

  const load = useCallback(async () => {
    if (!hasLoadedRef.current) {
      setInitialLoading(true);
    } else {
      setRefreshing(true);
    }
    const q = `dateRange=${dateRange}`;
    try {
      const [
        summaryRes,
        complianceRes,
        riskRes,
        supplierRes,
        categoryRes,
        corridorRes,
        docRes,
        scoreDimRes,
        riskFactorRes,
        trackingRes,
        statusRes,
      ] = await Promise.all([
        fetch(`/api/analytics/summary?${q}`),
        fetch(`/api/analytics/compliance-trend?${q}`),
        fetch(`/api/analytics/risk-distribution?${q}`),
        fetch(`/api/analytics/supplier-performance?${q}`),
        fetch(`/api/analytics/product-categories?${q}`),
        fetch(`/api/analytics/corridors?${q}`),
        fetch(`/api/analytics/document-completeness?${q}`),
        fetch(`/api/analytics/score-dimensions?${q}`),
        fetch(`/api/analytics/risk-factors?${q}`),
        fetch(`/api/analytics/tracking-summary?${q}`),
        fetch(`/api/analytics/shipment-status?${q}`),
      ]);

      if (summaryRes.status === 403 || complianceRes.status === 403) {
        throw new Error(t("membershipRequired"));
      }

      const [
        summaryData,
        complianceData,
        riskData,
        supplierData,
        categoryData,
        corridorData,
        docData,
        scoreDimData,
        riskFactorData,
        trackingData,
        statusData,
      ] = await Promise.all([
        summaryRes.json(),
        complianceRes.json(),
        riskRes.json(),
        supplierRes.json(),
        categoryRes.json(),
        corridorRes.json(),
        docRes.json(),
        scoreDimRes.json(),
        riskFactorRes.json(),
        trackingRes.json(),
        statusRes.json(),
      ]);

      setSummary(summaryData);
      setCompliance(complianceData);
      setRiskTrend(riskData);
      setSuppliers(supplierData);
      setCategories(categoryData);
      setCorridors(corridorData);
      setDocuments(docData);
      setDiscrepancyTrend(
        (complianceData.discrepancies as { points?: Array<Record<string, unknown>> })?.points?.map(
          (p) => ({ ...p, label: formatMonthLabel(String(p.month)) })
        ) ?? []
      );
      setScoreDimensions(scoreDimData);
      setRiskFactors(
        (riskFactorData.factors as Array<Record<string, unknown>>)?.map((f) => ({
          ...f,
          label: String(f.factorType).replace(/_/g, " "),
        })) ?? []
      );
      setTracking(trackingData);
      setStatusBreakdownRaw(
        (statusData.breakdown as Array<{ status: string; count: number }>) ?? []
      );
      hasLoadedRef.current = true;
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  }, [dateRange, t]);

  useEffect(() => {
    load();
  }, [load]);

  const compliancePoints =
    (compliance?.compliance as { points?: Array<Record<string, unknown>> })?.points?.map(
      (p) => ({
        ...p,
        label: formatMonthLabel(String(p.month)),
      })
    ) ?? [];

  const riskPoints =
    (riskTrend?.points as Array<Record<string, unknown>>)?.map((p) => ({
      ...p,
      label: formatMonthLabel(String(p.month)),
    })) ?? [];

  const riskPie = summary?.riskDistribution
    ? Object.entries(summary.riskDistribution as Record<string, number>).map(
        ([name, value]) => ({
          name: localizedStatus(name),
          value,
          key: name,
        })
      )
    : [];

  const supplierRows =
    (suppliers?.suppliers as Array<Record<string, unknown>>) ?? [];

  const categoryRows =
    (categories?.categories as Array<Record<string, unknown>>) ?? [];

  const corridorRows =
    (corridors?.corridors as Array<Record<string, unknown>>) ?? [];

  const missingDocs =
    (documents?.missingByType as Array<Record<string, unknown>>) ?? [];

  const shipmentCounts = summary?.shipmentCounts as
    | { last30Days?: number; last90Days?: number; allTime?: number }
    | undefined;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("orgInsights")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {dateOptions.map((opt) => (
            <Button
              key={opt.value}
              size="sm"
              variant={dateRange === opt.value ? "default" : "outline"}
              disabled={refreshing}
              onClick={() => setDateRange(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
          {refreshing ? (
            <span className="text-xs text-muted-foreground">{t("updating")}</span>
          ) : null}
        </div>
      </div>

      {initialLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-28" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <KpiCard
              title={t("kpiShipments")}
              value={String(summary?.shipmentsInRange ?? 0)}
              hint={t("kpiPeriodHint", {
                d30: shipmentCounts?.last30Days ?? 0,
                d90: shipmentCounts?.last90Days ?? 0,
              })}
            />
            <KpiCard
              title={t("kpiImportValue")}
              value={formatCurrency(Number(summary?.totalImportValue ?? 0))}
              hint={t("kpiImportHint")}
            />
            <KpiCard
              title={t("kpiAvgScore")}
              value={
                summary?.avgPassportScore != null
                  ? String(summary.avgPassportScore)
                  : "—"
              }
            />
            <KpiCard
              title={t("kpiOpenDiscrepancies")}
              value={String(summary?.openDiscrepancies ?? 0)}
            />
            <KpiCard
              title={t("kpiPendingTasks")}
              value={String(summary?.pendingWorkflowTasks ?? 0)}
            />
            <KpiCard
              title={t("kpiAllTimeShipments")}
              value={String(shipmentCounts?.allTime ?? 0)}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>{t("complianceTrend")}</CardTitle>
                <CardDescription>{t("complianceTrendDesc")}</CardDescription>
              </CardHeader>
              <CardContent className="h-72">
                {compliancePoints.length === 0 ? (
                  <EmptyChart message={t("noScoreHistory")} />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={compliancePoints}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="avgOverallScore"
                        name={t("chartOverall")}
                        stroke="#2563eb"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="avgDocumentationScore"
                        name={t("chartDocumentation")}
                        stroke="#64748b"
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="avgRegulatoryScore"
                        name={t("chartRegulatory")}
                        stroke="#059669"
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("riskDistribution")}</CardTitle>
                <CardDescription>{t("riskDistributionDesc")}</CardDescription>
              </CardHeader>
              <CardContent className="h-72">
                {riskPie.length === 0 ? (
                  <EmptyChart message={t("noRiskAssessments")} />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={riskPie}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                      >
                        {riskPie.map((entry) => (
                          <Cell
                            key={entry.key}
                            fill={
                              RISK_COLORS[entry.key as keyof typeof RISK_COLORS] ??
                              "#94a3b8"
                            }
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t("riskTrend")}</CardTitle>
              <CardDescription>{t("riskTrendDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="h-72">
              {riskPoints.length === 0 ? (
                <EmptyChart message={t("noRiskTrend")} />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={riskPoints}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Bar
                      dataKey="low"
                      stackId="a"
                      fill={RISK_COLORS.low}
                      name={localizedStatus("low")}
                    />
                    <Bar
                      dataKey="medium"
                      stackId="a"
                      fill={RISK_COLORS.medium}
                      name={localizedStatus("medium")}
                    />
                    <Bar
                      dataKey="high"
                      stackId="a"
                      fill={RISK_COLORS.high}
                      name={localizedStatus("high")}
                    />
                    <Bar
                      dataKey="critical"
                      stackId="a"
                      fill={RISK_COLORS.critical}
                      name={localizedStatus("critical")}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("supplierPerformance")}</CardTitle>
              <CardDescription>{t("supplierPerformanceDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">{t("supplier")}</th>
                    <th className="pb-2 pr-4 font-medium">{t("shipmentsCol")}</th>
                    <th className="pb-2 pr-4 font-medium">{t("avgScore")}</th>
                    <th className="pb-2 pr-4 font-medium">{t("discrepanciesCol")}</th>
                    <th className="pb-2 font-medium">{t("riskMix")}</th>
                  </tr>
                </thead>
                <tbody>
                  {supplierRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-muted-foreground">
                        {t("noSuppliers")}
                      </td>
                    </tr>
                  ) : (
                    supplierRows.map((row) => (
                      <tr key={String(row.supplierName)} className="border-b">
                        <td className="py-3 pr-4 font-medium">
                          {String(row.supplierName)}
                        </td>
                        <td className="py-3 pr-4">{String(row.shipmentCount)}</td>
                        <td className="py-3 pr-4">
                          {row.avgPassportScore != null
                            ? String(row.avgPassportScore)
                            : "—"}
                        </td>
                        <td className="py-3 pr-4">{String(row.openDiscrepancies)}</td>
                        <td className="py-3">
                          <RiskMix
                            distribution={
                              row.riskDistribution as Record<string, number>
                            }
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t("productCategories")}</CardTitle>
                <CardDescription>{t("productCategoriesDesc")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {categoryRows.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("noCategories")}</p>
                ) : (
                  categoryRows.map((cat) => (
                    <div key={String(cat.categoryName)} className="rounded-md border p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{String(cat.categoryName)}</span>
                        <Badge variant="outline">
                          {t("shipmentsCount", {
                            count: Number(cat.shipmentCount),
                          })}
                        </Badge>
                      </div>
                      {(cat.commonIssues as Array<{ issue: string; count: number }>)
                        ?.length ? (
                        <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                          {(
                            cat.commonIssues as Array<{ issue: string; count: number }>
                          ).map((issue) => (
                            <li key={issue.issue}>
                              {localizedStatus(issue.issue)} ({issue.count})
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("corridorInsights")}</CardTitle>
                <CardDescription>{t("corridorInsightsDesc")}</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 pr-3 font-medium">{t("route")}</th>
                      <th className="pb-2 pr-3 font-medium">{t("count")}</th>
                      <th className="pb-2 pr-3 font-medium">{t("avgScore")}</th>
                      <th className="pb-2 pr-3 font-medium">{t("routeRisk")}</th>
                      <th className="pb-2 font-medium">{t("docsPercent")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {corridorRows.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-muted-foreground">
                          {t("noCorridorData")}
                        </td>
                      </tr>
                    ) : (
                      corridorRows.map((row) => (
                        <tr key={String(row.routeLabel)} className="border-b">
                          <td className="py-2 pr-3">{String(row.routeLabel)}</td>
                          <td className="py-2 pr-3">{String(row.shipmentCount)}</td>
                          <td className="py-2 pr-3">
                            {row.avgPassportScore != null
                              ? String(row.avgPassportScore)
                              : "—"}
                          </td>
                          <td className="py-2 pr-3">{String(row.routeRiskScore)}</td>
                          <td className="py-2">
                            {row.avgDocumentationCompleteness != null
                              ? `${row.avgDocumentationCompleteness}%`
                              : "—"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t("documentCompleteness")}</CardTitle>
              <CardDescription>
                {t("documentCompletenessDesc", {
                  total: Number(documents?.totalShipments ?? 0),
                  rate: Number(documents?.missingRate ?? 0),
                })}
              </CardDescription>
            </CardHeader>
            <CardContent className="h-64">
              {missingDocs.length === 0 ? (
                <EmptyChart message={t("noShipmentData")} />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={missingDocs.map((d) => ({
                      ...d,
                      label: localizedStatus(String(d.docType)),
                    }))}
                    layout="vertical"
                    margin={{ left: 24 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis type="category" dataKey="label" width={120} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar
                      dataKey="missingCount"
                      fill="#6366f1"
                      name={t("missingCount")}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Discrepancy trend</CardTitle>
                <CardDescription>Open vs resolved by month</CardDescription>
              </CardHeader>
              <CardContent className="h-64">
                {discrepancyTrend.length === 0 ? (
                  <EmptyChart message="No discrepancy history" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={discrepancyTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="open" stackId="a" fill="#ef4444" name="Open" />
                      <Bar dataKey="resolved" stackId="a" fill="#10b981" name="Resolved" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Passport Score dimensions</CardTitle>
                <CardDescription>Average across latest shipment scores</CardDescription>
              </CardHeader>
              <CardContent className="h-64">
                {scoreDimensions?.overall == null ? (
                  <EmptyChart message="No score dimensions yet" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { name: t("chartOverall"), score: scoreDimensions.overall },
                        { name: t("chartDocumentation"), score: scoreDimensions.documentation },
                        { name: "Consistency", score: scoreDimensions.consistency },
                        { name: "Counterparty", score: scoreDimensions.counterparty },
                        { name: t("chartRegulatory"), score: scoreDimensions.regulatory },
                      ].filter((d) => d.score != null)}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="score" fill="#2563eb" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Risk factor scores</CardTitle>
                <CardDescription>Average factor contribution by type</CardDescription>
              </CardHeader>
              <CardContent className="h-64">
                {riskFactors.length === 0 ? (
                  <EmptyChart message="No risk factors yet" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={riskFactors} layout="vertical" margin={{ left: 16 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="label" width={100} tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="avgScore" fill="#f97316" radius={[0, 4, 4, 0]} name="Avg score" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Shipment pipeline</CardTitle>
                <CardDescription>Status breakdown in selected range</CardDescription>
              </CardHeader>
              <CardContent className="h-64">
                {statusBreakdown.length === 0 ? (
                  <EmptyChart message="No shipments in range" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusBreakdown}
                        dataKey="count"
                        nameKey="name"
                        innerRadius={45}
                        outerRadius={75}
                        paddingAngle={2}
                      >
                        {statusBreakdown.map((_, i) => (
                          <Cell
                            key={i}
                            fill={["#64748b", "#2563eb", "#f59e0b", "#10b981", "#ef4444"][i % 5]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {tracking ? (
            <Card>
              <CardHeader>
                <CardTitle>Freight tracking</CardTitle>
                <CardDescription>Container and event summary</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-4">
                  <div>
                    <p className="text-2xl font-bold">{String(tracking.containersTracked ?? 0)}</p>
                    <p className="text-xs text-muted-foreground">Containers</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{String(tracking.shipmentsWithTracking ?? 0)}</p>
                    <p className="text-xs text-muted-foreground">Shipments tracked</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{String(tracking.delayedEvents ?? 0)}</p>
                    <p className="text-xs text-muted-foreground">Delays</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{String(tracking.delivered ?? 0)}</p>
                    <p className="text-xs text-muted-foreground">Deliveries</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}

function KpiCard({
  title,
  value,
  hint,
}: {
  title: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
      {hint ? (
        <CardContent className="pt-0 text-xs text-muted-foreground">{hint}</CardContent>
      ) : null}
    </Card>
  );
}

function RiskMix({ distribution }: { distribution?: Record<string, number> }) {
  if (!distribution) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {Object.entries(distribution).map(([level, count]) =>
        count > 0 ? (
          <span
            key={level}
            className="inline-flex items-center rounded px-1.5 py-0.5 text-xs text-white"
            style={{
              backgroundColor:
                RISK_COLORS[level as keyof typeof RISK_COLORS] ?? "#94a3b8",
            }}
          >
            {level.slice(0, 1).toUpperCase()}:{count}
          </span>
        ) : null
      )}
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${Math.round(value).toLocaleString()}`;
}
