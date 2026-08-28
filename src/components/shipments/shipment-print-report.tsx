"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Printer, X } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  formatAuditAction,
  formatAuditEntityType,
  formatAuditExportId,
  formatAuditTimestamp,
} from "@/lib/audit/audit-labels";
import type {
  AuditEvent,
  Discrepancy,
  Party,
  PassportScore,
  Product,
  Shipment,
  WorkflowTask,
} from "@/types/database";
import { formatDate, formatStatus } from "@/lib/utils";
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

interface ShipmentPrintReportContentProps {
  shipment: Shipment;
  score: PassportScore | null;
  parties: Party[];
  products: Product[];
  documentCount: number;
  openDiscrepancies: Discrepancy[];
  openTasks: WorkflowTask[];
  auditEvents: AuditEvent[];
  organizationName?: string;
  exportId: string;
  generatedAt: Date;
  t: (key: string, values?: Record<string, string | number | Date>) => string;
  ts: (key: string) => string;
}

function scoreTone(score: number | null | undefined): "high" | "mid" | "low" | "none" {
  if (score == null) return "none";
  if (score >= 80) return "high";
  if (score >= 60) return "mid";
  return "low";
}

function PrintScoreBar({ label, value }: { label: string; value: number | null }) {
  const v = value ?? 0;
  const tone = scoreTone(v);

  return (
    <div className="audit-print-score-bar">
      <div className="audit-print-score-bar-label">
        <span>{label}</span>
        <span>{value ?? "—"}</span>
      </div>
      <div className="audit-print-score-bar-track">
        <div
          className={cn("audit-print-score-bar-fill", `audit-print-score-bar-${tone}`)}
          style={{ width: `${Math.min(100, v)}%` }}
        />
      </div>
    </div>
  );
}

function ShipmentPrintReportContent({
  shipment,
  score,
  parties,
  products,
  documentCount,
  openDiscrepancies,
  openTasks,
  auditEvents,
  organizationName,
  exportId,
  generatedAt,
  t,
  ts,
}: ShipmentPrintReportContentProps) {
  const overall = score?.overall_score ?? null;
  const tone = scoreTone(overall);
  const attentionCount = openDiscrepancies.length + openTasks.length;

  return (
    <div className="audit-print-sheet space-y-6">
      <header className="audit-print-header">
        <div className="audit-print-header-top">
          <div>
            <p className="audit-print-brand">Passport</p>
            <h1 className="audit-print-title">{t("title")}</h1>
            <p className="audit-print-subtitle">{shipment.shipment_ref}</p>
          </div>
          <div className={cn("audit-print-score-badge", `audit-print-score-badge-${tone}`)}>
            <span className="audit-print-score-badge-label">{t("passportScore")}</span>
            <span className="audit-print-score-badge-value">{overall ?? "—"}</span>
          </div>
        </div>

        <dl className="audit-print-meta-grid">
          <div>
            <dt>{t("generatedAt")}</dt>
            <dd>{formatAuditTimestamp(generatedAt.toISOString())}</dd>
          </div>
          {organizationName ? (
            <div>
              <dt>{t("organization")}</dt>
              <dd>{organizationName}</dd>
            </div>
          ) : null}
          <div>
            <dt>{t("reportId")}</dt>
            <dd className="audit-print-mono">{exportId}</dd>
          </div>
          <div>
            <dt>{t("createdAt")}</dt>
            <dd>{formatDate(shipment.created_at)}</dd>
          </div>
        </dl>
      </header>

      <section className="audit-print-kpi-row">
        <div className="audit-print-kpi">
          <span className="audit-print-kpi-label">{t("status")}</span>
          <span className="audit-print-kpi-value">{ts(shipment.status as "draft")}</span>
        </div>
        <div className="audit-print-kpi">
          <span className="audit-print-kpi-label">{t("route")}</span>
          <span className="audit-print-kpi-value">
            {shipment.origin_country ?? "—"} → {shipment.destination_country ?? "—"}
          </span>
        </div>
        {shipment.incoterm ? (
          <div className="audit-print-kpi">
            <span className="audit-print-kpi-label">{t("incoterm")}</span>
            <span className="audit-print-kpi-value">{shipment.incoterm}</span>
          </div>
        ) : null}
        <div className="audit-print-kpi">
          <span className="audit-print-kpi-label">{t("documentsSection")}</span>
          <span className="audit-print-kpi-value">
            {t("documentsOnFile", { count: documentCount })}
          </span>
        </div>
        {attentionCount > 0 ? (
          <div className="audit-print-kpi audit-print-kpi-alert">
            <span className="audit-print-kpi-label">{t("attentionRequired")}</span>
            <span className="audit-print-kpi-value">
              {openDiscrepancies.length} / {openTasks.length}
            </span>
          </div>
        ) : null}
      </section>

      <section className="audit-print-section">
        <h2 className="audit-print-section-title">{t("readiness")}</h2>
        <div className="audit-print-readiness-row">
          <span className={cn("audit-print-pill", shipment.owner_confirmed_ready && "audit-print-pill-ok")}>
            {t("ownerConfirmed")}: {shipment.owner_confirmed_ready ? t("yes") : t("no")}
          </span>
          <span className={cn("audit-print-pill", shipment.broker_confirmed_ready && "audit-print-pill-ok")}>
            {t("brokerConfirmed")}: {shipment.broker_confirmed_ready ? t("yes") : t("no")}
          </span>
        </div>
      </section>

      {score ? (
        <section className="audit-print-section">
          <h2 className="audit-print-section-title">{t("scoreBreakdown")}</h2>
          <div className="audit-print-score-bars">
            <PrintScoreBar label={t("documentation")} value={score.documentation_score} />
            <PrintScoreBar label={t("consistency")} value={score.consistency_score} />
            <PrintScoreBar label={t("counterparty")} value={score.counterparty_score} />
            <PrintScoreBar label={t("regulatory")} value={score.regulatory_score} />
          </div>
        </section>
      ) : null}

      <section className="audit-print-section">
        <h2 className="audit-print-section-title">{t("partiesSection")}</h2>
        {parties.length > 0 ? (
          <table className="audit-print-table">
            <thead>
              <tr>
                <th>{t("partyName")}</th>
                <th>{t("partyRole")}</th>
                <th>{t("partyCountry")}</th>
              </tr>
            </thead>
            <tbody>
              {parties.map((party) => (
                <tr key={party.id}>
                  <td>{party.name}</td>
                  <td>{ts(party.role as "seller")}</td>
                  <td>{party.country ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="audit-print-empty">{t("noParties")}</p>
        )}
      </section>

      <section className="audit-print-section">
        <h2 className="audit-print-section-title">{t("productsSection")}</h2>
        {products.length > 0 ? (
          <table className="audit-print-table">
            <thead>
              <tr>
                <th>{t("productName")}</th>
                <th>{t("hsCode")}</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td>{product.name}</td>
                  <td className="audit-print-mono">{product.hs_code ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="audit-print-empty">{t("noProducts")}</p>
        )}
      </section>

      <section className="audit-print-section">
        <h2 className="audit-print-section-title">{t("discrepanciesSection")}</h2>
        {openDiscrepancies.length > 0 ? (
          <ul className="audit-print-list">
            {openDiscrepancies.map((item) => (
              <li key={item.id} className="audit-print-list-item">
                <span className={cn("audit-print-severity", `audit-print-severity-${item.severity}`)}>
                  {formatStatus(item.severity)}
                </span>
                <span>{item.description}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="audit-print-empty">{t("noDiscrepancies")}</p>
        )}
      </section>

      <section className="audit-print-section">
        <h2 className="audit-print-section-title">{t("tasksSection")}</h2>
        {openTasks.length > 0 ? (
          <ul className="audit-print-list audit-print-task-list">
            {openTasks.map((task) => (
              <li key={task.id}>{task.title}</li>
            ))}
          </ul>
        ) : (
          <p className="audit-print-empty">{t("noTasks")}</p>
        )}
      </section>

      {auditEvents.length > 0 ? (
        <section className="audit-print-section audit-print-section-break">
          <h2 className="audit-print-section-title">{t("auditTrail")}</h2>
          <table className="audit-print-table audit-print-table-compact">
            <thead>
              <tr>
                <th>{t("auditTimestamp")}</th>
                <th>{t("auditAction")}</th>
                <th>{t("auditEntity")}</th>
              </tr>
            </thead>
            <tbody>
              {auditEvents.slice(0, 12).map((event) => (
                <tr key={event.id}>
                  <td className="audit-print-mono audit-print-timestamp">
                    {formatAuditTimestamp(event.created_at)}
                  </td>
                  <td>{formatAuditAction(event.action)}</td>
                  <td>{formatAuditEntityType(event.entity_type)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      <footer className="audit-print-footer">
        <p>{t("footer")}</p>
        <p>{t("confidentialFooter")}</p>
        <p className="audit-print-footer-id">{exportId}</p>
      </footer>
    </div>
  );
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
  const [mounted, setMounted] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const generatedAt = new Date();
  const exportId = formatAuditExportId(shipment.shipment_ref, generatedAt);

  useEffect(() => {
    setMounted(true);
  }, []);

  const contentProps: ShipmentPrintReportContentProps = {
    shipment,
    score,
    parties,
    products,
    documentCount,
    openDiscrepancies,
    openTasks,
    auditEvents,
    organizationName,
    exportId,
    generatedAt,
    t,
    ts,
  };

  function handleOpenPreview() {
    setPreviewOpen(true);
  }

  function handleConfirmPrint() {
    setPreviewOpen(false);
    window.setTimeout(() => window.print(), 150);
  }

  const printPortal = (
    <div className="audit-print-root hidden print:block">
      <div className="audit-print">
        <ShipmentPrintReportContent {...contentProps} />
      </div>
    </div>
  );

  const previewOverlay = previewOpen ? (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/60 p-0 sm:items-center sm:p-4 print:hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="print-preview-title"
    >
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl border bg-background shadow-2xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3 border-b px-4 py-4 sm:px-6">
          <div>
            <h2 id="print-preview-title" className="text-lg font-semibold">
              {t("previewTitle")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("previewSubtitle")}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={() => setPreviewOpen(false)}
            aria-label={t("cancel")}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-100/80 p-4 sm:p-6">
          <div className="audit-print audit-print-preview mx-auto">
            <ShipmentPrintReportContent {...contentProps} />
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t bg-background px-4 py-4 sm:flex-row sm:justify-end sm:px-6">
          <Button type="button" variant="outline" onClick={() => setPreviewOpen(false)}>
            {t("cancel")}
          </Button>
          <Button type="button" onClick={handleConfirmPrint}>
            <Printer className="me-2 h-4 w-4" />
            {t("confirmPrint")}
          </Button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleOpenPreview}
        className={cn("print:hidden", className)}
        aria-label={compact ? t("printReport") : undefined}
      >
        <Printer className={compact ? "h-4 w-4 shrink-0 sm:me-2" : "me-2 h-4 w-4"} />
        <span className={compact ? "hidden truncate sm:inline" : undefined}>{t("printReport")}</span>
      </Button>

      {previewOpen ? createPortal(previewOverlay, document.body) : null}
      {mounted ? createPortal(printPortal, document.body) : null}
    </>
  );
}
