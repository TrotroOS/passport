"use client";

import { useEffect, useState } from "react";
import { Brain, Shield, TrendingUp, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import type { CorridorMoatInsights } from "@/lib/moat/corridor-intelligence";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface CorridorMoatPanelProps {
  shipmentId: string;
}

function strengthVariant(strength: CorridorMoatInsights["moat_strength"]) {
  switch (strength) {
    case "strong":
      return "success" as const;
    case "developing":
      return "warning" as const;
    default:
      return "secondary" as const;
  }
}

function partySignalVariant(signal: string) {
  switch (signal) {
    case "trusted":
      return "success" as const;
    case "high_risk":
      return "destructive" as const;
    case "watch":
      return "warning" as const;
    default:
      return "outline" as const;
  }
}

export function CorridorMoatPanel({ shipmentId }: CorridorMoatPanelProps) {
  const t = useTranslations("corridorMoat");
  const [insights, setInsights] = useState<CorridorMoatInsights | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/shipments/${shipmentId}/corridor-intelligence`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!cancelled && json?.data) setInsights(json.data as CorridorMoatInsights);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [shipmentId]);

  if (loading) {
    return (
      <Card className="min-w-0 overflow-hidden">
        <CardHeader>
          <CardTitle className="text-lg">{t("title")}</CardTitle>
          <CardDescription>{t("loading")}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!insights) return null;

  return (
    <Card className="min-w-0 overflow-hidden border-primary/20 bg-gradient-to-br from-background to-primary/5">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-2">
            <Brain className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <CardTitle className="text-lg">{t("title")}</CardTitle>
              <CardDescription className="mt-1">{t("description")}</CardDescription>
            </div>
          </div>
          <Badge variant={strengthVariant(insights.moat_strength)} className="w-fit shrink-0">
            {insights.moat_label} · {insights.moat_score}%
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {insights.jurisdiction_label ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border bg-card/80 p-3">
              <p className="text-xs text-muted-foreground">{t("corridor")}</p>
              <p className="font-semibold">{insights.jurisdiction_label}</p>
            </div>
            <div className="rounded-lg border bg-card/80 p-3">
              <p className="text-xs text-muted-foreground">{t("benchmark")}</p>
              <p className="font-semibold">
                {insights.platform_benchmark?.benchmark_passport_score ?? "—"}
              </p>
            </div>
            <div className="rounded-lg border bg-card/80 p-3">
              <p className="text-xs text-muted-foreground">{t("yourAvg")}</p>
              <p className="font-semibold">
                {insights.org_profile?.avg_passport_score ?? "—"}
              </p>
            </div>
          </div>
        ) : null}

        {insights.shipment_score != null && insights.platform_benchmark ? (
          <p className="flex items-center gap-2 text-sm">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            {t(`comparison.${insights.score_comparison}`, {
              score: insights.shipment_score,
              benchmark: insights.platform_benchmark.benchmark_passport_score,
            })}
          </p>
        ) : null}

        {insights.party_insights.length > 0 ? (
          <div>
            <p className="mb-2 flex items-center gap-2 text-sm font-medium">
              <Users className="h-4 w-4" />
              {t("counterpartyMemory")}
            </p>
            <ul className="space-y-2">
              {insights.party_insights.map((party) => (
                <li
                  key={party.party_id}
                  className="flex flex-col gap-2 rounded-md border bg-card/60 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{party.name}</p>
                    <p className="text-xs text-muted-foreground">{party.role}</p>
                  </div>
                  <Badge variant={partySignalVariant(party.signal)} className="w-fit">
                    {t(`partySignal.${party.signal}`)}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {insights.playbook_tips.length > 0 ? (
          <div>
            <p className="mb-2 text-sm font-medium">{t("playbook")}</p>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {insights.playbook_tips.map((tip) => (
                <li key={tip}>• {tip}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {insights.advantages.length > 0 ? (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
            <p className="mb-2 flex items-center gap-2 text-sm font-medium">
              <Shield className="h-4 w-4 text-primary" />
              {t("moatAdvantage")}
            </p>
            <ul className="space-y-1 text-sm">
              {insights.advantages.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
