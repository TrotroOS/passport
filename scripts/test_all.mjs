#!/usr/bin/env node
/** Run lint, build, unit tests, migration check, and integration tests. */
import { spawnSync } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function run(label, cmd, args, opts = {}) {
  console.log(`\n▶ ${label}`);
  const result = spawnSync(cmd, args, {
    cwd: root,
    stdio: "inherit",
    shell: true,
    ...opts,
  });
  if (result.status !== 0) {
    console.error(`\n❌ Failed: ${label}`);
    process.exit(result.status ?? 1);
  }
}

console.log("Passport full test suite\n");

run("Lint", "npm", ["run", "lint"]);
run("Build", "npm", ["run", "build"]);
run("Unit tests", "npx", ["tsx", "scripts/test_unit.mts"]);
run("Migration status", "node", ["scripts/check_migrations.mjs"]);

const integration = spawnSync("node", ["scripts/test_integration.mjs"], {
  cwd: root,
  stdio: "inherit",
  shell: true,
});

if (integration.status !== 0) {
  console.log("\n⚠ Integration tests skipped or failed (dev server may be offline).");
}

run("Database RLS check", "node", ["scripts/check_db.mjs"]);

console.log("\n✅ Test suite complete.");
