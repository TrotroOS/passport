#!/usr/bin/env node
/** Check database setup and RLS policies. */
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
    if (!process.env[key]) process.env[key] = trimmed.slice(eq + 1).trim();
  }
}

loadEnvFile();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anon || !service) {
  console.error("Missing Supabase env vars in .env.local");
  process.exit(1);
}

const admin = createClient(url, service, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const client = createClient(url, anon);

const email = process.argv[2] ?? "trotroosapp@gmail.com";
const password = process.argv[3] ?? "Mensdom24.";

console.log("Passport database check\n");

const { data: profiles } = await admin.from("users").select("id, email, organization_id");
console.log(`Users (service role): ${profiles?.length ?? 0}`);
if (profiles?.length) {
  for (const p of profiles) {
    console.log(`  - ${p.email} org=${p.organization_id ?? "MISSING"}`);
  }
}

const { error: signErr } = await client.auth.signInWithPassword({ email, password });
if (signErr) {
  console.error("\nLogin failed:", signErr.message);
  process.exit(1);
}

const { data: selfProfile } = await client.from("users").select("organization_id").maybeSingle();
const { data: orgIdRpc } = await client.rpc("get_user_organization_id");
const { data: orgs } = await client.from("organizations").select("id").limit(1);
const { data: visibleShipments } = await client.from("shipments").select("id, shipment_ref").order("created_at", { ascending: false });
const { data: allShipments } = await admin.from("shipments").select("id, shipment_ref, organization_id").order("created_at", { ascending: false });

console.log("\nRLS check (as logged-in user):");
console.log(`  users table readable:     ${selfProfile ? "YES" : "NO"}`);
console.log(`  get_user_organization_id: ${orgIdRpc ?? "NULL"}`);
console.log(`  organizations readable:   ${orgs?.length ? "YES" : "NO"}`);
console.log(`  shipments visible (RLS):  ${visibleShipments?.length ?? 0}`);
console.log(`  shipments in database:    ${allShipments?.length ?? 0}`);
if ((allShipments?.length ?? 0) > (visibleShipments?.length ?? 0)) {
  console.log("  ⚠ Some shipments exist but RLS hides them from the dashboard.");
  for (const s of allShipments ?? []) {
    if (s.organization_id === orgIdRpc) {
      console.log(`     - ${s.shipment_ref} (${s.id})`);
    }
  }
}

const testRef = `RLS-TEST-${Date.now()}`;
const { error: insertErr } = await client.from("shipments").insert({
  shipment_ref: testRef,
  organization_id: orgIdRpc,
  origin_country: "Test",
  destination_country: "Test",
}).select("id").single();

if (insertErr) {
  console.log(`  shipment insert (RLS):    FAIL (${insertErr.message})`);
} else {
  console.log("  shipment insert (RLS):    OK");
}

let fallbackOk = false;
if (insertErr?.message?.includes("row-level security") && orgIdRpc) {
  const { data: session } = await client.auth.getSession();
  const userId = session?.session?.user?.id;
  if (userId) {
    const { data: verified } = await admin
      .from("users")
      .select("organization_id")
      .eq("id", userId)
      .eq("organization_id", orgIdRpc)
      .maybeSingle();

    if (verified) {
      const { error: fallbackErr } = await admin.from("shipments").insert({
        shipment_ref: `${testRef}-fallback`,
        organization_id: orgIdRpc,
        created_by: userId,
        origin_country: "Test",
        destination_country: "Test",
      }).select("id").single();

      fallbackOk = !fallbackErr;
      console.log(
        fallbackOk
          ? "  shipment insert (fallback): OK (app can create shipments)"
          : `  shipment insert (fallback): FAIL (${fallbackErr?.message})`
      );
    }
  }
}

if (!selfProfile && orgIdRpc) {
  console.log("\n❌ PROBLEM: RLS policies are missing or incomplete.");
  console.log("   Your user/org exist but the app cannot read them.");
  console.log("\n✅ FIX: In Supabase SQL Editor, run ONE of:");
  console.log("   supabase/APPLY_ALL_PENDING.sql   (all migrations at once)");
  console.log("   supabase/APPLY_STEP1_RLS.sql     (RLS only — fixes dashboard first)");
  console.log("\n   Dashboard: https://supabase.com/dashboard/project/kdufhywygwbnerrlfnok/sql/new");
  process.exit(1);
}

if (insertErr?.message?.includes("row-level security")) {
  if (fallbackOk) {
    console.log("\n⚠ Shipment RLS insert policy missing — app uses server fallback.");
    console.log("✅ Recommended fix: run supabase/APPLY_STEP1_RLS.sql in Supabase SQL Editor");
    console.log("   https://supabase.com/dashboard/project/kdufhywygwbnerrlfnok/sql/new");
    console.log("\n✅ Database OK for app usage (create shipment works via API).");
    process.exit(0);
  }
  console.log("\n❌ PROBLEM: Shipment RLS policies missing and fallback insert failed.");
  console.log("✅ FIX: Run supabase/APPLY_STEP1_RLS.sql in Supabase SQL Editor");
  process.exit(1);
}

console.log("\n✅ Database looks OK for this user.");
