"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Printer } from "lucide-react";
import { useTranslations } from "next-intl";
import { formatAuditTimestamp } from "@/lib/audit/audit-labels";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
  const shipmentCounts = snapshot.summary?.shipmentCounts as
    | { last30Days?: number; last90Days?: number; allTime?: number }
    | undefined;

  const kpiRows = [
    [t("kpiShipments"), String(snapshot.summary?.shipmentsInRange ?? 0)],
    [t("kpiImportValue"), formatCurrency(Number(snapshot.summary?.totalImportValue ?? 0))],
    [
      t("kpiAvgScore"),
      snapshot.summary?.avgPassportScore != null
        ? String(snapshot.summary.avgPassportScore)
        : "ΓÇö",
    ],
    [t("kpiOpenDiscrepancies"), String(snapshot.summary?.openDiscrepancies ?? 0)],
    [t("kpiPendingTasks"), String(snapshot.summary?.pendingWorkflowTasks ?? 0)],
    [t("kpiAllTimeShipments"), String(shipmentCounts?.allTime ?? 0)],
  ];

  return (
    <div className="audit-print space-y-8 p-10 text-sm text-black">
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
          </div>
          <div className="text-end text-xs text-slate-600">
            <p className="font-semibold uppercase tracking-wide text-slate-900">
              {t("printPeriod")}
            </p>
            <p className="mt-1">{snapshot.dateRangeLabel}</p>
          </div>
        </div>
        <dl className="mt-6 grid grid-cols-2 gap-x-8 gap-y-2 text-xs">
          <div>
            <dt className="font-semibold uppercase tracking-wide text-slate-600">
              {t("printGeneratedAt")}
            </dt>
            <dd>{formatAuditTimestamp(generatedAt.toISOString())}</dd>
          </div>
          {shipmentCounts ? (
            <div>
              <dt className="font-semibold uppercase tracking-wide text-slate-600">
                {t("printShipmentActivity")}
              </dt>
              <dd>
                {t("kpiPeriodHint", {
                  d30: shipmentCounts.last30Days ?? 0,
                  d90: shipmentCounts.last90Days ?? 0,
                })}
              </dd>
            </div>
          ) : null}
        </dl>
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
            String(point.label ?? point.month ?? "ΓÇö"),
            point.avgOverallScore != null ? String(point.avgOverallScore) : "ΓÇö",
            point.avgDocumentationScore != null ? String(point.avgDocumentationScore) : "ΓÇö",
            point.avgRegulatoryScore != null ? String(point.avgRegulatoryScore) : "ΓÇö",
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

      <PrintSection title={t("riskTrend")}>
        <PrintTable
          headers={[
            t("printMonth"),
            snapshot.localizedStatus("low"),
            snapshot.localizedStatus("medium"),
            snapshot.localizedStatus("high"),
            snapshot.localizedStatus("critical"),
          ]}
          rows={snapshot.riskPoints.map((point) => [
            String(point.label ?? point.month ?? "ΓÇö"),
            String(point.low ?? 0),
            String(point.medium ?? 0),
            String(point.high ?? 0),
            String(point.critical ?? 0),
          ])}
          emptyMessage={t("noRiskTrend")}
        />
      </PrintSection>

      <PrintSection title={t("supplierPerformance")}>
        <PrintTable
          headers={[
            t("supplier"),
            t("shipmentsCol"),
            t("avgScore"),
            t("discrepanciesCol"),
          ]}
          rows={snapshot.supplierRows.map((row) => [
            String(row.supplierName),
            String(row.shipmentCount),
            row.avgPassportScore != null ? String(row.avgPassportScore) : "ΓÇö",
            String(row.openDiscrepancies ?? 0),
          ])}
          emptyMessage={t("noSuppliers")}
        />
      </PrintSection>

      <PrintSection title={t("corridorInsights")}>
        <PrintTable
          headers={[t("route"), t("count"), t("avgScore"), t("routeRisk"), t("docsPercent")]}
          rows={snapshot.corridorRows.map((row) => [
            String(row.routeLabel),
            String(row.shipmentCount),
            row.avgPassportScore != null ? String(row.avgPassportScore) : "ΓÇö",
            String(row.routeRiskScore ?? "ΓÇö"),
            row.avgDocumentationCompleteness != null
              ? `${row.avgDocumentationCompleteness}%`
              : "ΓÇö",
          ])}
          emptyMessage={t("noCorridorData")}
        />
      </PrintSection>

      <PrintSection title={t("productCategories")}>
        {snapshot.categoryRows.length === 0 ? (
          <p className="text-slate-600">{t("noCategories")}</p>
        ) : (
          <ul className="space-y-3">
            {snapshot.categoryRows.map((cat) => (
              <li key={String(cat.categoryName)} className="border-b border-slate-200 pb-2">
                <p className="font-medium">
                  {String(cat.categoryName)} ΓÇö{" "}
                  {t("shipmentsCount", { count: Number(cat.shipmentCount) })}
                </p>
                {(cat.commonIssues as Array<{ issue: string; count: number }> | undefined)?.length
                  ? (
                      <ul className="mt-1 space-y-1 text-xs text-slate-600">
                        {(cat.commonIssues as Array<{ issue: string; count: number }>).map(
                          (issue) => (
                            <li key={issue.issue}>
                              {snapshot.localizedStatus(issue.issue)} ({issue.count})
                            </li>
                          )
                        )}
                      </ul>
                    )
                  : null}
              </li>
            ))}
          </ul>
        )}
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
          rows={snapshot.missingDocs.map((doc) => [
            snapshot.localizedStatus(String(doc.docType)),
            String(doc.missingCount ?? 0),
          ])}
          emptyMessage={t("noShipmentData")}
        />
      </PrintSection>

      <PrintSection title={t("printDiscrepancyTrend")}>
        <PrintTable
          headers={[t("printMonth"), t("printOpen"), t("printResolved")]}
          rows={snapshot.discrepancyTrend.map((point) => [
            String(point.label ?? point.month ?? "ΓÇö"),
            String(point.open ?? 0),
            String(point.resolved ?? 0),
          ])}
          emptyMessage={t("printNoDiscrepancyTrend")}
        />
      </PrintSection>

      {snapshot.scoreDimensions?.overall != null ? (
        <PrintSection title={t("printScoreDimensions")}>
          <PrintTable
            headers={[t("printDimension"), t("avgScore")]}
            rows={[
              [t("chartOverall"), String(snapshot.scoreDimensions.overall ?? "ΓÇö")],
              [t("chartDocumentation"), String(snapshot.scoreDimensions.documentation ?? "ΓÇö")],
              [t("printConsistency"), String(snapshot.scoreDimensions.consistency ?? "ΓÇö")],
              [t("printCounterparty"), String(snapshot.scoreDimensions.counterparty ?? "ΓÇö")],
              [t("chartRegulatory"), String(snapshot.scoreDimensions.regulatory ?? "ΓÇö")],
            ]}
            emptyMessage={t("printNoScoreDimensions")}
          />
        </PrintSection>
      ) : null}

      <PrintSection title={t("printRiskFactors")}>
        <PrintTable
          headers={[t("printFactor"), t("avgScore")]}
          rows={snapshot.riskFactors.map((factor) => [
            String(factor.label ?? factor.factorType ?? "ΓÇö"),
            factor.avgScore != null ? String(factor.avgScore) : "ΓÇö",
          ])}
          emptyMessage={t("printNoRiskFactors")}
        />
      </PrintSection>

      <PrintSection title={t("printShipmentPipeline")}>
        <PrintTable
          headers={[t("printStatus"), t("count")]}
          rows={snapshot.statusBreakdown.map((row) => [row.name, String(row.count)])}
          emptyMessage={t("printNoShipmentsInRange")}
        />
      </PrintSection>

      {snapshot.tracking ? (
        <PrintSection title={t("printFreightTracking")}>
          <PrintTable
            headers={[t("printMetric"), t("printValue")]}
            rows={[
              [t("printContainers"), String(snapshot.tracking.containersTracked ?? 0)],
              [t("printShipmentsTracked"), String(snapshot.tracking.shipmentsWithTracking ?? 0)],
              [t("printDelays"), String(snapshot.tracking.delayedEvents ?? 0)],
              [t("printDeliveries"), String(snapshot.tracking.delivered ?? 0)],
            ]}
            emptyMessage={t("printNoTracking")}
          />
        </PrintSection>
      ) : null}

      <footer className="border-t border-slate-300 pt-4 text-xs text-slate-600">
        <p>{t("printFooter")}</p>
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

  useEffect(() => {
    setMounted(true);
  }, []);

  function handlePrint() {
    window.print();
  }

  const printReport = (
    <div className="analytics-print-root hidden print:block">
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
