#!/usr/bin/env node
/** Apply one migration file by name (e.g. 20240820000022_external_collaborator_invites.sql). */
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

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/apply_single_migration.mjs <migration-file.sql>");
  process.exit(1);
}

const path = resolve(root, "supabase/migrations", file);
if (!existsSync(path)) {
  console.error(`Migration not found: ${path}`);
  process.exit(1);
}

const dbUrl =
  process.env.SUPABASE_DB_URL ??
  process.env.DATABASE_URL ??
  process.env.POSTGRES_URL;

if (!dbUrl) {
  console.error("Missing SUPABASE_DB_URL in .env.local");
  process.exit(1);
}

let pg;
try {
  pg = await import("pg");
} catch {
  console.error("Install pg first: npm install --save-dev pg");
  process.exit(1);
}

const sql = readFileSync(path, "utf8");
const client = new pg.default.Client({
  connectionString: dbUrl,
  ssl: dbUrl.includes("localhost") ? false : { rejectUnauthorized: false },
});

console.log(`Applying ${file}…`);
try {
  await client.connect();
  await client.query(sql);
  console.log(`✅ Applied ${file}`);
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`❌ Failed: ${msg}`);
  console.error("\nPaste this file in Supabase SQL Editor instead:");
  console.error("  https://supabase.com/dashboard/project/kdufhywygwbnerrlfnok/sql/new");
  console.error(`  supabase/migrations/${file}`);
  const shortcut = resolve(root, "supabase", `APPLY_MIGRATION_${file.match(/(\d{3})/)?.[1] ?? ""}.sql`);
  if (existsSync(shortcut)) console.error(`  or: ${shortcut.replace(root + "\\", "").replace(/\\/g, "/")}`);
  process.exit(1);
} finally {
  await client.end().catch(() => undefined);
}
