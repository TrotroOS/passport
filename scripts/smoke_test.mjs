#!/usr/bin/env node
/** Smoke test key routes against a running Passport dev server. */
const baseUrl = process.env.SMOKE_TEST_URL ?? "http://localhost:3000";

const routes = [
  { path: "/api/health", expect: 200 },
  { path: "/login", expect: 200 },
  { path: "/signup", expect: 200 },
  { path: "/legal", expect: 200 },
  { path: "/dashboard", expect: [307, 302] },
  { path: "/readiness", expect: [307, 302] },
  { path: "/compliance/calendar", expect: [307, 302] },
  { path: "/settings/billing", expect: [307, 302] },
];

async function checkRoute(path, expect) {
  const expected = Array.isArray(expect) ? expect : [expect];
  const res = await fetch(`${baseUrl}${path}`, { redirect: "manual" });
  const ok = expected.includes(res.status);
  return { path, status: res.status, ok, expected };
}

async function main() {
  console.log(`Passport smoke test → ${baseUrl}\n`);
  let failed = 0;

  for (const route of routes) {
    try {
      const result = await checkRoute(route.path, route.expect);
      const mark = result.ok ? "✓" : "✗";
      console.log(`${mark} ${result.path} → ${result.status} (expected ${result.expected.join("|")})`);
      if (!result.ok) failed++;
    } catch (err) {
      console.log(`✗ ${route.path} → ERROR (${err.message})`);
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
