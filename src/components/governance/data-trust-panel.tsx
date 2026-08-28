"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Database,
  GitBranch,
  RefreshCw,
  ScanSearch,
  ShieldCheck,
  UserCheck,
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
import type { ShipmentTrustReport } from "@/lib/governance/trust-score";
import type { LineageNode } from "@/lib/governance/lineage-builder";

interface DataTrustPanelProps {
  shipmentId: string;
}

function gradeColor(grade: string) {
  switch (grade) {
    case "A":
      return "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100";
    case "B":
      return "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-100";
    case "C":
      return "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100";
    default:
      return "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-100";
  }
}

function DimensionBar({ label, value }: { label: string; value: number }) {
  const color =
    value >= 80 ? "bg-emerald-500" : value >= 60 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function lineageIcon(type: string) {
  switch (type) {
    case "document":
      return Database;
    case "extraction":
      return ScanSearch;
    case "provenance":
      return GitBranch;
    case "screening":
      return ShieldCheck;
    default:
      return GitBranch;
  }
}

export function DataTrustPanel({ shipmentId }: DataTrustPanelProps) {
  const t = useTranslations("governance");
  const [report, setReport] = useState<ShipmentTrustReport | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/shipments/${shipmentId}/trust`);
      if (res.ok) {
        setReport(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }, [shipmentId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !report) {
    return (
      <Card>
        <CardContent className="h-40 animate-pulse pt-6" />
      </Card>
    );
  }

  if (!report) return null;

  const { metrics, quality, lineage, connectedSources, recommendations } = report;

  const timelineNodes = [...lineage.nodes]
    .filter((n) => n.type !== "shipment")
    .sort((a, b) => {
      const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return tb - ta;
    })
    .slice(0, 12);

  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            {t("shipmentTitle")}
          </CardTitle>
          <CardDescription>{t("shipmentDesc")}</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <p className="text-4xl font-bold tracking-tight">{metrics.trustScore}</p>
            <p className="text-xs text-muted-foreground">{t("trustScore")}</p>
          </div>
          <Badge className={cn("px-3 py-1 text-sm", gradeColor(metrics.governanceGrade))}>
            {t("grade")} {metrics.governanceGrade}
          </Badge>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-muted-foreground sm:grid-cols-4">
            <span>{t("lineage")} {metrics.lineageCompleteness}%</span>
            <span>{t("sourceReliability")} {metrics.sourceReliabilityAvg}%</span>
            {metrics.passportScore != null ? (
              <span>{t("passportScore")} {metrics.passportScore}</span>
            ) : null}
            {metrics.aiConfidenceAvg != null ? (
              <span>{t("aiConfidence")} {metrics.aiConfidenceAvg}%</span>
            ) : null}
          </div>
        </div>

        {recommendations.length > 0 ? (
          <div className="rounded-md border border-primary/30 bg-primary/5 p-4">
            <p className="mb-2 flex items-center gap-2 text-sm font-medium">
              <AlertCircle className="h-4 w-4 text-primary" />
              {t("improveTrust")}
            </p>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {recommendations.map((rec) => (
                <li key={rec}>• {rec}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div>
          <p className="mb-3 text-sm font-medium">{t("qualityDimensions")}</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <DimensionBar label={t("dimCompleteness")} value={quality.dimensions.completeness} />
            <DimensionBar label={t("dimAccuracy")} value={quality.dimensions.accuracy} />
            <DimensionBar label={t("dimConsistency")} value={quality.dimensions.consistency} />
            <DimensionBar label={t("dimTimeliness")} value={quality.dimensions.timeliness} />
            <DimensionBar label={t("dimValidity")} value={quality.dimensions.validity} />
          </div>
        </div>

        <div>
          <p className="mb-2 flex items-center gap-2 text-sm font-medium">
            <GitBranch className="h-4 w-4" />
            {t("lineageSummary")}
          </p>
          <div className="grid gap-2 text-sm sm:grid-cols-4">
            <div className="rounded-md border p-3">
              <Database className="mb-1 h-4 w-4 text-muted-foreground" />
              <p className="font-semibold">{lineage.summary.documentCount}</p>
              <p className="text-xs text-muted-foreground">{t("documents")}</p>
            </div>
            <div className="rounded-md border p-3">
              <ScanSearch className="mb-1 h-4 w-4 text-muted-foreground" />
              <p className="font-semibold">{lineage.summary.extractionCount}</p>
              <p className="text-xs text-muted-foreground">{t("extractions")}</p>
            </div>
            <div className="rounded-md border p-3">
              <GitBranch className="mb-1 h-4 w-4 text-muted-foreground" />
              <p className="font-semibold">{lineage.summary.provenanceEventCount}</p>
              <p className="text-xs text-muted-foreground">{t("provenanceEvents")}</p>
            </div>
            <div className="rounded-md border p-3">
              <UserCheck className="mb-1 h-4 w-4 text-muted-foreground" />
              <p className="font-semibold">{quality.indicators.humanOverrideCount}</p>
              <p className="text-xs text-muted-foreground">{t("humanOverrides")}</p>
            </div>
          </div>
        </div>

        {timelineNodes.length > 0 ? (
          <div>
            <p className="mb-3 text-sm font-medium">{t("lineageTimeline")}</p>
            <ul className="relative space-y-0 border-s-2 border-muted ps-4">
              {timelineNodes.map((node: LineageNode) => {
                const Icon = lineageIcon(node.type);
                return (
                  <li key={node.id} className="relative pb-4 last:pb-0">
                    <span className="absolute -start-[1.35rem] top-1 flex h-5 w-5 items-center justify-center rounded-full border bg-background">
                      <Icon className="h-3 w-3 text-muted-foreground" />
                    </span>
                    <div className="rounded-md border p-2 text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium capitalize">{node.label}</span>
                        <Badge variant="outline" className="text-xs capitalize">
                          {node.type.replace(/_/g, " ")}
                        </Badge>
                        {node.sourceName ? (
                          <span className="text-xs text-muted-foreground">{node.sourceName}</span>
                        ) : null}
                      </div>
                      {node.timestamp ? (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {formatDate(node.timestamp)}
                          {node.confidence != null
                            ? ` · ${Math.round(node.confidence * 100)}%`
                            : null}
                        </p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        {connectedSources.length > 0 ? (
          <div>
            <p className="mb-2 text-sm font-medium">{t("connectedSources")}</p>
            <div className="flex flex-wrap gap-2">
              {connectedSources.map((src) => (
                <Badge key={src.id} variant="outline" title={src.description ?? undefined}>
                  {src.name}
                  <span className="ms-1 text-muted-foreground">({src.reliability_score}%)</span>
                </Badge>
              ))}
            </div>
          </div>
        ) : null}

        {quality.issues.length > 0 ? (
          <ul className="space-y-1 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
            {quality.issues.map((issue) => (
              <li key={issue}>• {issue}</li>
            ))}
          </ul>
        ) : null}

        <Button variant="outline" size="sm" asChild>
          <Link href="/analytics/governance">{t("viewOrgGovernance")}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
