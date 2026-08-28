#!/usr/bin/env node
/**
 * Promote a user to platform admin by email.
 *
 * Usage:
 *   node scripts/make_admin.mjs user@example.com
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL in .env.local
 * or the environment.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { getSupabaseUrl } from "./lib/supabase_env.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function loadEnvFile() {
  const envPath = resolve(root, ".env.local");
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile();

const email = process.argv[2];

if (!email) {
  console.error("Usage: node scripts/make_admin.mjs <email>");
  process.exit(1);
}

const url = getSupabaseUrl();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Set them in .env.local or the environment."
  );
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: user, error: findError } = await admin
  .from("users")
  .select("id, email, is_platform_admin")
  .eq("email", email)
  .maybeSingle();

if (findError) {
  if (findError.message?.includes("is_platform_admin")) {
    console.error("Migration 009 is not applied yet (is_platform_admin column missing).");
    console.error("");
    console.error("Run in Supabase SQL Editor:");
    console.error("  supabase/migrations/20240820000009_pilot_admin_feedback.sql");
    console.error("");
    console.error("Or run all pending migrations:");
    console.error("  supabase/APPLY_ALL_PENDING.sql");
    console.error("");
    console.error("SQL Editor: https://supabase.com/dashboard/project/kdufhywygwbnerrlfnok/sql/new");
    process.exit(1);
  }
  console.error("Database error:", findError.message);
  process.exit(1);
}

if (!user) {
  console.error(`No user found with email: ${email}`);
  process.exit(1);
}

if (user.is_platform_admin) {
  console.log(`${email} is already a platform admin.`);
  process.exit(0);
}

const { error: updateError } = await admin
  .from("users")
  .update({ is_platform_admin: true })
  .eq("id", user.id);

if (updateError) {
  console.error("Failed to promote user:", updateError.message);
  process.exit(1);
}

console.log(`Successfully promoted ${email} to platform admin.`);
