import { getHealthStatus } from "@/lib/health/health-check";
import { logger } from "@/lib/logging/logger";

export async function GET() {
  const health = await getHealthStatus();
  const statusCode =
    health.status === "unhealthy" ? 503 : 200;

  logger.info("Health check", { status: health.status });

  return Response.json(health, { status: statusCode });
}
