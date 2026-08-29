#!/usr/bin/env node
/** Smoke test key routes against a running Passport server (dev or production). */
const baseUrl = (process.env.SMOKE_TEST_URL ?? "http://localhost:3000").replace(/\/$/, "");

const routes = [
  { path: "/", expect: 200, label: "Homepage" },
  { path: "/api/health", expect: 200, label: "Health API", json: true },
  { path: "/login", expect: 200, label: "Login" },
  { path: "/signup", expect: 200, label: "Signup" },
  { path: "/legal", expect: 200, label: "Legal hub" },
  { path: "/legal/privacy-policy", expect: 200, label: "Privacy policy" },
  { path: "/legal/terms-of-service", expect: 200, label: "Terms" },
  { path: "/dashboard", expect: [307, 302], label: "Dashboard (auth redirect)" },
  { path: "/readiness", expect: [307, 302], label: "Readiness (auth redirect)" },
  { path: "/compliance/calendar", expect: [307, 302], label: "Compliance calendar (auth redirect)" },
  { path: "/settings/billing", expect: [307, 302], label: "Billing settings (auth redirect)" },
];

async function checkRoute(path, expect, options = {}) {
  const expected = Array.isArray(expect) ? expect : [expect];
  const res = await fetch(`${baseUrl}${path}`, { redirect: "manual" });
  const ok = expected.includes(res.status);
  const result = { path, status: res.status, ok, expected };

  if (options.json && res.ok) {
    try {
      const body = await res.json();
      result.healthStatus = body.status;
      result.dbUp = body.checks?.database?.status === "up";
      if (body.status === "unhealthy") {
        result.ok = false;
        result.detail = "health status unhealthy";
      }
    } catch {
      result.ok = false;
      result.detail = "invalid JSON from /api/health";
    }
  }

  return result;
}

async function main() {
  console.log(`Passport smoke test → ${baseUrl}\n`);
  let failed = 0;

  for (const route of routes) {
    try {
      const result = await checkRoute(route.path, route.expect, route);
      const mark = result.ok ? "✓" : "✗";
      const extra =
        result.healthStatus != null
          ? ` (${result.healthStatus}, db=${result.dbUp ? "up" : "down"})`
          : result.detail
            ? ` (${result.detail})`
            : "";
      console.log(
        `${mark} ${route.label ?? route.path} → ${result.status} (expected ${result.expected.join("|")})${extra}`
      );
      if (!result.ok) failed++;
    } catch (err) {
      console.log(`✗ ${route.label ?? route.path} → ERROR (${err.message})`);
      failed++;
    }
  }

  console.log("");
  if (failed > 0) {
    console.error(`Smoke test failed: ${failed} route(s)`);
    process.exit(1);
  }

  console.log("Smoke test passed");
}

main();
