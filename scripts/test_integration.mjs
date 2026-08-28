#!/usr/bin/env node
/** Integration smoke tests (requires dev server on NEXT_PUBLIC_APP_URL). */
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

const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

async function check(name, fn) {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
    return true;
  } catch (err) {
    console.error(`  ❌ ${name}: ${err instanceof Error ? err.message : err}`);
    return false;
  }
}

console.log(`Passport integration tests (${base})\n`);

let passed = 0;
let total = 0;

total++;
if (
  await check("GET /api/health", async () => {
    const res = await fetch(`${base}/api/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = await res.json();
    if (body.status !== "healthy") throw new Error(JSON.stringify(body));
  })
)
  passed++;

total++;
if (
  await check("GET /api/inbound/whatsapp (Twilio verify)", async () => {
    const res = await fetch(`${base}/api/inbound/whatsapp`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = await res.json();
    if (body.service !== "passport-inbound-whatsapp") throw new Error(JSON.stringify(body));
  })
)
  passed++;

total++;
if (
  await check("POST /api/inbound/email rejects missing secret (when verified mode)", async () => {
    if (process.env.INBOUND_ALLOW_UNVERIFIED === "true") {
      console.log("     (skipped — INBOUND_ALLOW_UNVERIFIED=true in .env.local)");
      return;
    }
    const form = new FormData();
    form.set("from", "test@example.com");
    form.set("subject", "test");
    const res = await fetch(`${base}/api/inbound/email`, { method: "POST", body: form });
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  })
)
  passed++;

total++;
if (
  await check("POST /api/inbound/email accepts with INBOUND_ALLOW_UNVERIFIED or secret", async () => {
    const secret = process.env.INBOUND_EMAIL_SECRET;
    const allowUnverified = process.env.INBOUND_ALLOW_UNVERIFIED === "true";
    if (!secret && !allowUnverified) {
      console.log("     (skipped — set INBOUND_ALLOW_UNVERIFIED=true or INBOUND_EMAIL_SECRET for full test)");
      return;
    }
    const form = new FormData();
    form.set("from", "unknown@test.com");
    form.set("subject", "REF: GH-IMP-2026-0042");
    form.set("text", "test");
    const headers = secret ? { "x-passport-inbound-secret": secret } : {};
    const res = await fetch(`${base}/api/inbound/email`, {
      method: "POST",
      body: form,
      headers,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  })
)
  passed++;

total++;
if (
  await check("GET /api/v1/shipments rejects missing API key", async () => {
    const res = await fetch(`${base}/api/v1/shipments`);
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
    const body = await res.json();
    if (!body.error?.message) throw new Error(JSON.stringify(body));
  })
)
  passed++;

total++;
if (
  await check("GET /api/v1/shipments rejects invalid API key", async () => {
    const res = await fetch(`${base}/api/v1/shipments`, {
      headers: { Authorization: "Bearer pk_live_invalid_key_for_test" },
    });
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  })
)
  passed++;

total++;
if (
  await check("POST /api/settings/api-keys/test requires auth", async () => {
    const res = await fetch(`${base}/api/settings/api-keys/test`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "pk_live_test" }),
    });
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  })
)
  passed++;

total++;
if (
  await check("GET /api/user/profile requires auth", async () => {
    const res = await fetch(`${base}/api/user/profile`);
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  })
)
  passed++;

total++;
if (
  await check("PATCH /api/v1/shipments/:id rejects missing API key", async () => {
    const res = await fetch(`${base}/api/v1/shipments/00000000-0000-4000-8000-000000000001`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "draft" }),
    });
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  })
)
  passed++;

total++;
if (
  await check("GET /api/v1/shipments/:id/containers rejects missing API key", async () => {
    const res = await fetch(
      `${base}/api/v1/shipments/00000000-0000-4000-8000-000000000001/containers`
    );
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  })
)
  passed++;

total++;
if (
  await check("POST /api/tracking/webhook rejects missing secret in production mode", async () => {
    if (process.env.NODE_ENV !== "production" || process.env.TRACKING_WEBHOOK_SECRET) {
      console.log("     (skipped — dev mode or TRACKING_WEBHOOK_SECRET is set)");
      return;
    }
    const res = await fetch(`${base}/api/tracking/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shipment_id: "00000000-0000-4000-8000-000000000001",
        container_number: "MSCU1234567",
        events: [{ event_type: "delay", event_date: new Date().toISOString() }],
      }),
    });
    if (res.status !== 503) throw new Error(`Expected 503, got ${res.status}`);
  })
)
  passed++;

total++;
if (
  await check("GET /api/analytics/summary requires auth", async () => {
    const res = await fetch(`${base}/api/analytics/summary`);
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  })
)
  passed++;

total++;
if (
  await check("GET /api/analytics/shipment-status requires auth", async () => {
    const res = await fetch(`${base}/api/analytics/shipment-status`);
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  })
)
  passed++;

total++;
if (
  await check("GET /api/analytics/network requires auth", async () => {
    const res = await fetch(`${base}/api/analytics/network`);
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  })
)
  passed++;

total++;
if (
  await check("GET /api/analytics/compliance-alerts requires auth", async () => {
    const res = await fetch(`${base}/api/analytics/compliance-alerts`);
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  })
)
  passed++;

total++;
if (
  await check("GET /api/activity requires auth", async () => {
    const res = await fetch(`${base}/api/activity`);
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  })
)
  passed++;

const testApiKey = process.env.PASSPORT_TEST_API_KEY;
total++;
if (
  await check("GET /api/v1/shipments accepts PASSPORT_TEST_API_KEY", async () => {
    if (!testApiKey) {
      console.log("     (skipped — set PASSPORT_TEST_API_KEY in .env.local for full API key test)");
      return;
    }
    const res = await fetch(`${base}/api/v1/shipments?limit=1`, {
      headers: { Authorization: `Bearer ${testApiKey}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = await res.json();
    if (!Array.isArray(body.data?.shipments)) throw new Error(JSON.stringify(body));
  })
)
  passed++;

console.log(`\n${passed}/${total} integration checks passed.`);

if (passed < total) {
  console.log("\nStart dev server if not running: npm run dev");
  process.exit(1);
}
