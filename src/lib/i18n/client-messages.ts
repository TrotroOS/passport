/** Always pass the full catalog so every route can resolve translations. */
export function messagesForPath(
  messages: Record<string, unknown>
): Record<string, unknown> {
  return messages;
}
