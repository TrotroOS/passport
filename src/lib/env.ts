/**
 * Production environment validation. Called from instrumentation.ts on server startup.
 */

const FORBIDDEN_IN_PRODUCTION: Array<[string, string]> = [
  ["INBOUND_ALLOW_UNVERIFIED", "true"],
  ["AUTO_CONFIRM_EMAIL", "true"],
  ["FIRST_USER_IS_ADMIN", "true"],
];

const REQUIRED_IN_PRODUCTION = [
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_APP_URL",
  "OPENAI_API_KEY",
] as const;

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

export function validateProductionEnvironment(): void {
  if (!isProduction()) return;

  const errors: string[] = [];

  for (const [key, value] of FORBIDDEN_IN_PRODUCTION) {
    if (process.env[key] === value) {
      errors.push(`${key}=${value} must not be set in production`);
    }
  }

  for (const key of REQUIRED_IN_PRODUCTION) {
    if (key === "SUPABASE_URL") {
      if (
        !process.env.SUPABASE_URL?.trim() &&
        !process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
      ) {
        errors.push("Missing required env var: SUPABASE_URL");
      }
      continue;
    }
    if (key === "SUPABASE_ANON_KEY") {
      if (
        !process.env.SUPABASE_ANON_KEY?.trim() &&
        !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
      ) {
        errors.push("Missing required env var: SUPABASE_ANON_KEY");
      }
      continue;
    }
    if (!process.env[key]?.trim()) {
      errors.push(`Missing required env var: ${key}`);
    }
  }

  const hasRedis =
    (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) ||
    (process.env.REDIS_URL && process.env.REDIS_TOKEN);

  if (!hasRedis) {
    errors.push(
      "Rate limiting requires UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN (or REDIS_URL + REDIS_TOKEN)"
    );
  }

  if (process.env.TRACKING_PROVIDER === "mock") {
    console.warn(
      "[Passport] TRACKING_PROVIDER=mock in production — configure a live provider for real tracking"
    );
  }

  if (errors.length > 0) {
    throw new Error(
      `Production environment validation failed:\n${errors.map((e) => `  - ${e}`).join("\n")}`
    );
  }
}
