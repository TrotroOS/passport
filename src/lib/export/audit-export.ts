import {
  formatAuditAction,
  formatAuditEntityType,
  formatAuditExportId,
  formatAuditTimestamp,
} from "@/lib/audit/audit-labels";
import { formatStatus } from "@/lib/utils";

function escapeCsv(value: unknown): string {
  const s = value == null ? "" : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function rowsToCsv(headers: string[], rows: Record<string, unknown>[]): string {
  const lines = [headers.map(escapeCsv).join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escapeCsv(row[h])).join(","));
  }
  return lines.join("\r\n");
}

export interface AuditExportContext {
  organizationName: string;
  exportedBy: string;
  timeZone?: string;
}

export function buildAuditExportCsv(
  context: AuditExportContext,
  sections: {
    summary: Record<string, unknown>;
    auditEvents: Record<string, unknown>[];
    documents: Record<string, unknown>[];
    verificationChecks: Record<string, unknown>[];
    discrepancies: Record<string, unknown>[];
    workflowTasks: Record<string, unknown>[];
  }
): string {
  const exportedAt = new Date();
  const timeZone = context.timeZone ?? "UTC";
  const exportId = formatAuditExportId(String(sections.summary.shipment_ref ?? "SHIP"), exportedAt);
  const parts: string[] = [];

  parts.push("PASSPORT COMPLIANCE AUDIT PACK");
  parts.push(`Export ID,${escapeCsv(exportId)}`);
  parts.push(`Organization,${escapeCsv(context.organizationName)}`);
  parts.push(`Exported by,${escapeCsv(context.exportedBy)}`);
  parts.push(`Generated at,${escapeCsv(formatAuditTimestamp(exportedAt.toISOString(), timeZone))} (${timeZone})`);
  parts.push(
    "Disclaimer,This audit pack is generated from system records and is intended for internal compliance review."
  );
  parts.push("");

  const summary = {
    "Shipment reference": sections.summary.shipment_ref,
    Status: formatStatus(String(sections.summary.status ?? "")),
    Origin: sections.summary.origin ?? "",
    Destination: sections.summary.destination ?? "",
    "Passport score": sections.summary.passport_score ?? "",
    "Export ID": exportId,
    "Exported at": formatAuditTimestamp(exportedAt.toISOString(), timeZone),
  };

  parts.push("SHIPMENT SUMMARY");
  parts.push(rowsToCsv(["Field", "Value"], Object.entries(summary).map(([Field, Value]) => ({ Field, Value }))));
  parts.push("");

  const auditRows = sections.auditEvents.map((event) => ({
    Timestamp: formatAuditTimestamp(String(event.created_at ?? ""), timeZone),
    Action: formatAuditAction(String(event.action ?? "")),
    "Entity type": formatAuditEntityType(String(event.entity_type ?? "")),
    "Entity ID": event.entity_id ?? "",
    Actor: event.actor ?? "",
    Details: event.details ?? "",
  }));

  const documentRows = sections.documents.map((doc) => ({
    "Document type": formatStatus(String(doc.doc_type ?? "")),
    "File name": doc.file_name ?? "",
    Status: formatStatus(String(doc.status ?? "")),
    "Uploaded at": doc.created_at
      ? formatAuditTimestamp(String(doc.created_at), timeZone)
      : "",
  }));

  const verificationRows = sections.verificationChecks.map((check) => ({
    "Check type": formatStatus(String(check.check_type ?? "")),
    Status: formatStatus(String(check.status ?? "")),
    Severity: formatStatus(String(check.severity ?? "")),
    "Check ID": check.check_id ?? "",
  }));

  const discrepancyRows = sections.discrepancies.map((item) => ({
    Type: formatStatus(String(item.discrepancy_type ?? "")),
    Status: formatStatus(String(item.status ?? "")),
    Severity: formatStatus(String(item.severity ?? "")),
    Description: item.description ?? "",
  }));

  const taskRows = sections.workflowTasks.map((task) => ({
    Title: task.title ?? "",
    Status: formatStatus(String(task.status ?? "")),
    Priority: formatStatus(String(task.priority ?? "")),
    "Due date": task.due_date
      ? formatAuditTimestamp(String(task.due_date), timeZone)
      : "",
  }));

  const blocks: Array<[string, string[], Record<string, unknown>[]]> = [
    [
      "AUDIT TRAIL",
      ["Timestamp", "Action", "Entity type", "Entity ID", "Actor", "Details"],
      auditRows,
    ],
    [
      "DOCUMENTS",
      ["Document type", "File name", "Status", "Uploaded at"],
      documentRows,
    ],
    [
      "VERIFICATION CHECKS",
      ["Check type", "Status", "Severity", "Check ID"],
      verificationRows,
    ],
    [
      "DISCREPANCIES",
      ["Type", "Status", "Severity", "Description"],
      discrepancyRows,
    ],
    [
      "WORKFLOW TASKS",
      ["Title", "Status", "Priority", "Due date"],
      taskRows,
    ],
  ];

  for (const [title, headers, rows] of blocks) {
    parts.push(title);
    parts.push(rows.length > 0 ? rowsToCsv(headers, rows) : `${headers.join(",")}\r\n`);
    parts.push("");
  }

  return `\uFEFF${parts.join("\r\n")}`;
}
