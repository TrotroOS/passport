import {
  formatAuditExportId,
  formatAuditTimestamp,
} from "@/lib/audit/audit-labels";
import type {
  Discrepancy,
  Document,
  Party,
  PassportScore,
  Product,
  RegulatoryCheckWithRegulation,
  RiskAssessment,
  Shipment,
  VerificationCheck,
  WorkflowTask,
} from "@/types/database";
import { formatDate, formatStatus } from "@/lib/utils";
import { escapeHtml } from "@/lib/print/compliance-report-document";
import {
  formatReadinessTimestamp,
  type ReadinessConfirmationDetails,
} from "@/lib/shipments/readiness-confirmation";

export interface ShipmentPrintLabels {
  title: string;
  tagline: string;
  headerIntro: string;
  footer: string;
  generatedAt: string;
  organization: string;
  reportId: string;
  summary: string;
  summaryIntro: string;
  shipmentRef: string;
  route: string;
  status: string;
  incoterm: string;
  passportScore: string;
  createdAt: string;
  readiness: string;
  readinessIntro: string;
  readinessOverall: string;
  readinessComplete: string;
  readinessPending: string;
  readinessRole: string;
  readinessStatus: string;
  confirmedBy: string;
  confirmedAt: string;
  pending: string;
  ownerConfirmed: string;
  brokerConfirmed: string;
  yes: string;
  no: string;
  scoreBreakdown: string;
  scoreBreakdownIntro: string;
  documentation: string;
  consistency: string;
  counterparty: string;
  regulatory: string;
  riskSection: string;
  riskIntro: string;
  riskScore: string;
  riskLevel: string;
  partiesSection: string;
  partiesIntro: string;
  partyName: string;
  partyRole: string;
  partyCountry: string;
  noParties: string;
  productsSection: string;
  productsIntro: string;
  productName: string;
  hsCode: string;
  noProducts: string;
  documentsSection: string;
  documentsIntro: string;
  documentType: string;
  documentFile: string;
  documentStatus: string;
  noDocuments: string;
  verificationSection: string;
  verificationIntro: string;
  checkName: string;
  checkStatus: string;
  noVerificationChecks: string;
  regulatorySection: string;
  regulatoryIntro: string;
  regulationName: string;
  regulatoryStatus: string;
  noRegulatoryChecks: string;
  discrepanciesSection: string;
  discrepanciesIntro: string;
  noDiscrepancies: string;
  tasksSection: string;
  tasksIntro: string;
  taskPriority: string;
  noTasks: string;
  confidentialNote: string;
}

export interface ShipmentComplianceReportInput {
  shipment: Shipment;
  score: PassportScore | null;
  riskAssessment: RiskAssessment | null;
  parties: Party[];
  products: Product[];
  documents: Document[];
  verificationChecks: VerificationCheck[];
  regulatoryChecks: RegulatoryCheckWithRegulation[];
  openDiscrepancies: Discrepancy[];
  openTasks: WorkflowTask[];
  organizationName?: string;
  readiness: ReadinessConfirmationDetails;
  labels: ShipmentPrintLabels;
  statusLabel: (status: string) => string;
  roleLabel: (role: string) => string;
}

function dataRow(label: string, value: string): string {
  return `<tr><td class="label">${escapeHtml(label)}</td><td class="value">${escapeHtml(value)}</td></tr>`;
}

function summaryItem(label: string, value: string): string {
  return `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`;
}

function table(headers: string[], rows: string[][], emptyMessage: string): string {
  if (rows.length === 0) {
    return `<p class="empty">${escapeHtml(emptyMessage)}</p>`;
  }

  const head = headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("");
  const body = rows
    .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`)
    .join("");

  return `<table class="report-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

function list(items: string[], emptyMessage: string): string {
  if (items.length === 0) {
    return `<p class="empty">${escapeHtml(emptyMessage)}</p>`;
  }

  return `<ul class="report-list">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function section(title: string, intro: string, body: string): string {
  return `<section>
    <h2>${escapeHtml(title)}</h2>
    <p class="section-intro">${escapeHtml(intro)}</p>
    ${body}
  </section>`;
}

function readinessStatusLabel(confirmed: boolean, yes: string, pending: string): string {
  return confirmed ? yes : pending;
}

function readinessRow(
  role: string,
  detail: { confirmed: boolean; confirmedBy: string | null; confirmedAt: string | null },
  labels: Pick<ShipmentPrintLabels, "yes" | "pending" | "confirmedBy" | "confirmedAt">
): string[] {
  return [
    role,
    readinessStatusLabel(detail.confirmed, labels.yes, labels.pending),
    detail.confirmed ? detail.confirmedBy ?? "—" : "—",
    detail.confirmed ? formatReadinessTimestamp(detail.confirmedAt) : "—",
  ];
}

export function buildShipmentComplianceReportHtml(input: ShipmentComplianceReportInput): string {
  const generatedAt = new Date();
  const exportId = formatAuditExportId(input.shipment.shipment_ref, generatedAt);
  const { labels: t, shipment, score } = input;

  const route = `${shipment.origin_country ?? "—"} → ${shipment.destination_country ?? "—"}`;
  const overallScore = score?.overall_score != null ? String(score.overall_score) : "—";

  const partyRows = input.parties.map((party) => [
    party.name,
    input.roleLabel(party.role),
    party.country ?? "—",
  ]);

  const productRows = input.products.map((product) => [
    product.name,
    product.hs_code ?? "—",
  ]);

  const documentRows = input.documents.map((doc) => [
    formatStatus(doc.doc_type),
    doc.file_name ?? "—",
    formatStatus(doc.processing_status),
  ]);

  const verificationRows = input.verificationChecks.map((check) => [
    formatStatus(check.check_type),
    formatStatus(check.status),
  ]);

  const regulatoryRows = input.regulatoryChecks.map((check) => [
    check.regulations?.title ?? formatStatus(check.check_type),
    formatStatus(check.status),
  ]);

  const discrepancyItems = input.openDiscrepancies.map(
    (item) => `${formatStatus(item.severity)} — ${item.description}`
  );

  const taskItems = input.openTasks.map(
    (task) => `[${formatStatus(task.priority)}] ${task.title}`
  );

  const riskBody =
    input.riskAssessment != null
      ? `<table class="data-table"><tbody>
          ${dataRow(t.riskScore, String(input.riskAssessment.overall_risk_score))}
          ${dataRow(t.riskLevel, formatStatus(input.riskAssessment.risk_level))}
        </tbody></table>`
      : `<p class="empty">—</p>`;

  return `<article class="report">
    <header class="report-header">
      <p class="brand">Passport</p>
      <h1>${escapeHtml(t.title)}</h1>
      <p class="tagline">${escapeHtml(t.tagline)}</p>
      <p class="header-intro">${escapeHtml(t.headerIntro)}</p>
      <dl class="meta-grid">
        ${summaryItem(t.reportId, exportId)}
        ${summaryItem(t.generatedAt, formatAuditTimestamp(generatedAt.toISOString()))}
        ${summaryItem(t.organization, input.organizationName ?? "—")}
      </dl>
    </header>

    ${section(
      t.summary,
      t.summaryIntro,
      `<dl class="summary-grid">
        ${summaryItem(t.shipmentRef, shipment.shipment_ref)}
        ${summaryItem(t.route, route)}
        ${summaryItem(t.status, input.statusLabel(shipment.status))}
        ${summaryItem(t.passportScore, overallScore)}
        ${summaryItem(t.incoterm, shipment.incoterm ?? "—")}
        ${summaryItem(t.createdAt, formatDate(shipment.created_at))}
      </dl>`
    )}

    ${section(
      t.readiness,
      t.readinessIntro,
      `<table class="data-table"><tbody>
        ${dataRow(
          t.readinessOverall,
          input.readiness.allConfirmed ? t.readinessComplete : t.readinessPending
        )}
      </tbody></table>
      ${table(
        [t.readinessRole, t.readinessStatus, t.confirmedBy, t.confirmedAt],
        [
          readinessRow(t.ownerConfirmed, input.readiness.owner, t),
          readinessRow(t.brokerConfirmed, input.readiness.broker, t),
        ],
        "—"
      )}`
    )}

    ${section(
      t.scoreBreakdown,
      t.scoreBreakdownIntro,
      `<table class="data-table"><tbody>
        ${dataRow(t.documentation, score?.documentation_score != null ? String(score.documentation_score) : "—")}
        ${dataRow(t.consistency, score?.consistency_score != null ? String(score.consistency_score) : "—")}
        ${dataRow(t.counterparty, score?.counterparty_score != null ? String(score.counterparty_score) : "—")}
        ${dataRow(t.regulatory, score?.regulatory_score != null ? String(score.regulatory_score) : "—")}
      </tbody></table>`
    )}

    ${section(t.riskSection, t.riskIntro, riskBody)}

    ${section(
      t.partiesSection,
      t.partiesIntro,
      table([t.partyName, t.partyRole, t.partyCountry], partyRows, t.noParties)
    )}

    ${section(
      t.productsSection,
      t.productsIntro,
      table([t.productName, t.hsCode], productRows, t.noProducts)
    )}

    ${section(
      t.documentsSection,
      t.documentsIntro,
      table([t.documentType, t.documentFile, t.documentStatus], documentRows, t.noDocuments)
    )}

    ${section(
      t.verificationSection,
      t.verificationIntro,
      table([t.checkName, t.checkStatus], verificationRows, t.noVerificationChecks)
    )}

    ${section(
      t.regulatorySection,
      t.regulatoryIntro,
      table([t.regulationName, t.regulatoryStatus], regulatoryRows, t.noRegulatoryChecks)
    )}

    ${section(t.discrepanciesSection, t.discrepanciesIntro, list(discrepancyItems, t.noDiscrepancies))}

    ${section(t.tasksSection, t.tasksIntro, list(taskItems, t.noTasks))}

    <footer class="report-footer">
      <p>${escapeHtml(t.footer)}</p>
      <p>${escapeHtml(t.confidentialNote)}</p>
    </footer>
  </article>`;
}
