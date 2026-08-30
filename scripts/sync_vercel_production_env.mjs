#!/usr/bin/env node
/** Push selected env vars from .env.local to Vercel Production (names only logged). */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function loadEnvFile() {
  const envPath = resolve(root, ".env.local");
  if (!existsSync(envPath)) {
    console.error("Missing .env.local");
    process.exit(1);
  }
  const out = {};
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    out[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return out;
}

const PRODUCTION_URL = "https://passport-one-kappa.vercel.app";

const SECRET_VARS = ["SENDGRID_API_KEY", "UPSTASH_REDIS_REST_TOKEN", "OPENSANCTIONS_API_KEY"];
const CONFIG_VARS = [
  "INBOUND_EMAIL_FROM",
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "UPSTASH_REDIS_REST_URL",
  "OPENSANCTIONS_ENABLED",
  "OPENSANCTIONS_API_URL",
  "OPENSANCTIONS_MATCH_THRESHOLD",
];

const env = loadEnvFile();
let failed = 0;

function upsert(name, value, { secret = false } = {}) {
  if (!value?.trim()) {
    console.warn(`⚠ Skipping ${name} — no value in .env.local`);
    return;
  }
  console.log(`→ Setting ${name} on Vercel Production…`);
  // Pass --value last; angle brackets in INBOUND_EMAIL_FROM break some Windows shells.
  const args = [
    "vercel",
    "env",
    "add",
    name,
    "production",
    "--force",
    "--yes",
  ];
  if (secret) args.push("--sensitive");
  else args.push("--no-sensitive");

  const result = spawnSync("npx", [...args, "--value", value], {
    cwd: root,
    stdio: "inherit",
    shell: true,
  });
  if (result.status !== 0) {
    console.error(`✗ Failed to set ${name}`);
    failed++;
  } else {
    console.log(`✓ ${name} set`);
  }
}

console.log("Syncing Vercel Production environment variables\n");

for (const name of SECRET_VARS) {
  upsert(name, env[name], { secret: true });
}
for (const name of CONFIG_VARS) {
  let value = env[name];
  if (name === "NEXT_PUBLIC_APP_URL") {
    value = PRODUCTION_URL;
  } else if (name === "NEXT_PUBLIC_SUPABASE_URL") {
    value = env.NEXT_PUBLIC_SUPABASE_URL ?? env.SUPABASE_URL;
  } else if (name === "NEXT_PUBLIC_SUPABASE_ANON_KEY") {
    value = env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? env.SUPABASE_ANON_KEY;
  }
  upsert(name, value, { secret: false });
}

console.log("");
if (failed) {
  console.error(`Done with ${failed} failure(s).`);
  process.exit(1);
}

console.log("Done. Redeploy production for changes to take effect:");
console.log("  npx vercel --prod --yes");
