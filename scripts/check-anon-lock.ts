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

loadEnv(join(import.meta.dirname, "..", ".env.local"));
const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) throw new Error("Missing publishable Supabase env");

const headers = {
  apikey: key,
  authorization: `Bearer ${key}`,
  "content-type": "application/json",
};

async function expectDenied(label: string, path: string, init?: RequestInit) {
  const response = await fetch(`${url}${path}`, {
    ...init,
    headers: { ...headers, ...init?.headers },
  });
  const text = await response.text();
  if (response.ok) {
    throw new Error(`${label} was allowed (${response.status}): ${text.slice(0, 180)}`);
  }
  console.log(`${label} denied ${response.status}`);
}

await expectDenied("vendor_menus", "/rest/v1/vendor_menus?select=id&limit=1");
await expectDenied("published_markets", "/rest/v1/published_markets?select=id&limit=1");
await expectDenied(
  "product_synonyms insert",
  "/rest/v1/product_synonyms",
  {
    method: "POST",
    body: JSON.stringify({ term: "lock-test", canonical: "lock-test" }),
    headers: { prefer: "return=minimal" },
  },
);
await expectDenied(
  "get_listing_contact",
  "/rest/v1/rpc/get_listing_contact",
  { method: "POST", body: JSON.stringify({ p_kind: "market", p_slug: "wychwood" }) },
);
await expectDenied(
  "search_products",
  "/rest/v1/rpc/search_products",
  { method: "POST", body: JSON.stringify({ q: "sourdough" }) },
);

console.log("anon lock ok");
