"use client";

import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  XCircle,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { VerificationCheck } from "@/types/database";
import { useLocalizedStatus } from "@/lib/i18n/use-localized-status";
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
  const t = useTranslations("verification");
  const localizedStatus = useLocalizedStatus();
  const [expanded, setExpanded] = useState(false);

  return (
    <li className="rounded-md border">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 p-3 text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <StatusIcon status={check.status} />
          <div>
            <span className="text-sm font-medium">
              {localizedStatus(check.check_type)}
            </span>
            <p className="text-xs text-muted-foreground">{check.check_id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
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
          {expanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </div>
      </button>
      {expanded && (
        <div className="border-t bg-slate-50 p-3">
          <pre className="max-h-48 overflow-auto text-xs">
            {JSON.stringify(check.details, null, 2)}
          </pre>
          {check.document_ids.length > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              {t("documentsLabel", { ids: check.document_ids.join(", ") })}
            </p>
          )}
        </div>
      )}
    </li>
  );
}

export function VerificationChecksPanel({
  checks,
}: VerificationChecksPanelProps) {
  const t = useTranslations("verification");

  if (checks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("title")}</CardTitle>
          <CardDescription>{t("emptyDescription")}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t("title")}</CardTitle>
        <CardDescription>
          {t("checkCount", { count: checks.length })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {checks.map((check) => (
            <CheckItem key={check.id} check={check} />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
