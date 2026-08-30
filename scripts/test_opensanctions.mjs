#!/usr/bin/env node
/** Live OpenSanctions API smoke test — verifies API key and match endpoint. */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function loadEnvFile() {
  for (const name of [".env.local", ".env"]) {
    const envPath = resolve(root, name);
    if (!existsSync(envPath)) continue;
    for (const line of readFileSync(envPath, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      if (!process.env[key]) process.env[key] = trimmed.slice(eq + 1).trim();
    }
  }
}

loadEnvFile();

const enabled = process.env.OPENSANCTIONS_ENABLED === "true";
const apiKey = process.env.OPENSANCTIONS_API_KEY?.trim();
const queryName = process.argv[2] ?? "Rosneft Oil Company";
const baseUrl =
  process.env.OPENSANCTIONS_API_URL?.trim() ?? "https://api.opensanctions.org/match/default";
const threshold = process.env.OPENSANCTIONS_MATCH_THRESHOLD?.trim() ?? "0.75";

if (!enabled) {
  console.error("Set OPENSANCTIONS_ENABLED=true in .env.local or environment");
  process.exit(1);
}

if (!apiKey) {
  console.error("Missing OPENSANCTIONS_API_KEY — get one at https://www.opensanctions.org/docs/api/");
  process.exit(1);
}

const url = new URL(baseUrl);
url.searchParams.set("algorithm", "best");
url.searchParams.set("threshold", threshold);
for (const topic of ["sanction", "sanction.linked", "debarment"]) {
  url.searchParams.append("topics", topic);
}

console.log(`OpenSanctions test query: "${queryName}"`);
console.log(`Endpoint: ${url.toString()}`);

const response = await fetch(url.toString(), {
  method: "POST",
  headers: {
    Authorization: `ApiKey ${apiKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    queries: {
      q1: { schema: "Company", properties: { name: [queryName] } },
    },
  }),
});

const bodyText = await response.text();
let body;
try {
  body = JSON.parse(bodyText);
} catch {
  body = bodyText;
}

if (!response.ok) {
  console.error(`OpenSanctions test failed: HTTP ${response.status}`);
  console.error(typeof body === "string" ? body : JSON.stringify(body, null, 2));
  process.exit(1);
}

const results = body?.responses?.q1?.results ?? [];
console.log(`✓ OpenSanctions responded (${results.length} result(s))`);

if (results.length === 0) {
  console.log("No matches above threshold — connector is working, query returned clear.");
  process.exit(0);
}

for (const result of results.slice(0, 3)) {
  console.log(
    `  - ${result.caption ?? "unknown"} | score=${result.score ?? "?"} | match=${result.match ?? "?"} | datasets=${(result.datasets ?? []).slice(0, 2).join(", ")}`
  );
}

console.log("\nOpenSanctions screening is configured correctly.");
