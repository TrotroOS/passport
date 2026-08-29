export function parseInviteEmails(raw: string): string[] {
  const seen = new Set<string>();
  const emails: string[] = [];

  for (const part of raw.split(/[\n,;]+/)) {
    const email = part.trim().toLowerCase();
    if (!email || seen.has(email)) continue;
    seen.add(email);
    emails.push(email);
  }

  return emails;
}
