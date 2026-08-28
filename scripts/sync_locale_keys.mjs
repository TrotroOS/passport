#!/usr/bin/env node
/** Fill missing translation keys in fr/pt/ar from en (keeps existing translations). */
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function deepFillMissing(target, source) {
  if (source === null || typeof source !== "object" || Array.isArray(source)) {
    return target ?? source;
  }
  const out = { ...(target ?? {}) };
  for (const [key, value] of Object.entries(source)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      out[key] = deepFillMissing(out[key], value);
    } else if (!(key in out)) {
      out[key] = value;
    }
  }
  return out;
}

const en = JSON.parse(readFileSync(resolve(root, "messages/en.json"), "utf8"));

for (const locale of ["fr", "pt", "ar"]) {
  const path = resolve(root, `messages/${locale}.json`);
  const current = JSON.parse(readFileSync(path, "utf8"));
  const merged = deepFillMissing(current, en);
  writeFileSync(path, JSON.stringify(merged, null, 2) + "\n", "utf8");
  console.log(`Updated ${path}`);
}
