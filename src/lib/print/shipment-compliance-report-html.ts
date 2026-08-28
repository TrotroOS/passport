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
import { formatStatus } from "@/lib/utils";
import { escapeHtml } from "@/lib/print/print-html-document";

export interface ShipmentPrintLabels {
  title: string;
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
  partiesSection: string;
  partyName: string;
  partyRole: string;
  noParties: string;
  productsSection: string;
  productName: string;
  hsCode: string;
  noProducts: string;
  documentsSection: string;
  documentsOnFile: string;
  discrepanciesSection: string;
  noDiscrepancies: string;
  tasksSection: string;
  noTasks: string;
  auditTrail: string;
  auditTimestamp: string;
  auditAction: string;
  auditEntity: string;
  confidentialNote: string;
}

export interface ShipmentComplianceReportInput {
  shipment: Shipment;
  score: PassportScore | null;
  parties: Party[];
  products: Product[];
  documentCount: number;
  openDiscrepancies: Discrepancy[];
  openTasks: WorkflowTask[];
  auditEvents: AuditEvent[];
  organizationName?: string;
  labels: ShipmentPrintLabels;
  statusLabel: (status: string) => string;
  roleLabel: (role: string) => string;
}

function table(headers: string[], rows: string[][], emptyMessage: string): string {
  if (rows.length === 0) {
    return `<p class="empty">${escapeHtml(emptyMessage)}</p>`;
  }

  const head = headers
    .map((header) => `<th>${escapeHtml(header)}</th>`)
    .join("");
  const body = rows
    .map(
      (row) =>
        `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`
    )
    .join("");

  return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

function list(items: string[], emptyMessage: string): string {
  if (items.length === 0) {
    return `<p class="empty">${escapeHtml(emptyMessage)}</p>`;
  }

  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

export function buildShipmentComplianceReportHtml(input: ShipmentComplianceReportInput): string {
  const generatedAt = new Date();
  const exportId = formatAuditExportId(input.shipment.shipment_ref, generatedAt);
  const { labels: t, shipment, score } = input;

  const partyRows = input.parties.map((party) => [
    party.name,
    input.roleLabel(party.role),
  ]);

  const productRows = input.products.map((product) => [
    product.name,
    product.hs_code ?? "—",
  ]);

  const discrepancyItems = input.openDiscrepancies.map(
    (item) => `${formatStatus(item.severity)}: ${item.description}`
  );

  const taskItems = input.openTasks.map((task) => task.title);

  const auditRows = input.auditEvents.slice(0, 15).map((event) => [
    formatAuditTimestamp(event.created_at),
    formatAuditAction(event.action),
    formatAuditEntityType(event.entity_type),
  ]);

  const scoreBreakdown =
    score != null
      ? `<section>
          <h2>${escapeHtml(t.scoreBreakdown)}</h2>
          <table>
            <tbody>
              <tr><td>${escapeHtml(t.documentation)}</td><td>${escapeHtml(String(score.documentation_score ?? "—"))}</td></tr>
              <tr><td>${escapeHtml(t.consistency)}</td><td>${escapeHtml(String(score.consistency_score ?? "—"))}</td></tr>
              <tr><td>${escapeHtml(t.counterparty)}</td><td>${escapeHtml(String(score.counterparty_score ?? "—"))}</td></tr>
              <tr><td>${escapeHtml(t.regulatory)}</td><td>${escapeHtml(String(score.regulatory_score ?? "—"))}</td></tr>
            </tbody>
          </table>
        </section>`
      : "";

  return `<article class="report">
    <header class="report-header">
      <p class="brand">Passport</p>
      <h1>${escapeHtml(t.title)}</h1>
      <p class="subtitle">${escapeHtml(t.footer)}</p>
      <dl class="meta-grid">
        <div>
          <dt>${escapeHtml(t.reportId)}</dt>
          <dd>${escapeHtml(exportId)}</dd>
        </div>
        <div>
          <dt>${escapeHtml(t.generatedAt)}</dt>
          <dd>${escapeHtml(formatAuditTimestamp(generatedAt.toISOString()))}</dd>
        </div>
        ${
          input.organizationName
            ? `<div><dt>${escapeHtml(t.organization)}</dt><dd>${escapeHtml(input.organizationName)}</dd></div>`
            : ""
        }
      </dl>
    </header>

    <section>
      <h2>${escapeHtml(t.summary)}</h2>
      <dl class="summary-grid">
        <div><dt>${escapeHtml(t.shipmentRef)}</dt><dd>${escapeHtml(shipment.shipment_ref)}</dd></div>
        <div><dt>${escapeHtml(t.route)}</dt><dd>${escapeHtml(`${shipment.origin_country ?? "—"} → ${shipment.destination_country ?? "—"}`)}</dd></div>
        <div><dt>${escapeHtml(t.status)}</dt><dd>${escapeHtml(input.statusLabel(shipment.status))}</dd></div>
        <div><dt>${escapeHtml(t.passportScore)}</dt><dd>${escapeHtml(String(score?.overall_score ?? "—"))}</dd></div>
        ${
          shipment.incoterm
            ? `<div><dt>${escapeHtml(t.incoterm)}</dt><dd>${escapeHtml(shipment.incoterm)}</dd></div>`
            : ""
        }
      </dl>
    </section>

    <section>
      <h2>${escapeHtml(t.readiness)}</h2>
      <table>
        <tbody>
          <tr><td>${escapeHtml(t.ownerConfirmed)}</td><td>${escapeHtml(shipment.owner_confirmed_ready ? t.yes : t.no)}</td></tr>
          <tr><td>${escapeHtml(t.brokerConfirmed)}</td><td>${escapeHtml(shipment.broker_confirmed_ready ? t.yes : t.no)}</td></tr>
        </tbody>
      </table>
    </section>

    ${scoreBreakdown}

    <section>
      <h2>${escapeHtml(t.partiesSection)}</h2>
      ${table([t.partyName, t.partyRole], partyRows, t.noParties)}
    </section>

    <section>
      <h2>${escapeHtml(t.productsSection)}</h2>
      ${table([t.productName, t.hsCode], productRows, t.noProducts)}
    </section>

    <section>
      <h2>${escapeHtml(t.documentsSection)}</h2>
      <p>${escapeHtml(t.documentsOnFile)}</p>
    </section>

    <section>
      <h2>${escapeHtml(t.discrepanciesSection)}</h2>
      ${list(discrepancyItems, t.noDiscrepancies)}
    </section>

    <section>
      <h2>${escapeHtml(t.tasksSection)}</h2>
      ${list(taskItems, t.noTasks)}
    </section>

    <section>
      <h2>${escapeHtml(t.auditTrail)}</h2>
      ${table([t.auditTimestamp, t.auditAction, t.auditEntity], auditRows, "—")}
    </section>

    <footer class="report-footer">
      <p>${escapeHtml(t.footer)}</p>
      <p>${escapeHtml(t.confidentialNote)}</p>
    </footer>
  </article>`;
}
