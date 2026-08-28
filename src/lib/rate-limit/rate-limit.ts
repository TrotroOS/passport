import { isProduction } from "@/lib/env";
import { ApiError } from "@/lib/errors/api-error";
import { logger } from "@/lib/logging/logger";

export type RateLimitTier =
  | "api_general"
  | "api_v1"
  | "auth_login"
  | "auth_signup"
  | "document_upload"
  | "ai_processing"
  | "inbound_message";

interface RateLimitConfig {
  limit: number;
  windowMs: number;
}

const LIMITS: Record<RateLimitTier, RateLimitConfig> = {
  api_general: { limit: 100, windowMs: 60_000 },
  api_v1: { limit: 300, windowMs: 60_000 },
  auth_login: { limit: 10, windowMs: 900_000 },
  auth_signup: { limit: 5, windowMs: 3_600_000 },
  document_upload: { limit: 20, windowMs: 3_600_000 },
  ai_processing: { limit: 50, windowMs: 3_600_000 },
  inbound_message: { limit: 20, windowMs: 3_600_000 },
};

interface MemoryEntry {
  count: number;
  resetAt: number;
}

const memoryStore = new Map<string, MemoryEntry>();
let memoryFallbackLogged = false;

function checkMemoryLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  let entry = memoryStore.get(key);

  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + windowMs };
    memoryStore.set(key, entry);
  }

  entry.count += 1;
  const allowed = entry.count <= limit;

  return {
    allowed,
    remaining: Math.max(0, limit - entry.count),
    resetAt: entry.resetAt,
  };
}

async function checkRedisLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number; resetAt: number } | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.REDIS_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.REDIS_TOKEN;

  if (!url || !token) return null;

  try {
    const windowSec = Math.ceil(windowMs / 1000);
    const redisKey = `passport:rl:${key}`;

    const pipeline = [
      ["INCR", redisKey],
      ["TTL", redisKey],
    ];

    const response = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(pipeline),
    });

    if (!response.ok) return null;

    const results = (await response.json()) as Array<{ result: number }>;
    const count = results[0]?.result ?? 1;
    let ttl = results[1]?.result ?? -1;

    if (ttl === -1) {
      await fetch(`${url}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(["EXPIRE", redisKey, windowSec]),
      });
      ttl = windowSec;
    }

    const resetAt = Date.now() + ttl * 1000;
    return {
      allowed: count <= limit,
      remaining: Math.max(0, limit - count),
      resetAt,
    };
  } catch {
    return null;
  }
}

export async function checkRateLimit(
  identifier: string,
  tier: RateLimitTier
): Promise<{ remaining: number; resetAt: number }> {
  const config = LIMITS[tier];
  const key = `${tier}:${identifier}`;

  let result = await checkRedisLimit(key, config.limit, config.windowMs);

  if (!result) {
    if (isProduction()) {
      throw new ApiError(
        "SERVICE_UNAVAILABLE",
        "Rate limiting is temporarily unavailable",
        503
      );
    }
    if (!memoryFallbackLogged && process.env.NODE_ENV !== "test") {
      logger.warn("Rate limiting using in-memory store (Redis not configured)");
      memoryFallbackLogged = true;
    }
    result = checkMemoryLimit(key, config.limit, config.windowMs);
  }

  if (!result.allowed) {
    const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
    logger.warn("Rate limit exceeded", {
      tier,
      identifier,
      limit: config.limit,
    });
    throw new ApiError(
      "RATE_LIMITED",
      "Too many requests. Please try again later.",
      429,
      { retryAfter, limit: config.limit, tier }
    );
  }

  return { remaining: result.remaining, resetAt: result.resetAt };
}

export function resetRateLimitStore(): void {
  memoryStore.clear();
  memoryFallbackLogged = false;
}

/** @internal exported for unit tests */
export { LIMITS };
