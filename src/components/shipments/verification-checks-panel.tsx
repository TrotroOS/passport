"use client";

import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  XCircle,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { VerificationCheck } from "@/types/database";
import { useLocalizedStatus } from "@/lib/i18n/use-localized-status";
import { verificationSummary } from "@/lib/shipments/verification-display";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface VerificationChecksPanelProps {
  checks: VerificationCheck[];
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "passed":
      return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
    case "failed":
      return <XCircle className="h-4 w-4 text-red-600" />;
    case "warning":
    case "needs_review":
      return <AlertTriangle className="h-4 w-4 text-amber-600" />;
    default:
      return <HelpCircle className="h-4 w-4 text-muted-foreground" />;
  }
}

function CheckItem({ check }: { check: VerificationCheck }) {
  const localizedStatus = useLocalizedStatus();
  const summary = verificationSummary(check.details);
  const showDetail = Boolean(summary.message || summary.rows.length);

  return (
    <li className="rounded-md border p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <StatusIcon status={check.status} />
          <div className="min-w-0">
            <span className="text-sm font-medium">
              {localizedStatus(check.check_type)}
            </span>
            {showDetail ? (
              <div className="mt-1 space-y-1">
                {summary.message ? (
                  <p className="text-xs text-muted-foreground">{summary.message}</p>
                ) : null}
                {summary.rows.length > 0 ? (
                  <ul className="text-xs text-muted-foreground">
                    {summary.rows.slice(0, 4).map((row) => (
                      <li key={row.label}>
                        {row.label}: {row.display}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
        <Badge
          variant={
            check.severity === "critical"
              ? "destructive"
              : check.severity === "warning"
                ? "warning"
                : "secondary"
          }
        >
          {localizedStatus(check.status)}
        </Badge>
      </div>
    </li>
  );
}

export function VerificationChecksPanel({
  checks,
}: VerificationChecksPanelProps) {
  const t = useTranslations("verification");
  const [showPassed, setShowPassed] = useState(false);

  const attention = checks.filter((check) => check.status !== "passed");
  const passed = checks.filter((check) => check.status === "passed");

  if (attention.length === 0) {
    return null;
  }

  const shown = showPassed ? checks : attention;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t("title")}</CardTitle>
        <CardDescription>
          {t("attentionCount", { count: attention.length })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <ul className="space-y-2">
          {shown.map((check) => (
            <CheckItem key={check.id} check={check} />
          ))}
        </ul>
        {passed.length > 0 ? (
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setShowPassed((value) => !value)}
          >
            {showPassed
              ? t("hidePassed")
              : t("showPassed", { count: passed.length })}
          </button>
        ) : null}
      </CardContent>
    </Card>
  );
}
