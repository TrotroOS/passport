#!/usr/bin/env node
/** Verify a deployed Passport instance is ready for public launch (read-only checks). */
const baseUrl = (process.env.SMOKE_TEST_URL ?? process.env.VERIFY_PRODUCTION_URL ?? "https://passport-one-kappa.vercel.app").replace(/\/$/, "");

const failures = [];
const warnings = [];

function fail(message) {
  failures.push(message);
  console.log(`✗ ${message}`);
}

function warn(message) {
  warnings.push(message);
  console.log(`⚠ ${message}`);
}

function ok(message) {
  console.log(`✓ ${message}`);
}

console.log(`Passport production verification → ${baseUrl}\n`);

try {
  const healthRes = await fetch(`${baseUrl}/api/health`);
  if (!healthRes.ok) {
    fail(`/api/health returned ${healthRes.status}`);
  } else {
    const health = await healthRes.json();
    ok(`Health status: ${health.status}`);

    if (health.checks?.database?.status !== "up") {
      fail("Database check is not up");
    } else {
      ok(`Database up (${health.checks.database.latencyMs ?? "?"}ms)`);
    }

    if (health.checks?.redis?.status === "not_configured") {
      fail("Redis not configured — rate limiting will fail in production");
    } else if (health.checks?.redis?.status !== "up") {
      fail(`Redis status: ${health.checks?.redis?.status}`);
    } else {
      ok("Redis up");
    }

    if (health.checks?.ai_provider?.status !== "configured") {
      if (process.env.ALLOW_MISSING_OPENAI === "true") {
        warn("OpenAI not configured — document extraction disabled (ALLOW_MISSING_OPENAI=true)");
      } else {
        fail("OpenAI not configured — document extraction disabled");
      }
    } else {
      ok("AI provider configured");
    }

    if (health.checks?.email_delivery?.status !== "configured") {
      warn("SendGrid not configured — invite emails will use copy-link fallback");
    } else {
      ok("Email delivery configured");
    }

    if (health.checks?.tracking?.status === "live") {
      ok(`Live tracking configured (${health.checks.tracking.provider})`);
    } else if (health.checks?.tracking?.status === "mock") {
      warn("Tracking provider is mock — container events are demo data only");
    } else if (health.checks?.tracking?.status === "missing_api_key") {
      warn("TRACKING_PROVIDER is set but TRACKING_API_KEY is missing");
    }

    if (!health.app_url) {
      warn("NEXT_PUBLIC_APP_URL not set on server");
    } else if (!health.app_url.startsWith("https://")) {
      warn(`App URL is not HTTPS: ${health.app_url}`);
    } else {
      ok(`App URL: ${health.app_url}`);
    }
  }
} catch (err) {
  fail(`Health check failed: ${err instanceof Error ? err.message : String(err)}`);
}

console.log("");

const routes = [
  { path: "/", label: "Homepage" },
  { path: "/signup", label: "Signup" },
  { path: "/legal/privacy-policy", label: "Privacy policy" },
];

for (const route of routes) {
  try {
    const res = await fetch(`${baseUrl}${route.path}`, { redirect: "manual" });
    if (res.status === 200) {
      ok(`${route.label} → 200`);
    } else {
      fail(`${route.label} → ${res.status} (expected 200)`);
    }
  } catch (err) {
    fail(`${route.label} → ERROR (${err instanceof Error ? err.message : String(err)})`);
  }
}

console.log("");
if (warnings.length) {
  console.log(`Warnings: ${warnings.length}`);
  for (const w of warnings) console.log(`  - ${w}`);
}

if (failures.length) {
  console.error(`\n❌ Production verification failed (${failures.length} issue(s)).`);
  console.error("\nFix in Vercel → Settings → Environment Variables → Production, then redeploy.");
  console.error("See README.md → Public launch checklist → Vercel production variables.");
  process.exit(1);
}

console.log("\n✅ Production verification passed.");
if (warnings.length) {
  console.log("Review warnings above before open public signup.");
}
