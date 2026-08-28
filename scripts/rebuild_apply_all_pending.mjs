#!/usr/bin/env node
/** Rebuild supabase/APPLY_ALL_PENDING.sql as UTF-8 from migration sections + 012–015. */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const outPath = resolve(root, "supabase/APPLY_ALL_PENDING.sql");

const BASE_FILES = [
  "20240820000010_fix_rls_reapply.sql",
  "20240820000003_storage.sql",
  "20240820000004_document_extraction.sql",
  "20240820000005_document_processing_error.sql",
  "20240820000006_verification_passport_score.sql",
  "20240820000007_regulatory_workflow.sql",
  "20240820000008_risk_api_webhooks.sql",
  "20240820000009_pilot_admin_feedback.sql",
  "20240820000011_inbound_channels.sql",
];

const TAIL_MIGRATIONS = [
  "20240820000012_trade_abbreviations_incoterms.sql",
  "20240820000013_customs_broker_collaboration.sql",
  "20240820000014_hs_code_suggestion_verification.sql",
  "20240820000015_analytics_indexes.sql",
  "20240820000016_freight_tracking.sql",
  "20240820000017_user_language_preference.sql",
];

function readMigration(name) {
  const path = resolve(root, "supabase/migrations", name);
  if (!existsSync(path)) {
    throw new Error(`Missing migration: ${name}`);
  }
  return readFileSync(path, "utf8").trim();
}

const parts = [
  "-- Passport: apply all pending migrations (003–015 after initial schema 001/002)",
  "-- Regenerate with: node scripts/rebuild_apply_all_pending.mjs",
  "-- Paste entire file in Supabase SQL Editor if CLI apply-migrations fails.",
  "",
];

for (const file of BASE_FILES) {
  parts.push(`-- ===== ${file} =====`, readMigration(file), "");
}

for (const file of TAIL_MIGRATIONS) {
  parts.push(`-- ===== ${file} =====`, readMigration(file), "");
}

writeFileSync(outPath, parts.join("\n") + "\n", "utf8");
console.log(`Wrote ${outPath} (${parts.join("\n").split("\n").length} lines, UTF-8)`);
