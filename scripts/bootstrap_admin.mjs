#!/usr/bin/env node
/**
 * Bootstrap a platform admin user (bypasses Supabase Auth signup rate limits).
 *
 * Usage:
 *   node scripts/bootstrap_admin.mjs trotroosapp@gmail.com YourPassword123 "Your Name"
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { getSupabaseUrl } from "./lib/supabase_env.mjs";
import { randomBytes } from "crypto";

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
const password = process.argv[3];
const fullName = process.argv[4] ?? "Admin User";

if (!email || !password) {
  console.error(
    'Usage: node scripts/bootstrap_admin.mjs <email> <password> ["Full Name"]'
  );
  process.exit(1);
}

if (password.length < 8) {
  console.error("Password must be at least 8 characters.");
  process.exit(1);
}

const url = getSupabaseUrl();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function slugify(name) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `${base || "org"}-${randomBytes(3).toString("hex")}`;
}

// Check if profile already exists
const { data: existingProfile } = await admin
  .from("users")
  .select("id, email, is_platform_admin")
  .eq("email", email)
  .maybeSingle();

if (existingProfile) {
  if (!existingProfile.is_platform_admin) {
    await admin
      .from("users")
      .update({ is_platform_admin: true })
      .eq("id", existingProfile.id);
    console.log(`Promoted existing user ${email} to platform admin.`);
  } else {
    console.log(`${email} already exists as platform admin. Try logging in at /login`);
  }
  process.exit(0);
}

// Create auth user (service role — not rate limited like public signup)
const { data: authData, error: authError } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { full_name: fullName },
});

if (authError) {
  // User may exist in auth but not in public.users
  if (authError.message.toLowerCase().includes("already")) {
    const { data: listData } = await admin.auth.admin.listUsers();
    const authUser = listData?.users?.find((u) => u.email === email);
    if (!authUser) {
      console.error("Auth error:", authError.message);
      process.exit(1);
    }
    console.log("Auth user already exists — creating org profile...");
    await createProfile(authUser.id);
    process.exit(0);
  }
  console.error("Auth error:", authError.message);
  process.exit(1);
}

if (!authData.user) {
  console.error("Failed to create auth user.");
  process.exit(1);
}

await createProfile(authData.user.id);

async function createProfile(userId) {
  const orgName = fullName.includes("@")
    ? email.split("@")[1]?.split(".")[0] ?? "Organization"
    : `${fullName.split(" ")[0]}'s Organization`;
  const slug = slugify(orgName);

  const { data: org, error: orgError } = await admin
    .from("organizations")
    .insert({ name: orgName, slug })
    .select()
    .single();

  if (orgError || !org) {
    console.error("Organization error:", orgError?.message ?? "unknown");
    process.exit(1);
  }

  const profileRow = {
    id: userId,
    email,
    full_name: fullName,
    organization_id: org.id,
    role: "owner",
    is_platform_admin: true,
  };

  let { error: userError } = await admin.from("users").insert(profileRow);

  if (userError?.message?.includes("is_platform_admin")) {
    const { is_platform_admin: _removed, ...withoutAdmin } = profileRow;
    void _removed;
    ({ error: userError } = await admin.from("users").insert(withoutAdmin));
    if (!userError) {
      console.warn(
        "Note: is_platform_admin column missing — run migration 20240820000009, then: npm run make-admin --",
        email
      );
    }
  }

  if (userError) {
    console.error("Profile error:", userError.message);
    console.error(
      "Tip: Ensure all migrations (001–009) have been run in Supabase SQL Editor."
    );
    process.exit(1);
  }

  console.log("");
  console.log("Account created successfully!");
  console.log(`  Email:    ${email}`);
  console.log(`  Admin:    yes (platform admin)`);
  console.log(`  Login:    http://localhost:3000/login`);
  console.log(`  Admin UI: http://localhost:3000/admin/dashboard`);
  console.log("");
}
