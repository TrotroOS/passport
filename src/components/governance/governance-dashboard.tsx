"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Database,
  GitBranch,
  Plug,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, formatDate } from "@/lib/utils";
import { isSafeHttpUrl } from "@/lib/security/sanitize-text";
import type {
  ConnectorStatus,
  OrgGovernanceSummary,
  ProvenanceFeedItem,
  ShipmentTrustRanking,
} from "@/lib/governance/trust-score";
import type { TrustedSource } from "@/types/database";

const SOURCE_TYPES = [
  "all",
  "sanctions",
  "regulatory",
  "tariff",
  "hs_reference",
  "ai",
  "human",
  "system",
  "tracking",
] as const;

function gradeColor(grade: string) {
  switch (grade) {
    case "A":
      return "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100";
    case "B":
      return "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-100";
    case "C":
      return "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100";
    case "D":
      return "bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-100";
    default:
      return "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-100";
  }
}

function DimensionBar({ label, value }: { label: string; value: number }) {
  const color =
    value >= 80 ? "bg-emerald-500" : value >= 60 ? "bg-amber-500" : "bg-red-500";

  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export function GovernanceDashboard() {
  const t = useTranslations("governance");
  const [data, setData] = useState<{
    governance: OrgGovernanceSummary;
    quality: {
      avgQuality: number;
      avgCompleteness: number;
      avgHumanOverrideRate: number;
      shipmentCount: number;
    };
  } | null>(null);
  const [sourceFilter, setSourceFilter] = useState<(typeof SOURCE_TYPES)[number]>("all");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/analytics/data-trust");
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredSources = useMemo(() => {
    if (!data) return [];
    const catalog = data.governance.connectedSourceCatalog;
    if (sourceFilter === "all") return catalog;
    return catalog.filter((src) => src.source_type === sourceFilter);
  }, [data, sourceFilter]);

  if (loading && !data) {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="h-32 animate-pulse pt-6" />
          </Card>
        ))}
      </div>
    );
  }

  if (!data) return null;

  const { governance, quality } = data;
  const maxTrend = Math.max(...governance.trustTrend.map((p) => p.avgTrust), 1);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={cn("me-2 h-4 w-4", loading && "animate-spin")} />
          {t("refresh")}
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("kpiTrust")}</CardDescription>
            <CardTitle className="text-3xl">{governance.avgTrustScore ?? "—"}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {t("kpiTrustHint", { count: governance.snapshotCount })}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("kpiQuality")}</CardDescription>
            <CardTitle className="text-3xl">
              {governance.avgDataQuality ?? quality.avgQuality}%
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {t("kpiQualityHint", { count: quality.shipmentCount })}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("kpiProvenance")}</CardDescription>
            <CardTitle className="text-3xl">{governance.provenanceEventCount}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">{t("kpiProvenanceHint")}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("kpiOverride")}</CardDescription>
            <CardTitle className="text-3xl">
              {Math.round(quality.avgHumanOverrideRate * 100)}%
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">{t("kpiOverrideHint")}</CardContent>
        </Card>
      </div>

      {governance.recommendations.length > 0 ? (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertCircle className="h-4 w-4 text-primary" />
              {t("recommendations")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {governance.recommendations.map((rec) => (
                <li key={rec}>• {rec}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4" />
              {t("trustTrend")}
            </CardTitle>
            <CardDescription>{t("trustTrendDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            {governance.trustTrend.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noTrend")}</p>
            ) : (
              <div className="flex h-32 items-end gap-2">
                {governance.trustTrend.map((point) => (
                  <div key={point.label} className="flex flex-1 flex-col items-center gap-1">
                    <span className="text-xs font-medium">{point.avgTrust}</span>
                    <div
                      className="w-full rounded-t bg-primary/80"
                      style={{ height: `${(point.avgTrust / maxTrend) * 100}%`, minHeight: 4 }}
                    />
                    <span className="text-[10px] text-muted-foreground">
                      {point.label.slice(5)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("gradeDistribution")}</CardTitle>
            <CardDescription>{t("gradeDistributionDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {(["A", "B", "C", "D", "F"] as const).map((grade) => (
                <div key={grade} className="flex flex-col items-center gap-1">
                  <Badge className={cn("px-3 py-1", gradeColor(grade))}>{grade}</Badge>
                  <span className="text-lg font-bold">
                    {governance.gradeDistribution[grade] ?? 0}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("qualityDimensions")}</CardTitle>
          <CardDescription>{t("qualityDimensionsDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <DimensionBar label={t("dimCompleteness")} value={governance.qualityDimensions.completeness} />
          <DimensionBar label={t("dimAccuracy")} value={governance.qualityDimensions.accuracy} />
          <DimensionBar label={t("dimConsistency")} value={governance.qualityDimensions.consistency} />
          <DimensionBar label={t("dimTimeliness")} value={governance.qualityDimensions.timeliness} />
          <DimensionBar label={t("dimValidity")} value={governance.qualityDimensions.validity} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4" />
              {t("lowTrustShipments")}
            </CardTitle>
            <CardDescription>{t("lowTrustShipmentsDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            {governance.shipmentRankings.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noShipments")}</p>
            ) : (
              <ul className="space-y-2">
                {governance.shipmentRankings.map((row: ShipmentTrustRanking) => (
                  <li key={row.shipment_id}>
                    <Link
                      href={`/shipments/${row.shipment_id}`}
                      className="flex items-center justify-between rounded-md border p-3 text-sm transition hover:bg-accent"
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{row.shipment_ref}</Badge>
                        <Badge className={gradeColor(row.governance_grade)}>
                          {row.governance_grade}
                        </Badge>
                      </div>
                      <span className="font-semibold">{row.trust_score}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Plug className="h-4 w-4" />
              {t("connectors")}
            </CardTitle>
            <CardDescription>{t("connectorsDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {governance.connectors.map((connector: ConnectorStatus) => (
              <div
                key={connector.id}
                className="flex items-start justify-between gap-3 rounded-md border p-3 text-sm"
              >
                <div>
                  <p className="font-medium">{connector.name}</p>
                  <p className="text-xs text-muted-foreground">{connector.description}</p>
                </div>
                <Badge variant={connector.connected ? "default" : "secondary"}>
                  {connector.connected ? t("connected") : t("notConnected")}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <GitBranch className="h-4 w-4" />
            {t("provenanceFeed")}
          </CardTitle>
          <CardDescription>{t("provenanceFeedDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {governance.recentProvenance.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noProvenance")}</p>
          ) : (
            <ul className="space-y-2">
              {governance.recentProvenance.map((event: ProvenanceFeedItem) => (
                <li key={event.id} className="rounded-md border p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{event.source_name}</Badge>
                    {event.shipment_ref ? (
                      <Link
                        href={event.shipment_id ? `/shipments/${event.shipment_id}` : "#"}
                        className="font-medium text-primary hover:underline"
                      >
                        {event.shipment_ref}
                      </Link>
                    ) : null}
                    <span className="text-muted-foreground">
                      {event.field_path ?? event.entity_type}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {event.transformation?.replace(/_/g, " ") ?? t("recorded")} ·{" "}
                    {formatDate(event.recorded_at)}
                    {event.confidence != null
                      ? ` · ${Math.round(event.confidence * 100)}% confidence`
                      : null}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className="h-4 w-4" />
            {t("sourceCatalog")}
          </CardTitle>
          <CardDescription>{t("sourceCatalogDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap gap-2">
            {SOURCE_TYPES.map((type) => (
              <Button
                key={type}
                variant={sourceFilter === type ? "default" : "outline"}
                size="sm"
                className="h-8 capitalize"
                onClick={() => setSourceFilter(type)}
              >
                {type === "all" ? t("allSources") : type.replace(/_/g, " ")}
                {type !== "all" && data.governance.sourcesByType[type] ? (
                  <Badge variant="secondary" className="ms-2 px-1.5 py-0 text-xs">
                    {data.governance.sourcesByType[type]}
                  </Badge>
                ) : null}
              </Button>
            ))}
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {filteredSources.map((src: TrustedSource) => (
              <li key={src.id} className="rounded-md border p-3 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium">{src.name}</span>
                  <Badge variant="outline">{src.reliability_score}%</Badge>
                </div>
                <p className="mt-1 text-xs capitalize text-muted-foreground">
                  {src.source_type.replace(/_/g, " ")}
                  {src.authority ? ` · ${src.authority}` : null}
                </p>
                {src.base_url && isSafeHttpUrl(src.base_url) ? (
                  <Link
                    href={src.base_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-block text-xs text-primary hover:underline"
                  >
                    {t("viewSource")} →
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
