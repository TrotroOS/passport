import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logging/logger";

export type ErrorSeverity = "error" | "warning" | "info";

export interface LogErrorInput {
  organizationId?: string | null;
  userId?: string | null;
  route?: string;
  method?: string;
  errorMessage: string;
  stackTrace?: string;
  severity?: ErrorSeverity;
  metadata?: Record<string, unknown>;
}

export async function logError(input: LogErrorInput): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("error_logs").insert({
      organization_id: input.organizationId ?? null,
      user_id: input.userId ?? null,
      route: input.route ?? null,
      method: input.method ?? null,
      error_message: input.errorMessage.slice(0, 2000),
      stack_trace: input.stackTrace?.slice(0, 8000) ?? null,
      severity: input.severity ?? "error",
      metadata: input.metadata ?? {},
    });
  } catch (err) {
    logger.error(
      "Failed to persist error log",
      err instanceof Error ? err : new Error(String(err))
    );
  }
}
