"use client";

import { useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { PassportScore } from "@/types/database";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface PassportScoreCardProps {
  shipmentId: string;
  score: PassportScore | null;
  criticalCount: number;
  failedRegulatoryCount?: number;
  readOnly?: boolean;
}

function scoreColor(score: number): string {
  if (score >= 80) return "text-emerald-600";
  if (score >= 60) return "text-amber-600";
  return "text-red-600";
}

function ScoreBar({
  label,
  value,
}: {
  label: string;
  value: number | null;
}) {
  const v = value ?? 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{v}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all ${
            v >= 80
              ? "bg-emerald-500"
              : v >= 60
                ? "bg-amber-500"
                : "bg-red-500"
          }`}
          style={{ width: `${Math.min(100, v)}%` }}
        />
      </div>
    </div>
  );
}

export function PassportScoreCard({
  shipmentId,
  score,
  criticalCount,
  failedRegulatoryCount = 0,
  readOnly = false,
}: PassportScoreCardProps) {
  const [isRunning, setIsRunning] = useState(false);
  const t = useTranslations("score");

  async function runVerification() {
    setIsRunning(true);
    try {
      const response = await fetch(`/api/shipments/${shipmentId}/verify`, {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error ?? t("verificationFailed"));
        return;
      }
      toast.success(t("verificationComplete", { score: data.overall_score }));
      window.location.reload();
    } catch {
      toast.error(t("verificationFailed"));
    } finally {
      setIsRunning(false);
    }
  }

  const overall = score?.overall_score ?? null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <CardTitle>{t("title")}</CardTitle>
          </div>
          {!readOnly ? (
            <Button
              variant="outline"
              size="sm"
              onClick={runVerification}
              disabled={isRunning}
            >
              {isRunning ? (
                <>
                  <Loader2 className="me-1 h-3 w-3 animate-spin" />
                  {t("running")}
                </>
              ) : (
                t("runVerification")
              )}
            </Button>
          ) : null}
        </div>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="flex shrink-0 flex-col items-center justify-center rounded-xl border bg-white px-8 py-4">
            <span
              className={`text-5xl font-bold tabular-nums ${
                overall !== null ? scoreColor(overall) : "text-muted-foreground"
              }`}
            >
              {overall !== null ? overall : "—"}
            </span>
            <span className="text-xs text-muted-foreground">{t("overall")}</span>
          </div>
          <div className="flex-1 space-y-3">
            <ScoreBar
              label={t("documentation")}
              value={score?.documentation_score ?? null}
            />
            <ScoreBar
              label={t("consistency")}
              value={score?.consistency_score ?? null}
            />
            <ScoreBar
              label={t("counterparty")}
              value={score?.counterparty_score ?? null}
            />
            <ScoreBar
              label={t("regulatory")}
              value={score?.regulatory_score ?? null}
            />
          </div>
        </div>
        {criticalCount > 0 && (
          <p className="mt-4 text-sm font-medium text-red-600">
            {t("criticalDiscrepancies", { count: criticalCount })}
          </p>
        )}
        {failedRegulatoryCount > 0 && (
          <p className="mt-2 text-sm font-medium text-red-600">
            {t("failedRegulatory", { count: failedRegulatoryCount })}
          </p>
        )}
        {!score && (
          <p className="mt-4 text-sm text-muted-foreground">{t("noRunYet")}</p>
        )}
      </CardContent>
    </Card>
  );
}
