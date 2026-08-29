"use client";

import { useState } from "react";
import {
  CheckCircle2,
  ExternalLink,
  Loader2,
  Scale,
  XCircle,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { RegulatoryCheckWithRegulation } from "@/types/database";
import { useLocalizedStatus } from "@/lib/i18n/use-localized-status";
import {
  describeImportCorridor,
  supportedCorridorLabels,
} from "@/lib/regulatory/jurisdiction";
import { isSafeHttpUrl } from "@/lib/security/sanitize-text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EditShipmentRouteForm } from "@/components/shipments/edit-shipment-route-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface CompliancePanelProps {
  shipmentId: string;
  checks: RegulatoryCheckWithRegulation[];
  destinationCountry?: string | null;
  originCountry?: string | null;
  readOnly?: boolean;
}

function statusIcon(status: string) {
  switch (status) {
    case "passed":
      return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
    case "failed":
      return <XCircle className="h-4 w-4 text-red-600" />;
    default:
      return <Scale className="h-4 w-4 text-amber-600" />;
  }
}

function statusVariant(status: string) {
  switch (status) {
    case "passed":
      return "success" as const;
    case "failed":
      return "destructive" as const;
    case "needs_review":
      return "warning" as const;
    default:
      return "secondary" as const;
  }
}

export function CompliancePanel({
  shipmentId,
  checks,
  destinationCountry = null,
  originCountry = null,
  readOnly = false,
}: CompliancePanelProps) {
  const t = useTranslations("compliance");
  const localizedStatus = useLocalizedStatus();
  const [isRunning, setIsRunning] = useState(false);
  const failedCount = checks.filter((c) => c.status === "failed").length;
  const corridor = describeImportCorridor(destinationCountry);
  const corridors = supportedCorridorLabels();

  async function runRegulatory() {
    setIsRunning(true);
    try {
      const response = await fetch(
        `/api/shipments/${shipmentId}/run-regulatory`,
        { method: "POST" }
      );
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error ?? t("checkFailed"));
        return;
      }
      toast.success(t("checkComplete", { score: data.regulatory_score }));
      window.location.reload();
    } catch {
      toast.error(t("checkFailed"));
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-center gap-2">
            <Scale className="h-5 w-5 shrink-0 text-muted-foreground" />
            <CardTitle className="text-lg">{t("title")}</CardTitle>
          </div>
          {!readOnly ? (
            <Button
              variant="outline"
              size="sm"
              onClick={runRegulatory}
              disabled={isRunning || !corridor.supported}
              className="w-full shrink-0 sm:w-auto"
            >
              {isRunning ? (
                <>
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  {t("running")}
                </>
              ) : (
                t("runChecks")
              )}
            </Button>
          ) : null}
        </div>
        <CardDescription>
          {corridor.supported
            ? t("descriptionSupported", { corridor: corridor.label ?? corridors })
            : t("description")}
          {failedCount > 0 && (
            <span className="ml-1 font-medium text-red-600">
              — {t("failedCount", { count: failedCount })}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!corridor.supported ? (
          <div className="space-y-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-950">
            <p>
              {t("unsupportedCorridor", {
                destination: corridor.destination ?? t("unknownDestination"),
                corridors,
              })}
            </p>
            {!readOnly ? (
              <div>
                <p className="mb-2 font-medium">{t("fixCorridorPrompt")}</p>
                <EditShipmentRouteForm
                  shipmentId={shipmentId}
                  originCountry={originCountry}
                  destinationCountry={destinationCountry}
                  compact
                />
              </div>
            ) : null}
          </div>
        ) : checks.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("noChecksYet", { corridor: corridor.label ?? corridors })}
          </p>
        ) : (
          <ul className="space-y-3">
            {checks.map((check) => {
              const regulation = check.regulations;
              const details = check.details ?? {};
              const sourceUrlRaw =
                (details.source_url as string) ?? regulation?.source_url;
              const sourceUrl =
                typeof sourceUrlRaw === "string" && isSafeHttpUrl(sourceUrlRaw)
                  ? sourceUrlRaw
                  : null;
              const authority =
                (details.authority as string) ?? regulation?.authority;

              return (
                <li key={check.id} className="rounded-md border p-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 items-start gap-2">
                      {statusIcon(check.status)}
                      <div className="min-w-0">
                        <p className="font-medium">
                          {regulation?.title ??
                            (details.regulation_title as string) ??
                            check.check_type}
                        </p>
                        {regulation?.description && (
                          <p className="mt-1 text-sm text-muted-foreground">
                            {regulation.description}
                          </p>
                        )}
                        {authority && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {t("authority", { name: authority })}
                          </p>
                        )}
                        {typeof details.source_text === "string" && details.source_text && (
                          <p className="mt-1 text-xs italic text-muted-foreground">
                            &ldquo;{details.source_text}&rdquo;
                          </p>
                        )}
                        {sourceUrl && (
                          <a
                            href={sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            {t("source")}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>
                    <Badge variant={statusVariant(check.status)} className="shrink-0 self-start">
                      {localizedStatus(check.status)}
                    </Badge>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
