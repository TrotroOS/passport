"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Printer } from "lucide-react";
import { useTranslations } from "next-intl";
import { formatAuditTimestamp } from "@/lib/audit/audit-labels";
import { usePassportPrint } from "@/hooks/use-passport-print";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PRINT_ROW_LIMIT = 8;

export interface AnalyticsPrintSnapshot {
  dateRangeLabel: string;
  organizationName?: string;
  summary: Record<string, unknown> | null;
  compliancePoints: Array<Record<string, unknown>>;
  riskPie: Array<{ name: string; value: number }>;
  riskPoints: Array<Record<string, unknown>>;
  supplierRows: Array<Record<string, unknown>>;
  categoryRows: Array<Record<string, unknown>>;
  corridorRows: Array<Record<string, unknown>>;
  missingDocs: Array<Record<string, unknown>>;
  discrepancyTrend: Array<Record<string, unknown>>;
  scoreDimensions: Record<string, unknown> | null;
  riskFactors: Array<Record<string, unknown>>;
  statusBreakdown: Array<{ name: string; count: number }>;
  tracking: Record<string, unknown> | null;
  documents: Record<string, unknown> | null;
  localizedStatus: (key: string) => string;
}

interface AnalyticsPrintReportProps {
  snapshot: AnalyticsPrintSnapshot;
  disabled?: boolean;
  className?: string;
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${Math.round(value).toLocaleString()}`;
}

function PrintSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-3 border-b border-slate-300 pb-1 text-base font-semibold uppercase tracking-wide">
        {title}
      </h2>
      {children}
    </section>
  );
}

function PrintTable({
  headers,
  rows,
  emptyMessage,
}: {
  headers: string[];
  rows: string[][];
  emptyMessage: string;
}) {
  if (rows.length === 0) {
    return <p className="text-slate-600">{emptyMessage}</p>;
  }

  return (
    <table className="w-full border-collapse text-left">
      <thead>
        <tr className="border-b border-slate-300 text-xs uppercase tracking-wide text-slate-600">
          {headers.map((header) => (
            <th key={header} className="py-2 pe-4 font-semibold last:pe-0">
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={index} className="border-b border-slate-200">
            {row.map((cell, cellIndex) => (
              <td key={cellIndex} className="py-2 pe-4 align-top last:pe-0">
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function AnalyticsPrintContent({
  snapshot,
  t,
}: {
  snapshot: AnalyticsPrintSnapshot;
  t: (key: string, values?: Record<string, string | number>) => string;
}) {
  const generatedAt = new Date();
  const topSuppliers = snapshot.supplierRows.slice(0, PRINT_ROW_LIMIT);
  const topCorridors = snapshot.corridorRows.slice(0, PRINT_ROW_LIMIT);
  const topMissingDocs = snapshot.missingDocs.slice(0, PRINT_ROW_LIMIT);

  const kpiRows = [
    [t("kpiShipments"), String(snapshot.summary?.shipmentsInRange ?? 0)],
    [t("kpiImportValue"), formatCurrency(Number(snapshot.summary?.totalImportValue ?? 0))],
    [
      t("kpiAvgScore"),
      snapshot.summary?.avgPassportScore != null
        ? String(snapshot.summary.avgPassportScore)
        : "—",
    ],
    [t("kpiOpenDiscrepancies"), String(snapshot.summary?.openDiscrepancies ?? 0)],
    [t("kpiPendingTasks"), String(snapshot.summary?.pendingWorkflowTasks ?? 0)],
  ];

  return (
    <div className="passport-print-document space-y-8 p-10 text-sm text-black">
      <header className="border-b-2 border-slate-900 pb-6">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
              Passport
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">{t("printTitle")}</h1>
            {snapshot.organizationName ? (
              <p className="mt-2 font-medium text-slate-800">{snapshot.organizationName}</p>
            ) : null}
            <p className="mt-3 max-w-xl text-xs leading-relaxed text-slate-600">{t("printScope")}</p>
          </div>
          <div className="text-end text-xs text-slate-600">
            <p className="font-semibold uppercase tracking-wide text-slate-900">
              {t("printPeriod")}
            </p>
            <p className="mt-1">{snapshot.dateRangeLabel}</p>
            <p className="mt-4 font-semibold uppercase tracking-wide text-slate-900">
              {t("printGeneratedAt")}
            </p>
            <p className="mt-1">{formatAuditTimestamp(generatedAt.toISOString())}</p>
          </div>
        </div>
      </header>

      <PrintSection title={t("printSummary")}>
        <PrintTable
          headers={[t("printMetric"), t("printValue")]}
          rows={kpiRows}
          emptyMessage={t("noShipmentData")}
        />
      </PrintSection>

      <PrintSection title={t("complianceTrend")}>
        <PrintTable
          headers={[
            t("printMonth"),
            t("chartOverall"),
            t("chartDocumentation"),
            t("chartRegulatory"),
          ]}
          rows={snapshot.compliancePoints.map((point) => [
            String(point.label ?? point.month ?? "—"),
            point.avgOverallScore != null ? String(point.avgOverallScore) : "—",
            point.avgDocumentationScore != null ? String(point.avgDocumentationScore) : "—",
            point.avgRegulatoryScore != null ? String(point.avgRegulatoryScore) : "—",
          ])}
          emptyMessage={t("noScoreHistory")}
        />
      </PrintSection>

      <PrintSection title={t("riskDistribution")}>
        <PrintTable
          headers={[t("printRiskLevel"), t("count")]}
          rows={snapshot.riskPie.map((row) => [row.name, String(row.value)])}
          emptyMessage={t("noRiskAssessments")}
        />
      </PrintSection>

      <PrintSection title={t("supplierPerformance")}>
        {snapshot.supplierRows.length > PRINT_ROW_LIMIT ? (
          <p className="mb-3 text-xs text-slate-600">
            {t("printTopRows", { count: PRINT_ROW_LIMIT, total: snapshot.supplierRows.length })}
          </p>
        ) : null}
        <PrintTable
          headers={[
            t("supplier"),
            t("shipmentsCol"),
            t("avgScore"),
            t("discrepanciesCol"),
          ]}
          rows={topSuppliers.map((row) => [
            String(row.supplierName),
            String(row.shipmentCount),
            row.avgPassportScore != null ? String(row.avgPassportScore) : "—",
            String(row.openDiscrepancies ?? 0),
          ])}
          emptyMessage={t("noSuppliers")}
        />
      </PrintSection>

      <PrintSection title={t("corridorInsights")}>
        {snapshot.corridorRows.length > PRINT_ROW_LIMIT ? (
          <p className="mb-3 text-xs text-slate-600">
            {t("printTopRows", { count: PRINT_ROW_LIMIT, total: snapshot.corridorRows.length })}
          </p>
        ) : null}
        <PrintTable
          headers={[t("route"), t("count"), t("avgScore"), t("routeRisk"), t("docsPercent")]}
          rows={topCorridors.map((row) => [
            String(row.routeLabel),
            String(row.shipmentCount),
            row.avgPassportScore != null ? String(row.avgPassportScore) : "—",
            String(row.routeRiskScore ?? "—"),
            row.avgDocumentationCompleteness != null
              ? `${row.avgDocumentationCompleteness}%`
              : "—",
          ])}
          emptyMessage={t("noCorridorData")}
        />
      </PrintSection>

      <PrintSection title={t("documentCompleteness")}>
        <p className="mb-3 text-slate-600">
          {t("documentCompletenessDesc", {
            total: Number(snapshot.documents?.totalShipments ?? 0),
            rate: Number(snapshot.documents?.missingRate ?? 0),
          })}
        </p>
        <PrintTable
          headers={[t("printDocumentType"), t("missingCount")]}
          rows={topMissingDocs.map((doc) => [
            snapshot.localizedStatus(String(doc.docType)),
            String(doc.missingCount ?? 0),
          ])}
          emptyMessage={t("noShipmentData")}
        />
      </PrintSection>

      <footer className="border-t border-slate-300 pt-4 text-xs text-slate-600">
        <p>{t("printDisclaimer")}</p>
      </footer>
    </div>
  );
}

export function AnalyticsPrintReport({
  snapshot,
  disabled = false,
  className,
}: AnalyticsPrintReportProps) {
  const t = useTranslations("analytics");
  const [mounted, setMounted] = useState(false);
  const handlePrint = usePassportPrint();

  useEffect(() => {
    setMounted(true);
  }, []);

  const printReport = (
    <div className="passport-print-root">
      <AnalyticsPrintContent snapshot={snapshot} t={t} />
    </div>
  );

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handlePrint}
        disabled={disabled}
        className={cn("print:hidden", className)}
      >
        <Printer className="me-2 h-4 w-4" />
        {t("printReport")}
      </Button>
      {mounted ? createPortal(printReport, document.body) : null}
    </>
  );
}
