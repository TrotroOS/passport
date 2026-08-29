#!/usr/bin/env node
/** Smoke-test that Supabase OAuth providers are enabled for Passport. */
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

function resolveProductionAppUrl() {
  const candidates = [
    process.env.EMAIL_PUBLIC_APP_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    "https://passport-one-kappa.vercel.app",
  ];

  for (const candidate of candidates) {
    const url = candidate?.trim().replace(/\/$/, "");
    if (!url) continue;
    if (
      url.includes("localhost") ||
      url.includes("127.0.0.1") ||
      url.startsWith("http://")
    ) {
      continue;
    }
    return url;
  }

  return "https://passport-one-kappa.vercel.app";
}

const supabaseUrl = (
  process.env.SUPABASE_URL ??
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  ""
).replace(/\/$/, "");
const appUrl = resolveProductionAppUrl();

if (!supabaseUrl) {
  console.error("Missing SUPABASE_URL");
  process.exit(1);
}

async function checkProvider(provider) {
  const redirectTo = `${appUrl}/auth/callback?next=%2Fdashboard`;
  const url = `${supabaseUrl}/auth/v1/authorize?provider=${provider}&redirect_to=${encodeURIComponent(redirectTo)}`;
  const response = await fetch(url, { redirect: "manual" });
  const text = await response.text();

  if (response.status === 302 || response.status === 303) {
    const location = response.headers.get("location") ?? "";
    if (location.includes("accounts.google.com") || location.includes("appleid.apple.com")) {
      console.log(`  ✅ ${provider} — provider enabled (redirects to IdP)`);
      return true;
    }
    console.log(`  ⚠ ${provider} — unexpected redirect: ${location.slice(0, 120)}`);
    return false;
  }

  if (text.includes("provider is not enabled")) {
    console.log(`  ❌ ${provider} — not enabled in Supabase Dashboard`);
    return false;
  }

  console.log(`  ❌ ${provider} — HTTP ${response.status}: ${text.slice(0, 160)}`);
  return false;
}

console.log("OAuth provider smoke test\n");
console.log(`Supabase: ${supabaseUrl}`);
console.log(`App callback: ${appUrl}/auth/callback\n`);

const googleOk = await checkProvider("google");
const appleOk = await checkProvider("apple");

if (!googleOk || !appleOk) {
  console.log("\nFix: add OAuth credentials to .env.local, then run:");
  console.log("  npm run configure-supabase-auth");
  process.exit(1);
}

console.log("\nAll OAuth providers look configured.");
