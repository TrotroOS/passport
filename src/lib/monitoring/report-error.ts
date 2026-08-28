interface SentryEnvelope {
  event_id: string;
  level: "error" | "warning" | "info";
  platform: string;
  timestamp: number;
  message?: string;
  exception?: {
    values: Array<{ type: string; value: string; stacktrace?: { frames: unknown[] } }>;
  };
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
}

function parseSentryDsn(dsn: string): { host: string; publicKey: string; projectId: string } | null {
  try {
    const url = new URL(dsn);
    const projectId = url.pathname.replace(/^\//, "");
    const publicKey = url.username;
    if (!publicKey || !projectId) return null;
    return { host: url.host, publicKey, projectId };
  } catch {
    return null;
  }
}

function randomEventId(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

function parseStack(error: Error): unknown[] {
  const lines = error.stack?.split("\n").slice(1) ?? [];
  return lines.map((line) => ({
    filename: line.trim(),
    in_app: true,
  }));
}

export async function reportError(
  error: Error,
  context?: Record<string, unknown>
): Promise<void> {
  const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;

  const parsed = parseSentryDsn(dsn);
  if (!parsed) return;

  const envelope: SentryEnvelope = {
    event_id: randomEventId(),
    level: "error",
    platform: "javascript",
    timestamp: Date.now() / 1000,
    message: error.message,
    exception: {
      values: [
        {
          type: error.name || "Error",
          value: error.message,
          stacktrace: { frames: parseStack(error) },
        },
      ],
    },
    tags: {
      app: "passport",
      environment: process.env.NODE_ENV ?? "development",
    },
    extra: context,
  };

  const header = JSON.stringify({ event_id: envelope.event_id, dsn });
  const itemHeader = JSON.stringify({ type: "event" });
  const body = `${header}\n${itemHeader}\n${JSON.stringify(envelope)}`;

  try {
    await fetch(`https://${parsed.host}/api/${parsed.projectId}/envelope/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-sentry-envelope",
        "X-Sentry-Auth": `Sentry sentry_version=7, sentry_key=${parsed.publicKey}`,
      },
      body,
    });
  } catch {
    // Never throw from error reporting
  }
}

export function reportClientError(error: Error, context?: Record<string, unknown>): void {
  void reportError(error, { ...context, runtime: "client" });
}
