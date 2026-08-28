import {
  formatAuditExportId,
  formatAuditTimestamp,
} from "@/lib/audit/audit-labels";
import type { PassportScore, Shipment } from "@/types/database";
import { escapeHtml } from "@/lib/print/print-html-document";

export interface ShipmentPrintLabels {
  title: string;
  tagline: string;
  footer: string;
  generatedAt: string;
  organization: string;
  reportId: string;
  summary: string;
  shipmentRef: string;
  route: string;
  status: string;
  incoterm: string;
  passportScore: string;
  readiness: string;
  ownerConfirmed: string;
  brokerConfirmed: string;
  yes: string;
  no: string;
  scoreBreakdown: string;
  documentation: string;
  consistency: string;
  counterparty: string;
  regulatory: string;
  confidentialNote: string;
}

export interface ShipmentComplianceReportInput {
  shipment: Shipment;
  score: PassportScore | null;
  organizationName?: string;
  labels: ShipmentPrintLabels;
  statusLabel: (status: string) => string;
}

function dataRow(label: string, value: string): string {
  return `<tr><td class="label">${escapeHtml(label)}</td><td class="value">${escapeHtml(value)}</td></tr>`;
}

function summaryItem(label: string, value: string): string {
  return `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`;
}

export function buildShipmentComplianceReportHtml(input: ShipmentComplianceReportInput): string {
  const generatedAt = new Date();
  const exportId = formatAuditExportId(input.shipment.shipment_ref, generatedAt);
  const { labels: t, shipment, score } = input;

  const route = `${shipment.origin_country ?? "—"} → ${shipment.destination_country ?? "—"}`;
  const overallScore = score?.overall_score != null ? String(score.overall_score) : "—";

  return `<article class="report">
    <header class="report-header">
      <p class="brand">Passport</p>
      <h1>${escapeHtml(t.title)}</h1>
      <p class="tagline">${escapeHtml(t.tagline)}</p>
      <dl class="meta-grid">
        ${summaryItem(t.reportId, exportId)}
        ${summaryItem(t.generatedAt, formatAuditTimestamp(generatedAt.toISOString()))}
        ${input.organizationName ? summaryItem(t.organization, input.organizationName) : ""}
      </dl>
    </header>

    <section>
      <h2>${escapeHtml(t.summary)}</h2>
      <dl class="summary-grid">
        ${summaryItem(t.shipmentRef, shipment.shipment_ref)}
        ${summaryItem(t.route, route)}
        ${summaryItem(t.status, input.statusLabel(shipment.status))}
        ${summaryItem(t.passportScore, overallScore)}
        ${summaryItem(t.incoterm, shipment.incoterm ?? "—")}
      </dl>
    </section>

    <section>
      <h2>${escapeHtml(t.readiness)}</h2>
      <table class="data-table">
        <tbody>
          ${dataRow(t.ownerConfirmed, shipment.owner_confirmed_ready ? t.yes : t.no)}
          ${dataRow(t.brokerConfirmed, shipment.broker_confirmed_ready ? t.yes : t.no)}
        </tbody>
      </table>
    </section>

    <section>
      <h2>${escapeHtml(t.scoreBreakdown)}</h2>
      <table class="data-table">
        <tbody>
          ${dataRow(t.documentation, score?.documentation_score != null ? String(score.documentation_score) : "—")}
          ${dataRow(t.consistency, score?.consistency_score != null ? String(score.consistency_score) : "—")}
          ${dataRow(t.counterparty, score?.counterparty_score != null ? String(score.counterparty_score) : "—")}
          ${dataRow(t.regulatory, score?.regulatory_score != null ? String(score.regulatory_score) : "—")}
        </tbody>
      </table>
    </section>

    <footer class="report-footer">
      <p>${escapeHtml(t.footer)}</p>
      <p>${escapeHtml(t.confidentialNote)}</p>
    </footer>
  </article>`;
}
