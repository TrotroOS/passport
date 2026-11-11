const MARKETING_KEYS = [
  "common",
  "nav",
  "auth",
  "legal",
  "marketing",
  "status",
  "shortcuts",
] as const;

const HELP_KEYS = ["common", "nav", "help", "legal", "auth", "shortcuts"] as const;

const AUTH_KEYS = ["common", "nav", "auth", "shortcuts"] as const;

function pick(
  messages: Record<string, unknown>,
  keys: readonly string[]
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of keys) {
    if (key in messages) out[key] = messages[key];
  }
  return out;
}

/** Smaller next-intl payload for the client tree on each route. */
export function messagesForPath(
  messages: Record<string, unknown>,
  pathname: string
): Record<string, unknown> {
  if (pathname === "/" || pathname.startsWith("/legal")) {
    return pick(messages, MARKETING_KEYS);
  }
  if (pathname === "/login" || pathname === "/signup") {
    return pick(messages, AUTH_KEYS);
  }
  if (pathname === "/help" || pathname.startsWith("/help/")) {
    return pick(messages, HELP_KEYS);
  }

  const { marketing, help, print, notifications, ...appMessages } = messages;
  void marketing;
  void help;
  void notifications;
  if (pathname.startsWith("/shipments")) {
    return messages;
  }
  void print;
  return appMessages;
}
