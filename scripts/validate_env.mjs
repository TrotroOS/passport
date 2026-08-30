#!/usr/bin/env node
/** Validate environment before production build / deploy. */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function loadEnvFile() {
  for (const name of [".env.local", ".env"]) {
    const envPath = resolve(root, name);
    if (!existsSync(envPath)) continue;
    for (const line of readFileSync(envPath, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      if (!process.env[key]) process.env[key] = trimmed.slice(eq + 1).trim();
    }
  }
}

loadEnvFile();

if (process.env.SKIP_ENV_VALIDATION === "true") {
  console.log("validate-env: skipped (SKIP_ENV_VALIDATION=true)");
  process.exit(0);
}

const FORBIDDEN_IN_PRODUCTION = [
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
];

const isProduction = process.env.NODE_ENV === "production";
const strict = process.env.VALIDATE_ENV_STRICT === "true" || isProduction;

if (!strict) {
  console.log("validate-env: skipped (set NODE_ENV=production or VALIDATE_ENV_STRICT=true for strict checks)");
  process.exit(0);
}

const errors = [];
const warnings = [];

for (const [key, value] of FORBIDDEN_IN_PRODUCTION) {
  if (process.env[key] === value) {
    errors.push(`${key}=${value} must not be set in production`);
  }
}

for (const key of REQUIRED_IN_PRODUCTION) {
  if (key === "SUPABASE_URL") {
    if (!process.env.SUPABASE_URL?.trim() && !process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()) {
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

if (!process.env.TRACKING_WEBHOOK_SECRET) {
  warnings.push("TRACKING_WEBHOOK_SECRET is not set — tracking webhooks disabled in production");
}

if ((process.env.TRACKING_PROVIDER ?? "mock") === "mock") {
  warnings.push("TRACKING_PROVIDER=mock — use a live provider for production tracking");
} else if (!process.env.TRACKING_API_KEY?.trim()) {
  errors.push(
    `TRACKING_API_KEY is required when TRACKING_PROVIDER=${process.env.TRACKING_PROVIDER}`
  );
}

if (process.env.NODE_ENV === "production" && !process.env.CRON_SECRET?.trim()) {
  warnings.push("CRON_SECRET is not set — scheduled tracking refresh disabled");
}

if (!process.env.SENDGRID_API_KEY) {
  warnings.push("SENDGRID_API_KEY is not set — email notifications will be skipped");
}

if (!process.env.SENTRY_DSN) {
  warnings.push("SENTRY_DSN is not set — error monitoring disabled");
}

if (!process.env.STRIPE_SECRET_KEY) {
  warnings.push("STRIPE_SECRET_KEY is not set — billing checkout disabled");
}

if (process.env.OPENSANCTIONS_ENABLED === "true" && !process.env.OPENSANCTIONS_API_KEY?.trim()) {
  warnings.push("OPENSANCTIONS_ENABLED=true but OPENSANCTIONS_API_KEY is missing — live screening disabled");
}

if (
  process.env.OPENSANCTIONS_ENABLED === "true" &&
  process.env.OPENSANCTIONS_API_KEY?.trim() &&
  !process.env.OPENSANCTIONS_API_URL?.trim()
) {
  warnings.push("OPENSANCTIONS_API_URL not set — using default https://api.opensanctions.org/match/default");
}

for (const w of warnings) {
  console.warn(`validate-env warning: ${w}`);
}

if (errors.length > 0) {
  console.error("validate-env failed:");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log("validate-env: production environment OK");
