#!/usr/bin/env node
/** List verified SendGrid single senders for this API key. */
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

const apiKey = process.env.SENDGRID_API_KEY;
if (!apiKey) {
  console.error("Missing SENDGRID_API_KEY");
  process.exit(1);
}

const headers = { Authorization: `Bearer ${apiKey}` };

const verifiedRes = await fetch("https://api.sendgrid.com/v3/verified_senders", { headers });
if (verifiedRes.ok) {
  const data = await verifiedRes.json();
  const results = data.results ?? [];
  console.log("Verified single senders:");
  if (!results.length) {
    console.log("  (none)");
  } else {
    for (const sender of results) {
      console.log(
        `  - ${sender.from_email}${sender.verified ? " (verified)" : " (pending)"}${sender.from_name ? ` — ${sender.from_name}` : ""}`
      );
    }
  }
} else {
  console.warn(`Could not list verified_senders: ${verifiedRes.status}`);
}

const domainRes = await fetch("https://api.sendgrid.com/v3/whitelabel/domains", { headers });
if (domainRes.ok) {
  const domains = await domainRes.json();
  const list = Array.isArray(domains) ? domains : [];
  if (list.length) {
    console.log("\nAuthenticated domains:");
    for (const domain of list) {
      console.log(`  - ${domain.domain}${domain.valid ? " (valid)" : ""}`);
    }
  }
}

console.log(`\nConfigured INBOUND_EMAIL_FROM: ${process.env.INBOUND_EMAIL_FROM ?? "(not set)"}`);
