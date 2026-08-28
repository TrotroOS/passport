"use client";

import { Printer } from "lucide-react";
import { useTranslations } from "next-intl";
import type {
  AuditEvent,
  Discrepancy,
  Party,
  PassportScore,
  Product,
  Shipment,
  WorkflowTask,
} from "@/types/database";
import { printHtmlDocument } from "@/lib/print/print-html-document";
import { buildShipmentComplianceReportHtml } from "@/lib/print/shipment-compliance-report-html";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ShipmentPrintReportProps {
  shipment: Shipment;
  score: PassportScore | null;
  parties: Party[];
  products: Product[];
  documentCount: number;
  openDiscrepancies: Discrepancy[];
  openTasks: WorkflowTask[];
  auditEvents?: AuditEvent[];
  organizationName?: string;
  compact?: boolean;
  className?: string;
}

export function ShipmentPrintReport({
  shipment,
  score,
  parties,
  products,
  documentCount,
  openDiscrepancies,
  openTasks,
  auditEvents = [],
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
      parties,
      products,
      documentCount,
      openDiscrepancies,
      openTasks,
      auditEvents,
      organizationName,
      statusLabel: (status) => ts(status as "draft"),
      roleLabel: (role) => ts(role as "seller"),
      labels: {
        title: t("title"),
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
        partiesSection: t("partiesSection"),
        partyName: t("partyName"),
        partyRole: t("partyRole"),
        noParties: t("noParties"),
        productsSection: t("productsSection"),
        productName: t("productName"),
        hsCode: t("hsCode"),
        noProducts: t("noProducts"),
        documentsSection: t("documentsSection"),
        documentsOnFile: t("documentsOnFile", { count: documentCount }),
        discrepanciesSection: t("discrepanciesSection"),
        noDiscrepancies: t("noDiscrepancies"),
        tasksSection: t("tasksSection"),
        noTasks: t("noTasks"),
        auditTrail: t("auditTrail"),
        auditTimestamp: t("auditTimestamp"),
        auditAction: t("auditAction"),
        auditEntity: t("auditEntity"),
        confidentialNote: t("confidentialNote"),
      },
    });

    printHtmlDocument(`${t("title")} — ${shipment.shipment_ref}`, html);
  }

  return (
    <Button
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
