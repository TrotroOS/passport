"use client";

import { AlertTriangle, ShieldAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import type { RiskAssessment, RiskFactor } from "@/types/database";
import { useLocalizedStatus } from "@/lib/i18n/use-localized-status";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface RiskPanelProps {
  assessment: RiskAssessment | null;
  factors: RiskFactor[];
}

function riskColor(level: string): string {
  switch (level) {
    case "low":
      return "text-emerald-600";
    case "medium":
      return "text-amber-600";
    case "high":
      return "text-orange-600";
    case "critical":
      return "text-red-600";
    default:
      return "text-muted-foreground";
  }
}

function riskBadgeVariant(level: string) {
  switch (level) {
    case "low":
      return "success" as const;
    case "medium":
      return "warning" as const;
    case "high":
    case "critical":
      return "destructive" as const;
    default:
      return "secondary" as const;
  }
}

function FactorBar({
  factor,
  label,
}: {
  factor: RiskFactor;
  label: string;
}) {
  const isClassification = factor.factor_type === "classification_risk";
  const hsHint =
    isClassification && Array.isArray(factor.details?.issues)
      ? (factor.details.issues as string[]).slice(0, 2).join("; ")
      : null;

  return (
    <div className="space-y-1" title={hsHint ?? undefined}>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{Math.round(factor.score)}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${
            factor.score >= 60
              ? "bg-red-500"
              : factor.score >= 30
                ? "bg-amber-500"
                : "bg-emerald-500"
          }`}
          style={{ width: `${Math.min(100, factor.score)}%` }}
        />
      </div>
    </div>
  );
}

export function RiskPanel({ assessment, factors }: RiskPanelProps) {
  const t = useTranslations("risk");
  const localizedStatus = useLocalizedStatus();
  const score = assessment?.overall_risk_score ?? null;
  const level = assessment?.risk_level ?? null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-lg">{t("title")}</CardTitle>
        </div>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        {!assessment ? (
          <p className="text-sm text-muted-foreground">{t("noAssessment")}</p>
        ) : (
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <div className="flex shrink-0 flex-col items-center rounded-xl border bg-white px-6 py-4">
              <span
                className={`text-4xl font-bold tabular-nums ${
                  level ? riskColor(level) : "text-muted-foreground"
                }`}
              >
                {score !== null ? Math.round(score) : "—"}
              </span>
              <span className="text-xs text-muted-foreground">{t("riskScore")}</span>
              {level && (
                <Badge variant={riskBadgeVariant(level)} className="mt-2">
                  {localizedStatus(level)}
                </Badge>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                {t("updated", { date: formatDate(assessment.created_at) })}
              </p>
            </div>
            <div className="flex-1 space-y-3">
              {factors.map((factor) => (
                <FactorBar
                  key={factor.id}
                  factor={factor}
                  label={localizedStatus(factor.factor_type)}
                />
              ))}
              {level === "critical" || level === "high" ? (
                <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {t("elevatedWarning")}
                </div>
              ) : null}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
