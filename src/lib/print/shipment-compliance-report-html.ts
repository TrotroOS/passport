import {
  formatAuditExportId,
  formatAuditTimestamp,
} from "@/lib/audit/audit-labels";
import type { PassportScore, Shipment } from "@/types/database";
import { escapeHtml } from "@/lib/print/compliance-report-document";

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

function metaCard(label: string, value: string): string {
  return `<div class="meta-card"><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`;
}

function detailCard(label: string, value: string, wide = false): string {
  return `<div class="detail-card${wide ? " wide" : ""}"><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`;
}

function readinessCard(label: string, confirmed: boolean, yes: string, no: string): string {
  const badgeClass = confirmed ? "badge-yes" : "badge-no";
  const badgeText = confirmed ? yes : no;
  return `<div class="readiness-card">
    <span class="label">${escapeHtml(label)}</span>
    <span class="badge ${badgeClass}">${escapeHtml(badgeText)}</span>
  </div>`;
}

function scoreBarClass(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "";
  if (value < 40) return "low";
  if (value < 70) return "mid";
  return "high";
}

function scoreRow(label: string, raw: number | null | undefined): string {
  const display = raw != null ? String(raw) : "—";
  const width = raw != null ? Math.max(0, Math.min(100, raw)) : 0;
  const barClass = scoreBarClass(raw);

  return `<tr>
    <td class="label">${escapeHtml(label)}</td>
    <td class="value">${escapeHtml(display)}</td>
    <td class="bar-cell">
      <div class="score-bar">
        <div class="score-bar-fill ${barClass}" style="width:${width}%"></div>
      </div>
    </td>
  </tr>`;
}

function sectionHead(number: string, title: string): string {
  return `<div class="section-head"><span class="section-num">${escapeHtml(number)}</span><h2>${escapeHtml(title)}</h2></div>`;
}

export function buildShipmentComplianceReportHtml(input: ShipmentComplianceReportInput): string {
  const generatedAt = new Date();
  const exportId = formatAuditExportId(input.shipment.shipment_ref, generatedAt);
  const { labels: t, shipment, score } = input;

  const route = `${shipment.origin_country ?? "—"} → ${shipment.destination_country ?? "—"}`;
  const overallScore = score?.overall_score;
  const overallDisplay = overallScore != null ? String(overallScore) : "—";
  const scoreClass = overallScore != null ? "" : " muted";
  const statusDisplay = input.statusLabel(shipment.status);

  return `<article class="report">
    <header class="report-header">
      <div class="header-top">
        <div class="brand-lockup">
          <div class="brand-mark">P</div>
          <div class="brand-text">
            <p class="brand-name">Passport</p>
            <p class="tagline">${escapeHtml(t.tagline)}</p>
          </div>
        </div>
        <div class="header-title-block">
          <p class="doc-type">Official compliance record</p>
          <h1>${escapeHtml(t.title)}</h1>
        </div>
      </div>
      <dl class="meta-strip">
        ${metaCard(t.reportId, exportId)}
        ${metaCard(t.generatedAt, formatAuditTimestamp(generatedAt.toISOString()))}
        ${metaCard(t.organization, input.organizationName ?? "—")}
      </dl>
    </header>

    <div class="report-body">
      <section>
        ${sectionHead("1", t.summary)}
        <div class="hero-row">
          <div class="score-hero">
            <div class="score-value${scoreClass}">${escapeHtml(overallDisplay)}</div>
            <div class="score-label">${escapeHtml(t.passportScore)}</div>
          </div>
          <dl class="hero-details">
            ${detailCard(t.shipmentRef, shipment.shipment_ref, true)}
            ${detailCard(t.route, route, true)}
            ${detailCard(t.status, statusDisplay)}
            ${detailCard(t.incoterm, shipment.incoterm ?? "—")}
          </dl>
        </div>
      </section>

      <section>
        ${sectionHead("2", t.readiness)}
        <div class="readiness-grid">
          ${readinessCard(t.ownerConfirmed, shipment.owner_confirmed_ready, t.yes, t.no)}
          ${readinessCard(t.brokerConfirmed, shipment.broker_confirmed_ready, t.yes, t.no)}
        </div>
      </section>

      <section>
        ${sectionHead("3", t.scoreBreakdown)}
        <table class="score-table">
          <tbody>
            ${scoreRow(t.documentation, score?.documentation_score)}
            ${scoreRow(t.consistency, score?.consistency_score)}
            ${scoreRow(t.counterparty, score?.counterparty_score)}
            ${scoreRow(t.regulatory, score?.regulatory_score)}
          </tbody>
        </table>
      </section>
    </div>

    <footer class="report-footer">
      <div class="footer-rule"></div>
      <p>${escapeHtml(t.footer)}</p>
      <p>${escapeHtml(t.confidentialNote)}</p>
    </footer>
  </article>`;
}
