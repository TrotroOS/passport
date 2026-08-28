const PRINT_STYLES = `
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
    line-height: 1.45;
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
  .tagline { color: #475569; font-size: 0.85rem; margin: 0 0 1rem; }
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
    margin: 0 0 0.75rem;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85rem;
  }
  th {
    text-align: left;
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #475569;
    border-bottom: 1px solid #cbd5e1;
    padding: 0.35rem 0.75rem 0.35rem 0;
    font-weight: 700;
  }
  td {
    border-bottom: 1px solid #e2e8f0;
    padding: 0.4rem 0.75rem 0.4rem 0;
    vertical-align: top;
  }
  ul { margin: 0; padding: 0; list-style: none; }
  li { border-bottom: 1px solid #e2e8f0; padding: 0.35rem 0; }
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
  .empty { color: #64748b; font-size: 0.85rem; margin: 0; }
  .report-footer {
    border-top: 1px solid #cbd5e1;
    padding-top: 0.75rem;
    margin-top: 1.5rem;
    font-size: 0.7rem;
    color: #475569;
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

export function printHtmlDocument(title: string, bodyHtml: string): void {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("title", title);
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;";
  document.body.appendChild(iframe);

  const frameWindow = iframe.contentWindow;
  const doc = frameWindow?.document;
  if (!frameWindow || !doc) {
    iframe.remove();
    return;
  }

  doc.open();
  doc.write(`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <style>${PRINT_STYLES}</style>
  </head>
  <body>${bodyHtml}</body>
</html>`);
  doc.close();

  const cleanup = () => {
    window.setTimeout(() => iframe.remove(), 250);
  };

  frameWindow.addEventListener("afterprint", cleanup, { once: true });

  frameWindow.focus();
  frameWindow.print();
}
