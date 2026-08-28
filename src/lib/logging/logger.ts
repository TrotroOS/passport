type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  requestId?: string;
  userId?: string;
  organizationId?: string;
  [key: string]: unknown;
}

function formatLog(
  level: LogLevel,
  message: string,
  context?: LogContext,
  err?: Error
) {
  const entry: Record<string, unknown> = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...context,
  };
  if (err) {
    entry.error = {
      name: err.name,
      message: err.message,
      stack: err.stack,
    };
  }
  return JSON.stringify(entry);
}

export const logger = {
  debug(message: string, context?: LogContext) {
    if (process.env.NODE_ENV !== "production") {
      console.debug(formatLog("debug", message, context));
    }
  },
  info(message: string, context?: LogContext) {
    console.info(formatLog("info", message, context));
  },
  warn(message: string, context?: LogContext) {
    console.warn(formatLog("warn", message, context));
  },
  error(message: string, err?: Error, context?: LogContext) {
    console.error(formatLog("error", message, context, err));
  },
};

export function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}
