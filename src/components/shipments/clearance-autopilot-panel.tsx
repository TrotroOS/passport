"use client";

import { useState } from "react";
import { Loader2, PlaneLanding, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { ClearanceStage } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ClearanceAutopilotPanelProps {
  shipmentId: string;
  clearanceStage: ClearanceStage | null;
  clearanceAutopilotAt: string | null;
  clearanceSummary: Record<string, unknown> | null;
  readOnly?: boolean;
}

function stageVariant(stage: ClearanceStage | null) {
  switch (stage) {
    case "cleared_assistive":
      return "success" as const;
    case "review_required":
    case "classifying":
      return "warning" as const;
    case "blocked":
      return "destructive" as const;
    default:
      return "secondary" as const;
  }
}

export function ClearanceAutopilotPanel({
  shipmentId,
  clearanceStage,
  clearanceAutopilotAt,
  clearanceSummary,
  readOnly = false,
}: ClearanceAutopilotPanelProps) {
  const t = useTranslations("clearanceAutopilot");
  const router = useRouter();
  const [isRunning, setIsRunning] = useState(false);

  const reasons = Array.isArray(clearanceSummary?.reasons)
    ? (clearanceSummary?.reasons as string[])
    : [];
  const actions = Array.isArray(clearanceSummary?.recommended_actions)
    ? (clearanceSummary?.recommended_actions as string[])
    : [];

  async function runAutopilot() {
    setIsRunning(true);
    try {
      const response = await fetch(`/api/shipments/${shipmentId}/clearance-autopilot`, {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.error ?? t("runFailed"));
        return;
      }
      toast.success(t("runComplete", { stage: t(`stage.${data.clearance_stage}`) }));
      router.refresh();
    } catch {
      toast.error(t("runFailed"));
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-2">
            <PlaneLanding className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div className="min-w-0">
              <CardTitle className="text-lg">{t("title")}</CardTitle>
              <CardDescription className="mt-1">{t("description")}</CardDescription>
            </div>
          </div>
          {clearanceStage ? (
            <Badge variant={stageVariant(clearanceStage)} className="w-fit shrink-0">
              {t(`stage.${clearanceStage}`)}
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          {t("disclaimer")}
        </p>

        {clearanceAutopilotAt ? (
          <p className="text-xs text-muted-foreground">
            {t("lastRun", {
              date: new Date(clearanceAutopilotAt).toLocaleString(),
            })}
          </p>
        ) : null}

        {reasons.length > 0 ? (
          <ul className="space-y-1 text-sm">
            {reasons.map((reason) => (
              <li key={reason} className="text-muted-foreground">
                • {reason}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">{t("notRunYet")}</p>
        )}

        {actions.length > 0 ? (
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("nextSteps")}
            </p>
            <ul className="space-y-1 text-sm">
              {actions.map((action) => (
                <li key={action}>→ {action}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {!readOnly ? (
          <Button
            type="button"
            onClick={runAutopilot}
            disabled={isRunning}
            className="w-full sm:w-auto"
          >
            {isRunning ? (
              <>
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
                {t("running")}
              </>
            ) : (
              t("runButton")
            )}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
