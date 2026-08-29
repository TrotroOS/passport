#!/usr/bin/env node
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

const dbUrl = process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("Missing SUPABASE_DB_URL");
  process.exit(1);
}

const pg = await import("pg");
const client = new pg.default.Client({
  connectionString: dbUrl,
  ssl: dbUrl.includes("localhost") ? false : { rejectUnauthorized: false },
});

await client.connect();

const { rows } = await client.query(
  `SELECT column_name, data_type, column_default
   FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name = 'shipment_collaborators'
     AND column_name = 'participant_type'`
);

if (!rows.length) {
  console.error("❌ participant_type column is missing");
  process.exit(1);
}

console.log("✅ participant_type column exists:", rows[0]);

await client.query("NOTIFY pgrst, 'reload schema'");
console.log("✅ PostgREST schema cache reload notified");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (supabaseUrl && serviceKey) {
  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(supabaseUrl, serviceKey);
  const { error } = await admin
    .from("shipment_collaborators")
    .select("participant_type")
    .limit(1);

  if (error) {
    console.error("❌ PostgREST still missing participant_type:", error.message);
    process.exit(1);
  }
  console.log("✅ PostgREST schema cache includes participant_type");
}

await client.end();
