#!/usr/bin/env node
/** Send a test email via SendGrid to verify production email setup. */
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

function resolveEmailAppUrl() {
  const emailOverride = process.env.EMAIL_PUBLIC_APP_URL?.trim();
  if (emailOverride && !/localhost|127\.0\.0\.1/i.test(emailOverride)) {
    return emailOverride.replace(/\/$/, "");
  }
  const configured = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  if (!/localhost|127\.0\.0\.1/i.test(configured)) {
    return configured.replace(/\/$/, "");
  }
  return configured.replace(/\/$/, "");
}

const apiKey = process.env.SENDGRID_API_KEY;
const to = process.argv[2] ?? process.env.SENDGRID_TEST_TO;

if (!apiKey) {
  console.error("Missing SENDGRID_API_KEY in .env.local or environment");
  process.exit(1);
}

if (!to) {
  console.error("Usage: npm run test:sendgrid -- you@example.com");
  console.error("Or set SENDGRID_TEST_TO in .env.local");
  process.exit(1);
}

function resolveFrom() {
  const dedicated = process.env.SENDGRID_FROM_EMAIL?.trim();
  const name = process.env.SENDGRID_FROM_NAME?.trim() || "Seadell";
  const inbound = process.env.INBOUND_EMAIL_FROM?.trim() ?? "";
  const emailMatch = (dedicated || inbound).match(
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
  );
  if (!emailMatch) {
    console.error("Set SENDGRID_FROM_EMAIL or INBOUND_EMAIL_FROM to a verified sender");
    process.exit(1);
  }
  return { name, email: emailMatch[0] };
}

const fromPayload = resolveFrom();

const appUrl = resolveEmailAppUrl();

const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    personalizations: [{ to: [{ email: to }] }],
    from: fromPayload,
    subject: "Seadell SendGrid test",
    content: [
      {
        type: "text/plain",
        value: `SendGrid is configured for Seadell.\nApp URL: ${appUrl}\nFrom: ${from}`,
      },
    ],
  }),
});

if (!response.ok) {
  const text = await response.text();
  console.error(`SendGrid test failed: ${response.status}`);
  console.error(text);
  process.exit(1);
}

console.log(`SendGrid test email sent to ${to}`);
console.log(`From address: ${fromPayload.name} <${fromPayload.email}>`);
