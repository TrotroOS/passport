export const COMPLIANCE_REPORT_PRINT_STYLES = `
  @page { margin: 1.5cm; size: auto; }
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    background: #fff;
    color: #0f172a;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  body {
    font-family: Georgia, "Times New Roman", serif;
    font-size: 11pt;
    line-height: 1.5;
    padding: 1.5rem;
  }
  .report { padding: 0; max-width: 100%; }
  .report-header {
    border-bottom: 2px solid #0f172a;
    padding-bottom: 1.25rem;
    margin-bottom: 1.5rem;
  }
  .brand {
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: #475569;
    margin: 0 0 0.5rem;
  }
  h1 {
    font-size: 1.65rem;
    font-weight: 700;
    margin: 0 0 0.35rem;
    line-height: 1.2;
  }
  .tagline { color: #475569; font-size: 0.85rem; margin: 0 0 0.75rem; }
  .header-intro {
    color: #334155;
    font-size: 0.9rem;
    margin: 0 0 1rem;
    max-width: 42rem;
  }
  .meta-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 0.75rem 2rem;
    font-size: 0.75rem;
  }
  .meta-grid dt,
  .summary-grid dt {
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #475569;
    margin: 0 0 0.15rem;
    font-size: 0.65rem;
  }
  .meta-grid dd,
  .summary-grid dd { margin: 0; font-weight: 600; }
  section { margin-bottom: 1.35rem; page-break-inside: avoid; }
  h2 {
    font-size: 0.85rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-bottom: 1px solid #cbd5e1;
    padding-bottom: 0.25rem;
    margin: 0 0 0.5rem;
  }
  .section-intro {
    color: #64748b;
    font-size: 0.82rem;
    margin: 0 0 0.75rem;
    font-style: italic;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85rem;
  }
  td {
    border-bottom: 1px solid #e2e8f0;
    padding: 0.4rem 0.75rem 0.4rem 0;
    vertical-align: top;
  }
  .summary-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.85rem 2rem;
    font-size: 0.9rem;
  }
  .data-table td.label {
    width: 45%;
    color: #475569;
    font-weight: 600;
  }
  .data-table td.value { font-weight: 700; }
  .report-table th {
    text-align: left;
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #475569;
    border-bottom: 1px solid #cbd5e1;
    padding: 0.35rem 0.75rem 0.35rem 0;
  }
  .report-table td {
    padding: 0.4rem 0.75rem 0.4rem 0;
    vertical-align: top;
  }
  .report-list {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .report-list li {
    border-bottom: 1px solid #e2e8f0;
    padding: 0.4rem 0;
    font-size: 0.85rem;
  }
  .empty {
    color: #64748b;
    font-size: 0.85rem;
    margin: 0;
    font-style: italic;
  }
  .report-footer {
    border-top: 1px solid #cbd5e1;
    padding-top: 0.75rem;
    margin-top: 1.5rem;
    font-size: 0.7rem;
    color: #475569;
  }
  .print-toolbar {
    margin-bottom: 1rem;
    font-family: system-ui, sans-serif;
    font-size: 0.875rem;
  }
  .print-toolbar button {
    padding: 0.4rem 0.85rem;
    border: 1px solid #cbd5e1;
    border-radius: 0.375rem;
    background: #f8fafc;
    cursor: pointer;
  }
  @media print {
    body { padding: 0; }
    .print-toolbar { display: none !important; }
  }
`;

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildComplianceReportDocument(
  title: string,
  bodyHtml: string,
  options?: { autoPrint?: boolean; printButtonLabel?: string }
): string {
  const autoPrint = options?.autoPrint ?? true;
  const printButtonLabel = options?.printButtonLabel ?? "Print report";

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="passport-report" content="compliance-v3" />
    <title>${escapeHtml(title)}</title>
    <style>${COMPLIANCE_REPORT_PRINT_STYLES}</style>
  </head>
  <body>
    <div class="print-toolbar">
      <button type="button" onclick="window.print()">${escapeHtml(printButtonLabel)}</button>
    </div>
    ${bodyHtml}
    ${
      autoPrint
        ? `<script>
      window.addEventListener("load", function () {
        window.setTimeout(function () { window.print(); }, 300);
      });
    </script>`
        : ""
    }
  </body>
</html>`;
}
