"use client";

import { useState } from "react";
import { CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { Discrepancy } from "@/types/database";
import { useLocalizedStatus } from "@/lib/i18n/use-localized-status";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface DiscrepanciesPanelProps {
  openDiscrepancies: Discrepancy[];
  resolvedDiscrepancies: Discrepancy[];
}

function SeverityBadge({ severity }: { severity: string }) {
  const t = useTranslations("discrepancies");
  switch (severity) {
    case "critical":
      return <Badge variant="destructive">{t("critical")}</Badge>;
    case "warning":
      return <Badge variant="warning">{t("warning")}</Badge>;
    default:
      return <Badge variant="secondary">{t("info")}</Badge>;
  }
}

function DiscrepancyItem({
  discrepancy,
  showActions,
}: {
  discrepancy: Discrepancy;
  showActions: boolean;
}) {
  const t = useTranslations("discrepancies");
  const localizedStatus = useLocalizedStatus();
  const [isLoading, setIsLoading] = useState(false);

  async function handleAction(action: "resolve" | "ignore") {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/discrepancies/${discrepancy.id}/${action}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error ?? t("actionFailed"));
        return;
      }
      toast.success(action === "resolve" ? t("resolvedToast") : t("ignoredToast"));
      window.location.reload();
    } catch {
      toast.error(t("actionFailed"));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <li className="rounded-md border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <SeverityBadge severity={discrepancy.severity} />
            <span className="text-xs text-muted-foreground">
              {localizedStatus(discrepancy.discrepancy_type)}
            </span>
          </div>
          <p className="mt-2 text-sm">{discrepancy.description}</p>
          {Object.keys(discrepancy.values).length > 0 && (
            <pre className="mt-2 max-h-24 overflow-auto rounded bg-slate-50 p-2 text-xs">
              {JSON.stringify(discrepancy.values, null, 2)}
            </pre>
          )}
          {discrepancy.status !== "open" && (
            <p className="mt-1 text-xs text-muted-foreground">
              {discrepancy.status === "resolved"
                ? t("resolvedAt", {
                    date: discrepancy.resolved_at
                      ? formatDate(discrepancy.resolved_at)
                      : "",
                  })
                : t("ignoredAt", {
                    date: discrepancy.resolved_at
                      ? formatDate(discrepancy.resolved_at)
                      : "",
                  })}
            </p>
          )}
        </div>
        {showActions && (
          <div className="flex shrink-0 gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={isLoading}
              onClick={() => handleAction("resolve")}
            >
              {t("resolve")}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={isLoading}
              onClick={() => handleAction("ignore")}
            >
              {t("ignore")}
            </Button>
          </div>
        )}
      </div>
    </li>
  );
}

export function DiscrepanciesPanel({
  openDiscrepancies,
  resolvedDiscrepancies,
}: DiscrepanciesPanelProps) {
  const t = useTranslations("discrepancies");
  const [showHistory, setShowHistory] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {openDiscrepancies.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-emerald-600">
            <CheckCircle2 className="h-4 w-4" />
            {t("noActive")}
          </div>
        ) : (
          <ul className="space-y-3">
            {openDiscrepancies.map((d) => (
              <DiscrepancyItem key={d.id} discrepancy={d} showActions />
            ))}
          </ul>
        )}

        {resolvedDiscrepancies.length > 0 && (
          <div>
            <button
              type="button"
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              onClick={() => setShowHistory(!showHistory)}
            >
              {showHistory ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
              {t("historyCount", { count: resolvedDiscrepancies.length })}
            </button>
            {showHistory && (
              <ul className="mt-3 space-y-2">
                {resolvedDiscrepancies.map((d) => (
                  <DiscrepancyItem
                    key={d.id}
                    discrepancy={d}
                    showActions={false}
                  />
                ))}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
