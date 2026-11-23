"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { Discrepancy } from "@/types/database";
import { useLocalizedStatus } from "@/lib/i18n/use-localized-status";
import { maskClientError } from "@/lib/security/mask-client-error";
import {
  formatDiscrepancyComparisons,
  sanitizeDiscrepancyDescription,
} from "@/lib/shipments/discrepancy-display";
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
  canAct?: boolean;
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
  canAct,
}: {
  discrepancy: Discrepancy;
  canAct: boolean;
}) {
  const t = useTranslations("discrepancies");
  const localizedStatus = useLocalizedStatus();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [ignoring, setIgnoring] = useState(false);
  const [note, setNote] = useState("");

  const comparisons = formatDiscrepancyComparisons(discrepancy.values);
  const description = sanitizeDiscrepancyDescription(discrepancy.description);

  async function handleAction(action: "resolve" | "ignore") {
    if (action === "ignore" && !note.trim()) {
      setIgnoring(true);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/discrepancies/${discrepancy.id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resolution_note: note.trim() || undefined,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: unknown };
      if (!response.ok) {
        toast.error(maskClientError(data.error, t("actionFailed")));
        return;
      }
      toast.success(action === "resolve" ? t("resolvedToast") : t("ignoredToast"));
      router.refresh();
    } catch {
      toast.error(t("actionFailed"));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <li className="rounded-md border p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <SeverityBadge severity={discrepancy.severity} />
            <span className="text-sm font-medium">
              {localizedStatus(discrepancy.discrepancy_type)}
            </span>
          </div>
          {description ? <p className="mt-2 text-sm text-foreground">{description}</p> : null}
          {comparisons.length > 0 ? (
            <dl className="mt-3 grid gap-2 sm:grid-cols-2">
              {comparisons.map((row) => (
                <div key={row.label} className="rounded-md bg-muted/60 px-3 py-2">
                  <dt className="text-xs text-muted-foreground">{row.label}</dt>
                  <dd className="text-sm font-medium">{row.display}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
        {canAct ? (
          <div className="flex shrink-0 flex-col gap-2">
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
        ) : null}
      </div>
      {ignoring ? (
        <div className="mt-3 space-y-2">
          <label className="text-xs text-muted-foreground" htmlFor={`ignore-note-${discrepancy.id}`}>
            {t("ignoreNoteLabel")}
          </label>
          <textarea
            id={`ignore-note-${discrepancy.id}`}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            rows={2}
            maxLength={500}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
          <Button
            size="sm"
            disabled={isLoading || !note.trim()}
            onClick={() => handleAction("ignore")}
          >
            {t("confirmIgnore")}
          </Button>
        </div>
      ) : null}
    </li>
  );
}

function severityRank(severity: string): number {
  if (severity === "critical") return 0;
  if (severity === "warning") return 1;
  return 2;
}

export function DiscrepanciesPanel({
  openDiscrepancies,
  resolvedDiscrepancies,
  canAct = true,
}: DiscrepanciesPanelProps) {
  const t = useTranslations("discrepancies");

  if (openDiscrepancies.length === 0) {
    return null;
  }

  const sorted = openDiscrepancies.slice().sort(
    (a, b) => severityRank(a.severity) - severityRank(b.severity)
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t("title")}</CardTitle>
        <CardDescription>
          {t("description")}
          {resolvedDiscrepancies.length > 0
            ? ` — ${t("historyHidden", { count: resolvedDiscrepancies.length })}`
            : null}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {sorted.map((item) => (
            <DiscrepancyItem key={item.id} discrepancy={item} canAct={canAct} />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
