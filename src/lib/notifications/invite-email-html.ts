function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function paragraphHtml(text: string): string {
  return `<p style="margin:0 0 14px;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;line-height:1.6;color:#334155;">${text}</p>`;
}

export function paragraphsToEmailHtml(paragraphs: string[]): string {
  return paragraphs.map((text) => paragraphHtml(escapeHtml(text))).join("\n");
}

export function buildTransactionalEmailHtml(params: {
  heading: string;
  bodyHtml: string;
  link?: string;
  linkLabel?: string;
  footer: string;
}): string {
  const heading = escapeHtml(params.heading);
  const footer = escapeHtml(params.footer);
  const link = params.link ? escapeHtml(params.link) : null;
  const linkLabel = params.linkLabel ? escapeHtml(params.linkLabel) : null;

  const ctaBlock =
    link && linkLabel
      ? `<p style="margin:28px 0 0;">
                <a href="${link}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:6px;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;font-weight:600;">${linkLabel}</a>
              </p>
              <p style="margin:16px 0 0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:12px;line-height:1.5;color:#64748b;word-break:break-all;">${link}</p>`
      : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${heading}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;">
          <tr>
            <td style="padding:28px 32px 16px;border-bottom:1px solid #e2e8f0;">
              <p style="margin:0;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#64748b;font-weight:600;">Passport</p>
              <h1 style="margin:10px 0 0;font-size:20px;font-weight:600;line-height:1.35;color:#0f172a;">${heading}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;">
              ${params.bodyHtml}
              ${ctaBlock}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 24px;border-top:1px solid #e2e8f0;font-size:12px;line-height:1.55;color:#64748b;">
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

/** @deprecated use buildTransactionalEmailHtml */
export const buildInviteEmailHtml = buildTransactionalEmailHtml;

export function buildInviteEmailBodyHtml(params: {
  shipmentRef: string;
  orgName: string;
  role: string;
  isExternal: boolean;
}): string {
  const shipmentRef = escapeHtml(params.shipmentRef);
  const orgName = escapeHtml(params.orgName);
  const role = escapeHtml(params.role);

  const greeting = paragraphHtml("Dear colleague,");
  const invitation = `<p style="margin:0 0 14px;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;line-height:1.6;color:#334155;"><strong>${orgName}</strong> has invited you to collaborate on shipment <strong>${shipmentRef}</strong> in Passport.</p>`;
  const access = `<p style="margin:0 0 14px;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;line-height:1.6;color:#334155;"><strong style="color:#0f172a;">Access level:</strong> ${role}</p>`;

  const instructions = params.isExternal
    ? paragraphHtml(
        "To accept this invitation, please create a Passport account using the button below. No existing account is required."
      )
    : paragraphHtml(
        "Please use the button below to review this invitation and accept or decline access."
      );

  const disclaimer = paragraphHtml(
    "If you did not expect this invitation, you may safely ignore this message."
  );

  return `${greeting}
${invitation}
${access}
${instructions}
${disclaimer}`;
}
