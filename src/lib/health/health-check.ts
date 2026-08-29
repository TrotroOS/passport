import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logging/logger";

export interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  checks: {
    database: { status: "up" | "down"; latencyMs?: number; error?: string };
    redis: { status: "up" | "down" | "not_configured"; latencyMs?: number };
    ai_provider: { status: "configured" | "not_configured" };
    email_delivery: { status: "configured" | "not_configured" };
  };
  app_url: string | null;
  version: string;
}

export async function getHealthStatus(): Promise<HealthStatus> {
  const checks: HealthStatus["checks"] = {
    database: { status: "down" },
    redis: { status: "not_configured" },
    ai_provider: {
      status: process.env.OPENAI_API_KEY ? "configured" : "not_configured",
    },
    email_delivery: {
      status: process.env.SENDGRID_API_KEY ? "configured" : "not_configured",
    },
  };

  let overall: HealthStatus["status"] = "healthy";

  const dbStart = Date.now();
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("organizations").select("id").limit(1);
    checks.database = {
      status: error ? "down" : "up",
      latencyMs: Date.now() - dbStart,
      ...(error ? { error: error.message } : {}),
    };
    if (error) overall = "unhealthy";
  } catch (err) {
    checks.database = {
      status: "down",
      latencyMs: Date.now() - dbStart,
      error: err instanceof Error ? err.message : "Database unreachable",
    };
    overall = "unhealthy";
  }

  const redisUrl = process.env.UPSTASH_REDIS_REST_URL ?? process.env.REDIS_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.REDIS_TOKEN;

  if (checks.ai_provider.status === "not_configured" && overall === "healthy") {
    overall = "degraded";
  }

  if (checks.email_delivery.status === "not_configured" && overall === "healthy") {
    overall = "degraded";
  }

  if (redisUrl && redisToken) {
    const redisStart = Date.now();
    try {
      const response = await fetch(`${redisUrl}/ping`, {
        headers: { Authorization: `Bearer ${redisToken}` },
        signal: AbortSignal.timeout(3000),
      });
      checks.redis = {
        status: response.ok ? "up" : "down",
        latencyMs: Date.now() - redisStart,
      };
      if (!response.ok && overall === "healthy") overall = "degraded";
    } catch {
      checks.redis = { status: "down", latencyMs: Date.now() - redisStart };
      if (overall === "healthy") overall = "degraded";
    }
  }

  return {
    status: overall,
    timestamp: new Date().toISOString(),
    checks,
    app_url: process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? null,
    version: process.env.npm_package_version ?? "0.1.0",
  };
}

export async function healthCheckHandler(): Promise<Response> {
  const health = await getHealthStatus();
  const statusCode =
    health.status === "healthy"
      ? 200
      : health.status === "degraded"
        ? 200
        : 503;

  logger.info("Health check", { status: health.status });

  return Response.json(health, { status: statusCode });
}
