import { readFileSync } from "node:fs";
import { join } from "node:path";

function loadEnv(path: string) {
  const text = readFileSync(path, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq);
    let value = trimmed.slice(eq + 1);
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

const BANNED = new Set([
  "email",
  "phone",
  "claim_note",
  "claim_source",
  "claimed_by",
  "product_category_source",
]);

function walk(value: unknown, path = "$") {
  if (Array.isArray(value)) {
    value.forEach((item, index) => walk(item, `${path}[${index}]`));
    return;
  }
  if (!value || typeof value !== "object") {
    if (typeof value === "string" && BANNED.has(value.toLowerCase())) {
      throw new Error(`banned string at ${path}`);
    }
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (BANNED.has(key.toLowerCase())) throw new Error(`banned key ${key} at ${path}`);
    walk(child, `${path}.${key}`);
  }
}

async function rpc(url: string, key: string, body: Record<string, unknown>) {
  const response = await fetch(`${url}/rest/v1/rpc/search_products`, {
    method: "POST",
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`rpc ${response.status}`);
  const data: unknown = JSON.parse(text);
  walk(data);
  return data;
}

loadEnv(join(import.meta.dirname, "..", ".env.local"));
const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Missing service role Supabase env");

const sourdough = (await rpc(url, key, { q: "sourdough" })) as Array<{ product_slug?: string }>;
if (!sourdough.length) throw new Error("sourdough returned no rows");
if (!sourdough.some((row) => row.product_slug === "sourdough")) {
  throw new Error("sourdough did not match the sourdough slug");
}

const empty = await rpc(url, key, { q: " " });
if (!Array.isArray(empty) || empty.length !== 0) throw new Error("blank query returned rows");

const riesling = (await rpc(url, key, { q: "riesling" })) as Array<{
  product_category?: string;
  price_cents?: number | null;
}>;
if (!riesling.length) throw new Error("riesling returned no rows");
if (riesling.some((row) => row.product_category === "alcohol" && row.price_cents != null)) {
  throw new Error("alcohol row included a price");
}

const base = process.argv[2];
if (base) {
  const response = await fetch(`${base.replace(/\/$/, "")}/api/search?q=sourdough`);
  const body: unknown = await response.json();
  if (!response.ok) throw new Error(`search route ${response.status}`);
  walk(body);
}

console.log("search contact check ok");
