#!/usr/bin/env node
/** Report which Passport migrations appear applied on the remote database. */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { getSupabaseAnonKey, getSupabaseUrl } from "./lib/supabase_env.mjs";

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

const url = getSupabaseUrl();
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !service) {
  console.error("Missing Supabase env vars in .env.local");
  process.exit(1);
}

const admin = createClient(url, service, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const MIGRATION_CHECKS = [
  {
    id: "002/010",
    label: "RLS policies",
    file: "20240820000010_fix_rls_reapply.sql",
    check: async () => {
      const anon = getSupabaseAnonKey();
      if (!anon) return false;
      const client = createClient(url, anon);
      const email = process.argv[2] ?? "trotroosapp@gmail.com";
      const password = process.argv[3] ?? "Mensdom24.";
      const { error: signErr } = await client.auth.signInWithPassword({ email, password });
      if (signErr) return false;
      const { data } = await client.from("users").select("id").maybeSingle();
      return Boolean(data);
    },
  },
  {
    id: "003",
    label: "Storage bucket",
    file: "20240820000003_storage.sql",
    check: async () => {
      const { data, error } = await admin.storage.getBucket("passport-documents");
      return !error && Boolean(data);
    },
  },
  {
    id: "004",
    label: "Document extraction",
    file: "20240820000004_document_extraction.sql",
    check: async () => tableExists("document_extractions"),
  },
  {
    id: "005",
    label: "Document processing error column",
    file: "20240820000005_document_processing_error.sql",
    check: async () => columnExists("documents", "processing_error"),
  },
  {
    id: "006",
    label: "Verification & passport score",
    file: "20240820000006_verification_passport_score.sql",
    check: async () => tableExists("verification_checks"),
  },
  {
    id: "007",
    label: "Regulatory workflow",
    file: "20240820000007_regulatory_workflow.sql",
    check: async () => tableExists("regulations"),
  },
  {
    id: "008",
    label: "Risk, API keys, webhooks",
    file: "20240820000008_risk_api_webhooks.sql",
    check: async () => tableExists("api_keys"),
  },
  {
    id: "009",
    label: "Admin panel & feedback",
    file: "20240820000009_pilot_admin_feedback.sql",
    check: async () => columnExists("users", "is_platform_admin"),
  },
  {
    id: "011",
    label: "Inbound channels",
    file: "20240820000011_inbound_channels.sql",
    check: async () => tableExists("inbound_messages"),
  },
  {
    id: "012",
    label: "Trade abbreviations & incoterms",
    file: "20240820000012_trade_abbreviations_incoterms.sql",
    check: async () => tableExists("document_abbreviations"),
  },
  {
    id: "013",
    label: "Customs broker collaboration",
    file: "20240820000013_customs_broker_collaboration.sql",
    check: async () => tableExists("shipment_collaborators"),
  },
  {
    id: "014",
    label: "HS code suggestion & verification",
    file: "20240820000014_hs_code_suggestion_verification.sql",
    check: async () => tableExists("hs_code_suggestions"),
  },
  {
    id: "015",
    label: "Analytics indexes",
    file: "20240820000015_analytics_indexes.sql",
    check: async () => columnExists("products", "hs_code_status"),
  },
  {
    id: "016",
    label: "Freight tracking integration",
    file: "20240820000016_freight_tracking.sql",
    check: async () => tableExists("container_details"),
  },
  {
    id: "017",
    label: "User language preference",
    file: "20240820000017_user_language_preference.sql",
    check: async () => columnExists("users", "preferred_language"),
  },
  {
    id: "018",
    label: "Compliance enhancements (screening, notifications)",
    file: "20240820000018_compliance_enhancements.sql",
    check: async () => tableExists("party_screenings"),
  },
  {
    id: "019",
    label: "Data governance (provenance, trust)",
    file: "20240820000019_data_governance.sql",
    check: async () => tableExists("trusted_sources"),
  },
  {
    id: "020",
    label: "Additional regulatory corridors (NG, KE)",
    file: "20240820000020_additional_corridors.sql",
    check: async () => {
      const { data } = await admin.from("jurisdictions").select("code").eq("code", "NG").maybeSingle();
      return Boolean(data);
    },
  },
  {
    id: "021",
    label: "Stripe billing foundation",
    file: "20240820000021_billing.sql",
    check: async () => columnExists("organizations", "stripe_customer_id"),
  },
  {
    id: "022",
    label: "External collaborator invites",
    file: "20240820000022_external_collaborator_invites.sql",
    check: async () => columnExists("shipment_collaborators", "invitee_email"),
  },
];

async function tableExists(table) {
  const { error } = await admin.from(table).select("id").limit(1);
  return !error;
}

async function columnExists(table, column) {
  const { error } = await admin.from(table).select(column).limit(1);
  return !error;
}

console.log("Passport migration status\n");

const pending = [];

for (const migration of MIGRATION_CHECKS) {
  let ok = false;
  try {
    ok = await migration.check();
  } catch {
    ok = false;
  }
  console.log(`  [${ok ? "OK" : "MISSING"}] ${migration.id} — ${migration.label}`);
  if (!ok) pending.push(migration);
}

if (pending.length) {
  console.log(`\n❌ ${pending.length} migration(s) not applied.`);
  console.log("\nApply all pending migrations:");
  console.log("  1. Add SUPABASE_DB_URL to .env.local (Supabase → Settings → Database → URI)");
  console.log("  2. Run: npm run apply-migrations");
  console.log("\nOr paste each pending file in SQL Editor:");
  console.log("  https://supabase.com/dashboard/project/kdufhywygwbnerrlfnok/sql/new");
  for (const migration of pending) {
    if (migration.file) {
      console.log(`     supabase/migrations/${migration.file}  (${migration.id})`);
    }
  }
  process.exit(1);
}

console.log("\n✅ All migrations appear applied.");
