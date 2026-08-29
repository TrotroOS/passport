#!/usr/bin/env node
/** Generate Sign in with Apple client secret JWT (max 180 days). */
import { createSign, createPrivateKey } from "crypto";

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`Missing ${name}`);
    process.exit(1);
  }
  return value;
}

const teamId = requireEnv("APPLE_OAUTH_TEAM_ID");
const keyId = requireEnv("APPLE_OAUTH_KEY_ID");
const clientId = requireEnv("APPLE_OAUTH_CLIENT_ID");
const privateKeyPem = requireEnv("APPLE_OAUTH_PRIVATE_KEY").replace(/\\n/g, "\n");
const expiresInDays = Math.min(
  180,
  Math.max(1, Number(process.env.APPLE_OAUTH_SECRET_DAYS ?? "180"))
);

const now = Math.floor(Date.now() / 1000);
const exp = now + expiresInDays * 24 * 60 * 60;

const header = Buffer.from(
  JSON.stringify({ alg: "ES256", kid: keyId, typ: "JWT" })
).toString("base64url");
const payload = Buffer.from(
  JSON.stringify({
    iss: teamId,
    iat: now,
    exp,
    aud: "https://appleid.apple.com",
    sub: clientId,
  })
).toString("base64url");

const signingInput = `${header}.${payload}`;
const key = createPrivateKey(privateKeyPem);
const signature = createSign("SHA256")
  .update(signingInput)
  .sign({ key, dsaEncoding: "ieee-p1363" })
  .toString("base64url");

process.stdout.write(`${signingInput}.${signature}`);
