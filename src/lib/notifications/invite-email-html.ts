function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildInviteEmailHtml(params: {
  heading: string;
  bodyHtml: string;
  link: string;
  linkLabel: string;
  footer: string;
}): string {
  const heading = escapeHtml(params.heading);
  const link = escapeHtml(params.link);
  const linkLabel = escapeHtml(params.linkLabel);
  const footer = escapeHtml(params.footer);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${heading}</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Georgia,'Times New Roman',serif;color:#0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;">
          <tr>
            <td style="padding:28px 32px 12px;border-bottom:1px solid #e2e8f0;">
              <p style="margin:0;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;">Passport</p>
              <h1 style="margin:8px 0 0;font-size:22px;font-weight:600;line-height:1.3;">${heading}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;font-size:15px;line-height:1.6;color:#334155;">
              ${params.bodyHtml}
              <p style="margin:28px 0 0;">
                <a href="${link}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:6px;font-family:system-ui,sans-serif;font-size:14px;font-weight:600;">${linkLabel}</a>
              </p>
              <p style="margin:20px 0 0;font-size:12px;line-height:1.5;color:#64748b;word-break:break-all;">${link}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 24px;border-top:1px solid #e2e8f0;font-size:12px;line-height:1.5;color:#64748b;">
              ${footer}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildInviteEmailBodyHtml(params: {
  shipmentRef: string;
  orgName: string;
  role: string;
  isExternal: boolean;
}): string {
  const shipmentRef = escapeHtml(params.shipmentRef);
  const orgName = escapeHtml(params.orgName);
  const role = escapeHtml(params.role);

  const intro = params.isExternal
    ? `<p style="margin:0 0 12px;">You have been invited to collaborate on shipment <strong>${shipmentRef}</strong>.</p>
       <p style="margin:0 0 12px;">You do not need an existing Passport account. Use the button below to create one and accept the invitation.</p>`
    : `<p style="margin:0 0 12px;">You have been invited to collaborate on shipment <strong>${shipmentRef}</strong>.</p>`;

  return `${intro}
<p style="margin:0 0 8px;"><strong>Organization:</strong> ${orgName}</p>
<p style="margin:0;"><strong>Role:</strong> ${role}</p>`;
}
