/** Normalize phone numbers to E.164 for matching. */
export function normalizePhoneE164(phone: string): string {
  const trimmed = phone.trim();
  if (trimmed.startsWith("whatsapp:")) {
    return normalizePhoneE164(trimmed.slice("whatsapp:".length));
  }
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return trimmed;
  if (trimmed.startsWith("+")) return `+${digits}`;
  // Ghana default when 10 digits starting with 0
  if (digits.length === 10 && digits.startsWith("0")) {
    return `+233${digits.slice(1)}`;
  }
  if (digits.length === 9 && !digits.startsWith("0")) {
    return `+233${digits}`;
  }
  return `+${digits}`;
}

/** Extract email address from "Name <user@example.com>" format. */
export function parseEmailAddress(from: string): string {
  const match = from.match(/<([^>]+)>/);
  const email = (match?.[1] ?? from).trim().toLowerCase();
  return email;
}
