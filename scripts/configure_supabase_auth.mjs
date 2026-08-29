#!/usr/bin/env node
/**
 * Push Passport auth settings to Supabase (site URL, redirects, Google + Apple OAuth).
 *
 * Requires:
 *   SUPABASE_ACCESS_TOKEN — https://supabase.com/dashboard/account/tokens
 *   SUPABASE_PROJECT_REF  — defaults to kdufhywygwbnerrlfnok
 *   NEXT_PUBLIC_APP_URL   — production app URL
 *
 * Google (optional but required for Google sign-in):
 *   GOOGLE_OAUTH_CLIENT_ID
 *   GOOGLE_OAUTH_CLIENT_SECRET
 *
 * Apple (optional but required for Apple sign-in):
 *   APPLE_OAUTH_CLIENT_ID   — Services ID
 *   APPLE_OAUTH_CLIENT_SECRET — OR generate via APPLE_OAUTH_* + generate_apple_client_secret.mjs
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname, join } from "path";
import { fileURLToPath } from "url";
import { homedir } from "os";
import { spawnSync } from "child_process";

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

function resolveAccessToken() {
  if (process.env.SUPABASE_ACCESS_TOKEN?.trim()) {
    return process.env.SUPABASE_ACCESS_TOKEN.trim();
  }

  const tokenPath = join(homedir(), ".supabase", "access-token");
  if (existsSync(tokenPath)) {
    return readFileSync(tokenPath, "utf8").trim();
  }

  return null;
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

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF?.trim() ?? "kdufhywygwbnerrlfnok";
const ACCESS_TOKEN = resolveAccessToken();
const APP_URL = resolveProductionAppUrl();
const SUPABASE_URL = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");

if (!ACCESS_TOKEN) {
  console.error("Missing Supabase access token.");
  console.error("Run `npx supabase login` or set SUPABASE_ACCESS_TOKEN.");
  process.exit(1);
}

const redirectAllowList = [
  `${APP_URL}/auth/callback`,
  `${APP_URL}/auth/callback/**`,
  "http://localhost:3000/auth/callback",
  "http://localhost:3000/auth/callback/**",
  "http://127.0.0.1:3000/auth/callback",
].join(",");

const payload = {
  site_url: APP_URL,
  uri_allow_list: redirectAllowList,
};

const googleId = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim();
const googleSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim();
if (googleId && googleSecret) {
  payload.external_google_enabled = true;
  payload.external_google_client_id = googleId;
  payload.external_google_secret = googleSecret;
  console.log("→ Enabling Google OAuth");
} else {
  console.warn("⚠ Skipping Google OAuth — set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET");
}

let appleSecret = process.env.APPLE_OAUTH_CLIENT_SECRET?.trim();
const appleId = process.env.APPLE_OAUTH_CLIENT_ID?.trim();
if (!appleSecret && appleId && process.env.APPLE_OAUTH_PRIVATE_KEY?.trim()) {
  const gen = spawnSync(
    process.execPath,
    [resolve(__dirname, "generate_apple_client_secret.mjs")],
    { cwd: root, env: process.env, encoding: "utf8" }
  );
  if (gen.status !== 0) {
    console.error("Failed to generate Apple client secret JWT");
    console.error(gen.stderr || gen.stdout);
    process.exit(1);
  }
  appleSecret = gen.stdout.trim();
}

if (appleId && appleSecret) {
  payload.external_apple_enabled = true;
  payload.external_apple_client_id = appleId;
  payload.external_apple_secret = appleSecret;
  console.log("→ Enabling Apple OAuth");
} else {
  console.warn("⚠ Skipping Apple OAuth — set APPLE_OAUTH_CLIENT_ID and secret (or p8 key env vars)");
}

console.log(`\nUpdating Supabase auth config for project ${PROJECT_REF}…`);
console.log(`  site_url: ${APP_URL}`);
if (SUPABASE_URL) {
  console.log(`  Register in Google Cloud redirect URI: ${SUPABASE_URL}/auth/v1/callback`);
}

const response = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`, {
  method: "PATCH",
  headers: {
    Authorization: `Bearer ${ACCESS_TOKEN}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(payload),
});

const bodyText = await response.text();
if (!response.ok) {
  console.error(`✗ Management API failed (${response.status})`);
  console.error(bodyText);
  process.exit(1);
}

console.log("✓ Supabase auth config updated");
if (googleId) console.log("✓ Google sign-in enabled");
if (appleId) console.log("✓ Apple sign-in enabled");

console.log("\nNext: redeploy Passport if env vars changed, then test /login OAuth buttons.");
