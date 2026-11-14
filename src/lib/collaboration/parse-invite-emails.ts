const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseInviteEmails(raw: string): string[] {
  const seen = new Set<string>();
  const emails: string[] = [];

  for (const part of raw.split(/[\n,;]+/)) {
    const angle = part.match(/<([^>]+)>/);
    const email = (angle?.[1] ?? part).trim().toLowerCase();
    if (!email || seen.has(email) || !EMAIL_RE.test(email)) continue;
    seen.add(email);
    emails.push(email);
  }

  return emails;
}
