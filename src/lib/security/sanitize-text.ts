/**
 * Server-side sanitization for user-submitted plain text.
 * React escapes JSX text nodes; this strips dangerous content before storage
 * and removes control characters that could break exports or logs.
 */

const CONTROL_CHAR_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const HTML_TAG_RE = /<[^>]*>/g;

/** Strip control chars and HTML tags, normalize whitespace edges. */
export function sanitizeUserText(value: string): string {
  return value
    .replace(CONTROL_CHAR_RE, "")
    .replace(HTML_TAG_RE, "")
    .trim();
}

/** Allow only http(s) links in user-facing anchors. */
export function isSafeHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
