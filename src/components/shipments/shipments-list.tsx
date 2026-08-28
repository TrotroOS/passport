"use client";

import Link from "next/link";
import { Plus, Ship, FileText, AlertTriangle, ListTodo, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ShipmentWithSummary } from "@/lib/shipments/dashboard-summaries";
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

interface ShipmentsListProps {
  shipments: ShipmentWithSummary[];
}

function statusVariant(status: string) {
  switch (status) {
    case "ready":
      return "success" as const;
    case "blocked":
      return "destructive" as const;
    case "in_review":
      return "warning" as const;
    default:
      return "secondary" as const;
  }
}

function scoreColor(score: number): string {
  if (score >= 80) return "text-emerald-600";
  if (score >= 60) return "text-amber-600";
  return "text-red-600";
}

function riskVariant(level: string) {
  switch (level) {
    case "critical":
    case "high":
      return "destructive" as const;
    case "medium":
      return "warning" as const;
    case "low":
      return "success" as const;
    default:
      return "secondary" as const;
  }
}

export function ShipmentsList({ shipments }: ShipmentsListProps) {
  const t = useTranslations("dashboard");
  const tNav = useTranslations("nav");
  const tScore = useTranslations("score");
  const localizedStatus = useLocalizedStatus();

  if (shipments.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Ship className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-semibold">{t("emptyTitle")}</h3>
          <p className="mb-6 text-center text-sm text-muted-foreground">
            {t("emptyDescription")}
          </p>
          <Button asChild>
            <Link href="/shipments/new">
              <Plus className="me-2 h-4 w-4" />
              {tNav("newShipment")}
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="min-w-0 space-y-3">
      {shipments.map((shipment) => (
        <Link key={shipment.id} href={`/shipments/${shipment.id}`} className="block min-w-0">
          <Card className="min-w-0 overflow-hidden transition-colors hover:border-primary/30 hover:bg-slate-50">
            <CardHeader className="pb-2">
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <CardTitle className="truncate text-lg">{shipment.shipment_ref}</CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                  {shipment.riskLevel ? (
                    <Badge variant={riskVariant(shipment.riskLevel)}>
                      {localizedStatus(shipment.riskLevel)}
                    </Badge>
                  ) : null}
                  <Badge variant={statusVariant(shipment.status)}>
                    {localizedStatus(shipment.status)}
                  </Badge>
                </div>
              </div>
              <CardDescription>
                {shipment.origin_country ?? "—"} → {shipment.destination_country ?? "—"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-4 text-sm">
                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <ShieldCheck className="h-4 w-4" />
                  {tScore("title")}:{" "}
                  {shipment.overallScore != null ? (
                    <span className={`font-semibold ${scoreColor(shipment.overallScore)}`}>
                      {shipment.overallScore}
                    </span>
                  ) : (
                    <span>{t("notVerified")}</span>
                  )}
                </span>
                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  {t("documentCount", { count: shipment.documentCount })}
                </span>
                {shipment.openDiscrepancies > 0 ? (
                  <span className="inline-flex items-center gap-1.5 text-amber-700">
                    <AlertTriangle className="h-4 w-4" />
                    {t("openDiscrepancies", { count: shipment.openDiscrepancies })}
                  </span>
                ) : null}
                {shipment.pendingTasks > 0 ? (
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <ListTodo className="h-4 w-4" />
                    {t("pendingTasks", { count: shipment.pendingTasks })}
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">
                {t("createdAt", { date: formatDate(shipment.created_at) })}
              </p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
