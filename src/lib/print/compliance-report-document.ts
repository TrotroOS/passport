export const COMPLIANCE_REPORT_PRINT_STYLES = `
  @page { margin: 1.25cm 1.5cm; size: A4; }
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    background: #f1f5f9;
    color: #0f172a;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  body {
    font-family: "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
    font-size: 10.5pt;
    line-height: 1.5;
    padding: 1.25rem;
  }
  .print-toolbar {
    max-width: 780px;
    margin: 0 auto 1rem;
    font-size: 0.8125rem;
    color: #64748b;
  }
  .print-toolbar button {
    padding: 0.5rem 1rem;
    border: 1px solid #cbd5e1;
    border-radius: 999px;
    background: #fff;
    color: #0f172a;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
  }
  .report {
    max-width: 780px;
    margin: 0 auto;
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 4px 24px rgba(15, 23, 42, 0.08);
  }
  .report-header {
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #334155 100%);
    color: #f8fafc;
    padding: 1.75rem 2rem 1.5rem;
    position: relative;
  }
  .report-header::after {
    content: "";
    position: absolute;
    bottom: 0;
    left: 2rem;
    right: 2rem;
    height: 3px;
    background: linear-gradient(90deg, #94a3b8, #e2e8f0, #94a3b8);
    border-radius: 999px;
  }
  .header-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1.5rem;
    margin-bottom: 1.25rem;
  }
  .brand-lockup {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  .brand-mark {
    width: 2.25rem;
    height: 2.25rem;
    border-radius: 0.5rem;
    background: rgba(255, 255, 255, 0.12);
    border: 1px solid rgba(255, 255, 255, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    font-size: 1rem;
    letter-spacing: -0.02em;
  }
  .brand-text .brand-name {
    margin: 0;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: #cbd5e1;
  }
  .brand-text .tagline {
    margin: 0.15rem 0 0;
    font-size: 0.75rem;
    color: #94a3b8;
  }
  .header-title-block h1 {
    margin: 0 0 0.35rem;
    font-size: 1.5rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    line-height: 1.15;
    color: #fff;
  }
  .header-title-block .doc-type {
    margin: 0;
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: #94a3b8;
    font-weight: 600;
  }
  .meta-strip {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.75rem;
    margin-top: 1.25rem;
  }
  .meta-card {
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 0.5rem;
    padding: 0.65rem 0.75rem;
  }
  .meta-card dt {
    margin: 0 0 0.2rem;
    font-size: 0.58rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #94a3b8;
  }
  .meta-card dd {
    margin: 0;
    font-size: 0.78rem;
    font-weight: 600;
    color: #f1f5f9;
    word-break: break-word;
  }
  .report-body { padding: 1.5rem 2rem 1.75rem; }
  .hero-row {
    display: flex;
    align-items: stretch;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }
  .score-hero {
    flex: 0 0 7.5rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 0.75rem;
    padding: 1rem 0.75rem;
    text-align: center;
  }
  .score-hero .score-value {
    font-size: 2rem;
    font-weight: 800;
    line-height: 1;
    letter-spacing: -0.03em;
    color: #0f172a;
  }
  .score-hero .score-value.muted { color: #94a3b8; }
  .score-hero .score-label {
    margin-top: 0.35rem;
    font-size: 0.62rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #64748b;
  }
  .hero-details {
    flex: 1;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.65rem;
  }
  .detail-card {
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 0.5rem;
    padding: 0.7rem 0.85rem;
  }
  .detail-card dt {
    margin: 0 0 0.2rem;
    font-size: 0.58rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #64748b;
  }
  .detail-card dd {
    margin: 0;
    font-size: 0.88rem;
    font-weight: 700;
    color: #0f172a;
  }
  .detail-card.wide { grid-column: span 2; }
  section { margin-bottom: 1.35rem; page-break-inside: avoid; }
  .section-head {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    margin-bottom: 0.85rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid #e2e8f0;
  }
  .section-num {
    width: 1.35rem;
    height: 1.35rem;
    border-radius: 999px;
    background: #0f172a;
    color: #fff;
    font-size: 0.65rem;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  h2 {
    margin: 0;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #334155;
  }
  .readiness-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
  }
  .readiness-card {
    border: 1px solid #e2e8f0;
    border-radius: 0.5rem;
    padding: 0.85rem 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #fafafa;
  }
  .readiness-card .label {
    font-size: 0.78rem;
    font-weight: 600;
    color: #475569;
  }
  .badge {
    display: inline-block;
    padding: 0.2rem 0.65rem;
    border-radius: 999px;
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .badge-yes {
    background: #ecfdf5;
    color: #047857;
    border: 1px solid #a7f3d0;
  }
  .badge-no {
    background: #fef2f2;
    color: #b91c1c;
    border: 1px solid #fecaca;
  }
  .badge-neutral {
    background: #f1f5f9;
    color: #475569;
    border: 1px solid #e2e8f0;
  }
  .score-table { width: 100%; border-collapse: collapse; }
  .score-table tr { border-bottom: 1px solid #f1f5f9; }
  .score-table tr:last-child { border-bottom: none; }
  .score-table td { padding: 0.55rem 0; vertical-align: middle; }
  .score-table td.label {
    width: 38%;
    font-size: 0.78rem;
    font-weight: 600;
    color: #475569;
  }
  .score-table td.value {
    width: 12%;
    text-align: right;
    font-size: 0.85rem;
    font-weight: 800;
    color: #0f172a;
    padding-right: 0.75rem;
  }
  .score-table td.bar-cell { width: 50%; }
  .score-bar {
    height: 0.45rem;
    background: #e2e8f0;
    border-radius: 999px;
    overflow: hidden;
  }
  .score-bar-fill {
    height: 100%;
    border-radius: 999px;
    background: linear-gradient(90deg, #334155, #0f172a);
  }
  .score-bar-fill.low { background: linear-gradient(90deg, #f87171, #dc2626); }
  .score-bar-fill.mid { background: linear-gradient(90deg, #fbbf24, #d97706); }
  .score-bar-fill.high { background: linear-gradient(90deg, #34d399, #059669); }
  .report-footer {
    margin: 0;
    padding: 1rem 2rem 1.25rem;
    background: #f8fafc;
    border-top: 1px solid #e2e8f0;
    font-size: 0.68rem;
    color: #64748b;
    line-height: 1.55;
  }
  .report-footer p { margin: 0 0 0.35rem; }
  .report-footer p:last-child { margin-bottom: 0; }
  .footer-rule {
    width: 2.5rem;
    height: 2px;
    background: #cbd5e1;
    margin-bottom: 0.65rem;
  }
  @media print {
    html, body { background: #fff; }
    body { padding: 0; }
    .print-toolbar { display: none !important; }
    .report {
      max-width: none;
      border: none;
      border-radius: 0;
      box-shadow: none;
    }
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
    <meta name="passport-report" content="compliance-v4" />
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
        window.setTimeout(function () { window.print(); }, 400);
      });
    </script>`
        : ""
    }
  </body>
</html>`;
}
