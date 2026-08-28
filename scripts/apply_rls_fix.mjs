#!/usr/bin/env node
/** Re-apply core RLS policies (fixes shipment insert when policy is missing). */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function loadEnvFile() {
  const envPath = resolve(root, ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    if (!process.env[key]) process.env[key] = trimmed.slice(eq + 1).trim();
  }
}

loadEnvFile();

const dbUrl =
  process.env.SUPABASE_DB_URL ??
  process.env.DATABASE_URL ??
  process.env.POSTGRES_URL;

if (!dbUrl) {
  console.error("Missing SUPABASE_DB_URL in .env.local");
  console.error("");
  console.error("Or paste this file in Supabase SQL Editor:");
  console.error("  supabase/APPLY_STEP1_RLS.sql");
  console.error("  https://supabase.com/dashboard/project/kdufhywygwbnerrlfnok/sql/new");
  process.exit(1);
}

const sqlPath = resolve(root, "supabase/migrations/20240820000010_fix_rls_reapply.sql");
if (!existsSync(sqlPath)) {
  console.error("Missing migration: 20240820000010_fix_rls_reapply.sql");
  process.exit(1);
}

let pg;
try {
  pg = await import("pg");
} catch {
  console.error("Install pg first: npm install --save-dev pg");
  process.exit(1);
}

const client = new pg.default.Client({
  connectionString: dbUrl,
  ssl: dbUrl.includes("localhost") ? false : { rejectUnauthorized: false },
});

console.log("Applying RLS fix (20240820000010_fix_rls_reapply.sql)…");
try {
  await client.connect();
  await client.query(readFileSync(sqlPath, "utf8"));
  await client.end();
  console.log("✅ RLS policies re-applied. Run: npm run check-db");
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  console.error("\n❌ Failed:", msg);
  console.error("\nPaste supabase/APPLY_STEP1_RLS.sql in Supabase SQL Editor instead.");
  process.exit(1);
}
