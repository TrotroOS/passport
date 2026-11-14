export function buildInviteMailto(to: string, invitationUrl: string): string {
  const subject = encodeURIComponent("You're invited to collaborate in Seadell");
  const body = encodeURIComponent(
    `You've been invited to collaborate on a shipment in Seadell.\n\nOpen this link to review and accept:\n${invitationUrl}\n`
  );
  return `mailto:${encodeURIComponent(to)}?subject=${subject}&body=${body}`;
}

export function openInviteMailto(to: string, invitationUrl: string): void {
  window.location.href = buildInviteMailto(to, invitationUrl);
}
