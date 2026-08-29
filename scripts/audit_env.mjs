#!/usr/bin/env node
/** Report which production env vars are set (values never printed). */
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

const REQUIRED = [
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_APP_URL",
  "OPENAI_API_KEY",
];

const REDIS_GROUPS = [
  ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"],
  ["REDIS_URL", "REDIS_TOKEN"],
];

const FORBIDDEN = [
  "AUTO_CONFIRM_EMAIL",
  "FIRST_USER_IS_ADMIN",
  "INBOUND_ALLOW_UNVERIFIED",
];

const RECOMMENDED = [
  "SENDGRID_API_KEY",
  "SENTRY_DSN",
  "TRACKING_WEBHOOK_SECRET",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "NEXT_PUBLIC_SUPPORT_EMAIL",
];

const OPTIONAL = [
  "SUPABASE_DB_URL",
  "OPENSANCTIONS_ENABLED",
  "STRIPE_PRICE_PRO",
  "INBOUND_EMAIL_SECRET",
  "TRACKING_PROVIDER",
];

function isSet(key) {
  const val = process.env[key];
  return Boolean(val?.trim() && !val.includes("your-") && !val.includes("example"));
}

function hasSupabaseUrl() {
  return isSet("SUPABASE_URL") || isSet("NEXT_PUBLIC_SUPABASE_URL");
}

function hasSupabaseAnonKey() {
  return isSet("SUPABASE_ANON_KEY") || isSet("NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

function status(key) {
  return isSet(key) ? "SET" : "MISSING";
}

console.log("Passport env audit (local .env.local — mirror these in Vercel)\n");

console.log("Required for production:");
console.log(`  [${hasSupabaseUrl() ? "SET" : "MISSING"}] SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)`);
console.log(`  [${hasSupabaseAnonKey() ? "SET" : "MISSING"}] SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)`);
for (const key of ["SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_APP_URL", "OPENAI_API_KEY"]) {
  console.log(`  [${status(key)}] ${key}`);
}

const hasRedis = REDIS_GROUPS.some((group) => group.every(isSet));
console.log(`  [${hasRedis ? "SET" : "MISSING"}] Redis rate limiting (Upstash or REDIS_URL+TOKEN)`);

console.log("\nForbidden in production (must be unset or not 'true'):");
for (const key of FORBIDDEN) {
  const val = process.env[key];
  const bad = val === "true";
  console.log(`  [${bad ? "BAD" : "OK"}] ${key}${bad ? "=true" : val ? " (set but not true)" : ""}`);
}

console.log("\nRecommended:");
for (const key of RECOMMENDED) {
  console.log(`  [${status(key)}] ${key}`);
}

console.log("\nOptional / ops:");
for (const key of OPTIONAL) {
  console.log(`  [${status(key)}] ${key}`);
}

console.log("\nVercel checklist:");
console.log("  1. Vercel → your project → Settings → Environment Variables");
console.log("  2. Filter: Production");
console.log("  3. Match every REQUIRED + Redis row above");
console.log("  4. Confirm FORBIDDEN rows show OK (not BAD)");
console.log("  5. Redeploy after changing env vars");

const errors = [];
if (!hasSupabaseUrl()) errors.push("SUPABASE_URL");
if (!hasSupabaseAnonKey()) errors.push("SUPABASE_ANON_KEY");
for (const key of ["SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_APP_URL", "OPENAI_API_KEY"]) {
  if (!isSet(key)) errors.push(key);
}
if (!hasRedis) errors.push("Redis (Upstash or REDIS_URL+TOKEN)");
for (const key of FORBIDDEN) {
  if (process.env[key] === "true") errors.push(`${key}=true`);
}

if (errors.length) {
  console.log(`\n❌ ${errors.length} issue(s) in local env — fix in Vercel Production too.`);
  process.exit(1);
}

console.log("\n✅ Local env looks production-ready (run validate-env for full check).");
