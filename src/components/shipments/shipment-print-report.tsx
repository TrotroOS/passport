"use client";

import { Printer } from "lucide-react";
import { useTranslations } from "next-intl";
import type { PassportScore, Shipment } from "@/types/database";
import { printHtmlDocument } from "@/lib/print/print-html-document";
import { buildShipmentComplianceReportHtml } from "@/lib/print/shipment-compliance-report-html";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ShipmentPrintReportProps {
  shipment: Shipment;
  score: PassportScore | null;
  organizationName?: string;
  compact?: boolean;
  className?: string;
}

export function ShipmentPrintReport({
  shipment,
  score,
  organizationName,
  compact = false,
  className,
}: ShipmentPrintReportProps) {
  const t = useTranslations("print");
  const ts = useTranslations("status");

  function handlePrint() {
    const html = buildShipmentComplianceReportHtml({
      shipment,
      score,
      organizationName,
      statusLabel: (status) => ts(status as "draft"),
      labels: {
        title: t("title"),
        tagline: t("tagline"),
        footer: t("footer"),
        generatedAt: t("generatedAt"),
        organization: t("organization"),
        reportId: t("reportId"),
        summary: t("summary"),
        shipmentRef: t("shipmentRef"),
        route: t("route"),
        status: t("status"),
        incoterm: t("incoterm"),
        passportScore: t("passportScore"),
        readiness: t("readiness"),
        ownerConfirmed: t("ownerConfirmed"),
        brokerConfirmed: t("brokerConfirmed"),
        yes: t("yes"),
        no: t("no"),
        scoreBreakdown: t("scoreBreakdown"),
        documentation: t("documentation"),
        consistency: t("consistency"),
        counterparty: t("counterparty"),
        regulatory: t("regulatory"),
        confidentialNote: t("confidentialNote"),
      },
    });

    printHtmlDocument(`${t("title")} — ${shipment.shipment_ref}`, html);
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handlePrint}
      className={cn("no-print print:hidden", className)}
      aria-label={compact ? t("printReport") : undefined}
    >
      <Printer className={compact ? "h-4 w-4 shrink-0 sm:me-2" : "me-2 h-4 w-4"} />
      <span className={compact ? "hidden truncate sm:inline" : undefined}>{t("printReport")}</span>
    </Button>
  );
}
