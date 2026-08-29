#!/usr/bin/env node
/** Apply pending SQL migrations using direct Postgres connection (SUPABASE_DB_URL). */
import { readFileSync, existsSync, readdirSync } from "fs";
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
  console.error("Get it from Supabase Dashboard → Project Settings → Database → Connection string (URI)");
  console.error("Use the 'Session pooler' or direct connection string with your database password.");
  console.error("");
  console.error("Add to .env.local:");
  console.error("SUPABASE_DB_URL=postgresql://postgres.[ref]:[password]@...supabase.com:5432/postgres");
  process.exit(1);
}

const APPLY_ORDER = [
  "20240820000010_fix_rls_reapply.sql",
  "20240820000003_storage.sql",
  "20240820000004_document_extraction.sql",
  "20240820000005_document_processing_error.sql",
  "20240820000006_verification_passport_score.sql",
  "20240820000007_regulatory_workflow.sql",
  "20240820000008_risk_api_webhooks.sql",
  "20240820000009_pilot_admin_feedback.sql",
  "20240820000011_inbound_channels.sql",
  "20240820000018_compliance_enhancements.sql",
  "20240820000019_data_governance.sql",
  "20240820000020_additional_corridors.sql",
  "20240820000021_billing.sql",
  "20240820000022_external_collaborator_invites.sql",
  "20240820000023_protect_platform_admin_flag.sql",
];

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

console.log("Connecting to database…");
try {
  await client.connect();
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("password authentication failed")) {
    console.error("\n❌ Database password rejected.");
    console.error("   Reset it: Supabase Dashboard → Project Settings → Database → Reset database password");
    console.error("   Then update SUPABASE_DB_URL in .env.local");
    console.error("\n   Or paste SQL in the editor (no password needed):");
    console.error("   supabase/APPLY_ALL_PENDING.sql");
    console.error("   https://supabase.com/dashboard/project/kdufhywygwbnerrlfnok/sql/new");
  } else if (msg.includes("ENOTFOUND") || msg.includes("ENETUNREACH")) {
    console.error("\n❌ Cannot reach database host (IPv6/network issue).");
    console.error("   Use the pooler URL in .env.local:");
    console.error("   postgresql://postgres.kdufhywygwbnerrlfnok:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres");
    console.error("\n   Or paste SQL in the Supabase SQL Editor:");
    console.error("   supabase/APPLY_ALL_PENDING.sql");
  } else {
    console.error("\n❌ Connection failed:", msg);
  }
  process.exit(1);
}

for (const file of APPLY_ORDER) {
  const path = resolve(root, "supabase/migrations", file);
  if (!existsSync(path)) {
    console.error(`Missing migration file: ${file}`);
    process.exit(1);
  }
  const sql = readFileSync(path, "utf8");
  console.log(`\nApplying ${file}…`);
  try {
    await client.query(sql);
    console.log(`  ✅ ${file}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (
      msg.includes("already exists") ||
      msg.includes("duplicate key") ||
      msg.includes("does not exist, skipping")
    ) {
      console.log(`  ⚠ Skipped (likely already applied): ${msg.split("\n")[0]}`);
      continue;
    }
    console.error(`  ❌ Failed: ${msg}`);
    await client.end();
    process.exit(1);
  }
}

await client.end();
console.log("\n✅ Migrations applied. Run: npm run check-migrations && npm run check-db");
