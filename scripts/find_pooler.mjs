import pg from "pg";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const envPath = resolve(root, ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    if (!process.env[key]) process.env[key] = t.slice(eq + 1).trim();
  }
}

const ref = "kdufhywygwbnerrlfnok";
const pwd = process.env.SUPABASE_DB_PASSWORD ?? process.argv[2];
if (!pwd) {
  console.error("Usage: node scripts/find_pooler.mjs [password]");
  process.exit(1);
}

const regions = [
  "us-east-1",
  "us-west-1",
  "eu-west-1",
  "eu-west-2",
  "eu-central-1",
  "ap-southeast-1",
  "ap-northeast-1",
  "sa-east-1",
  "ca-central-1",
  "ap-south-1",
  "ap-southeast-2",
];

for (const region of regions) {
  const url = `postgresql://postgres.${ref}:${encodeURIComponent(pwd)}@aws-0-${region}.pooler.supabase.com:5432/postgres`;
  const client = new pg.Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });
  try {
    await client.connect();
    await client.query("SELECT 1");
    console.log(`WORKING: aws-0-${region}.pooler.supabase.com`);
    console.log(url.replace(pwd, "***"));
    await client.end();
    process.exit(0);
  } catch (e) {
    console.log(`fail ${region}: ${e.message.split("\n")[0]}`);
    try {
      await client.end();
    } catch {
      /* ignore */
    }
  }
}

console.error("No pooler region worked. Check password in Supabase Dashboard → Database.");
process.exit(1);
