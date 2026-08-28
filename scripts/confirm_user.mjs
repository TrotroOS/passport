#!/usr/bin/env node
/** Confirm a user's email via service role (for accounts stuck unconfirmed). */
import { createClient } from "@supabase/supabase-js";
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
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile();

const email = process.argv[2];
if (!email) {
  console.error("Usage: node scripts/confirm_user.mjs <email>");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing Supabase env vars in .env.local");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let page = 1;
let user = null;
while (page <= 10 && !user) {
  const { data } = await admin.auth.admin.listUsers({ page, perPage: 200 });
  user = data?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase()) ?? null;
  if (!data?.users?.length || data.users.length < 200) break;
  page++;
}

if (!user) {
  console.error(`No auth user found for ${email}`);
  process.exit(1);
}

if (user.email_confirmed_at) {
  console.log(`${email} is already confirmed. You can log in at /login`);
  process.exit(0);
}

const { error } = await admin.auth.admin.updateUserById(user.id, { email_confirm: true });
if (error) {
  console.error("Failed to confirm:", error.message);
  process.exit(1);
}

console.log(`Email confirmed for ${email}. Log in at http://localhost:3000/login`);
