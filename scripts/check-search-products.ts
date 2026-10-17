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

type SearchRow = {
  item_name?: string;
  product_category?: string;
  product_slug?: string;
  price_cents?: number | null;
};

async function allRows(url: string, key: string, q: string) {
  const rows: SearchRow[] = [];
  for (let off = 0; off < 4000; off += 40) {
    const page = (await rpc(url, key, { q, off })) as SearchRow[];
    rows.push(...page);
    if (page.length < 40) return rows;
  }
  return rows;
}

function requiresSlug(rows: SearchRow[], slug: string, label: string) {
  if (!rows.some((row) => row.product_slug === slug)) {
    throw new Error(`${label} did not include ${slug}`);
  }
}

const sourdough = await allRows(url, key, "sourdough");
if (!sourdough.length) throw new Error("sourdough returned no rows");
requiresSlug(sourdough, "sourdough", "sourdough");

const dessert = await allRows(url, key, "dessert");
if (dessert.length <= 15) throw new Error("dessert stayed on the name hits");
requiresSlug(dessert, "cookies", "dessert");

const pastries = await allRows(url, key, "pastries");
requiresSlug(pastries, "croissants", "pastries");

const thanksgiving = await allRows(url, key, "thanksgiving");
requiresSlug(thanksgiving, "turkey", "thanksgiving");

const thanksgivingDessert = await allRows(url, key, "thanksgiving dessert");
requiresSlug(thanksgivingDessert, "pumpkin-pie", "thanksgiving dessert");
if (thanksgivingDessert.some((row) => row.product_slug === "turkey")) {
  throw new Error("thanksgiving dessert included turkey");
}

const sweetCorn = await allRows(url, key, "sweet corn");
if (sweetCorn.some((row) => row.product_slug === "cookies" || row.product_slug === "cakes")) {
  throw new Error("sweet corn became the dessert set");
}

const empty = await rpc(url, key, { q: " " });
if (!Array.isArray(empty) || empty.length !== 0) throw new Error("blank query returned rows");

const riesling = (await rpc(url, key, { q: "riesling" })) as SearchRow[];
if (!riesling.length) throw new Error("riesling returned no rows");
if (riesling.some((row) => row.product_category === "alcohol" && row.price_cents != null)) {
  throw new Error("alcohol row included a price");
}

const cakePlate = await allRows(url, key, "cake plate");
if (!cakePlate.length) throw new Error("cake plate returned no rows");
if (cakePlate.some((row) => /melamine cake plate/i.test(row.item_name ?? ""))) {
  throw new Error("cake plate returned the baby melamine plate");
}
if (cakePlate.some((row) => row.product_category === "baby-goods")) {
  throw new Error("cake plate returned baby goods");
}

for (const query of ["baby", "kids", "bibs"]) {
  const rows = await allRows(url, key, query);
  if (!rows.some((row) => row.product_category === "baby-goods")) {
    throw new Error(`${query} returned no baby goods`);
  }
}

const turkey = await allRows(url, key, "turkey");
if (turkey.some((row) => row.product_category === "pet-food" || row.product_category === "baby-goods")) {
  throw new Error("turkey returned pet food or baby goods");
}

const pumpkinPie = await allRows(url, key, "pumpkin pie");
if (!pumpkinPie.some((row) => row.product_slug === "pumpkin-pie" || /pumpkin pie/i.test(row.item_name ?? ""))) {
  throw new Error("pumpkin pie returned no pie");
}
if (pumpkinPie.some((row) => row.product_category === "alcohol" || row.product_category === "pet-food" || row.product_category === "baby-goods")) {
  throw new Error("pumpkin pie returned alcohol, pet food, or baby goods");
}

const dumplings = await allRows(url, key, "dumplings");
if (!dumplings.length) throw new Error("dumplings returned no rows");
if (dumplings.some((row) => row.product_category === "baby-goods" || row.product_category === "pet-food")) {
  throw new Error("dumplings returned baby goods or pet food");
}

const rose = await allRows(url, key, "rose");
if (rose.some((row) => row.product_category === "alcohol")) {
  throw new Error("rose returned alcohol");
}
const roseWine = await allRows(url, key, "rosé");
if (!roseWine.some((row) => row.product_category === "alcohol")) {
  throw new Error("rosé returned no alcohol");
}

const dogTreats = await allRows(url, key, "dog treats");
if (!dogTreats.some((row) => row.product_category === "pet-food")) {
  throw new Error("dog treats returned no pet food");
}

const base = process.argv[2];
if (base) {
  const response = await fetch(`${base.replace(/\/$/, "")}/api/search?q=sourdough`);
  const body: unknown = await response.json();
  if (!response.ok) throw new Error(`search route ${response.status}`);
  walk(body);
}

console.log("search contact check ok");
