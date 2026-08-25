import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const raw = JSON.parse(
  readFileSync(join(root, "seed batches/toronto_markets_seed.json"), "utf8"),
) as Array<{
  name: string;
  slug: string;
  about: string | null;
  address: string;
  city: string;
  province: string;
  postal_code: string | null;
  lat: number;
  lng: number;
  geofence_radius_m: number;
  website: string | null;
  phone: string | null;
  email: string | null;
  tags: string[];
  featured: boolean;
  schedules: Array<{
    weekday: number;
    opens_at: string;
    closes_at: string;
    season_start: string | null;
    season_end: string | null;
    notes: string | null;
  }>;
}>;

function id(n: number) {
  return `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
}

function lit(value: unknown, indent = 0): string {
  const pad = " ".repeat(indent);
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    if (value.every((item) => typeof item === "string")) {
      return `[\n${value.map((item) => `${pad}  ${JSON.stringify(item)}`).join(",\n")},\n${pad}]`;
    }
    return `[\n${value.map((item) => `${pad}  ${lit(item, indent + 2)}`).join(",\n")},\n${pad}]`;
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    return `{\n${entries.map(([k, v]) => `${pad}  ${k}: ${lit(v, indent + 2)}`).join(",\n")},\n${pad}}`;
  }
  return JSON.stringify(value);
}

const markets = raw.map((row, index) => {
  return {
    id: id(index + 1),
    slug: row.slug,
    name: row.name,
    about: row.about,
    address: row.address,
    city: row.city,
    province: row.province,
    postal_code: row.postal_code,
    lat: row.lat,
    lng: row.lng,
    geofence_radius_m: row.geofence_radius_m,
    website: row.website,
    phone: row.phone,
    ...(row.email ? { email: row.email } : {}),
    tags: row.tags,
    featured: row.featured,
    schedules: row.schedules,
  };
});

const bySlug = Object.fromEntries(markets.map((m) => [m.slug, m.id]));

type VendorRoster = {
  slug: string;
  vendors: string[];
};

const roster = JSON.parse(
  readFileSync(join(root, "seed batches/toronto_markets_vendor_names.json"), "utf8"),
) as VendorRoster[];

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

function vendorKey(name: string) {
  const key = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&|\+/g, " and ")
    .replace(/['’.]/g, "")
    .replace(/\b(incorporated|inc|ltd|limited|corp|corporation|company|co)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\bthe\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const aliases: Record<string, string> = {
    "monforte cheese": "monforte dairy",
    "earth city": "earth and city",
    tikayla: "ti kay la",
    "ti kay la foods": "ti kay la",
    chocosol: "chocosol traders",
    "chocosol chocolate and coffee": "chocosol traders",
    "cutting veg toronto": "cutting veg",
    "fifthtown artisan cheese": "fifth town artisan cheese",
    "oso leo wildcrafters": "osoleo wildcrafters",
    "goodlot farm": "goodlot farmstead brewing",
    "goodlot farm and farmstead brewing": "goodlot farmstead brewing",
    "goodlot farm and goodlot farmstead brewing": "goodlot farmstead brewing",
    "leading post wine": "leaning post wines",
    "magic oven catering": "magic oven",
    "magic oven prepared foods": "magic oven",
    "campacna farm": "campagna farm",
    gouter: "gouter patisserie",
    "albionhills farm": "albion hills farm",
    "kooner farm organics": "kooner farms",
    "nith valley": "nith valley organics",
    "clover roads farm": "clover roads organic farm",
    "fisher folk": "fisherfolk",
    crepedelacrepeto: "crepe de la crepe",
    crepedelacrepe: "crepe de la crepe",
    "first sip matcha": "first sips matcha bar",
    "lexs pantry": "from lexs pantry",
    "oakridges finest fruits and vegetables": "oakridges finest",
    "oakridge s finest": "oakridges finest",
    "real empanada": "real empanada",
    "tc tibetan momo": "tc tibetan momos",
    "alma bakery and food": "alma bakery",
    "alma bakery and foods": "alma bakery",
    "alma bakery and prepared foods": "alma bakery",
    "alma s bakery and food": "alma bakery",
    "danforth knife": "danforth knife sharpening",
    maizal: "maizal tortilleria",
    "many roads purveyors of eggs meat cheese": "many roads purveyors",
    "son in law": "son in law produce",
    "mamas ginger juice": "mama s ginger juice",
    "pilliteri estate winery": "pillitteri estate winery",
    "reids distillery": "reid s distillery",
    "willibald distillery": "willibald farm distillery and brewery",
    "blb and": "blb and co",
    "for good and twenty": "for good and twenty",
    "agrarian kitchen strong food": "agrarian kitchen",
    "agrarian kitchen strong earth": "agrarian kitchen",
    "the agrarian kitchen and strong earth": "agrarian kitchen",
    "st johns bakery": "st johns bakery",
    "tapioca toronto": "toronto tapioca",
    "tapioca gourmet": "toronto tapioca",
  };
  return aliases[key] ?? key;
}

function skipVendor(name: string) {
  return /booth/i.test(name) || /produce boxes in collaboration/i.test(name);
}

function displayName(name: string) {
  return name
    .replace(/\s*,?\s*\b(incorporated|inc\.?|ltd\.?|limited|corp\.?|corporation|co\.?\s*ltd\.?)\b\.?\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function compactLetters(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

function pickDisplayName(current: string, incoming: string) {
  if (compactLetters(current) === compactLetters(incoming)) {
    const marks = (s: string) => (s.match(/[^A-Za-z0-9]/g)?.length ?? 0);
    return marks(incoming) > marks(current) ? incoming : current;
  }
  const [shorter, longer] = current.length <= incoming.length ? [current, incoming] : [incoming, current];
  if (new RegExp(`^${shorter.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s+(catering|prepared foods?)$`, "i").test(longer)) {
    return shorter;
  }
  return longer;
}

type VendorRecord = {
  id: string;
  slug: string;
  name: string;
  about: null;
  website: null;
  instagram: null;
  tiktok: null;
  phone: null;
  tags: string[];
  menus: [];
};

const vendorsByKey = new Map<string, { name: string; count: number }>();
const usedSlugs = new Set<string>();
const vendors: VendorRecord[] = [];
const vendorIdByKey = new Map<string, string>();
const vendorLinks: Array<{
  market_id: string;
  vendor_id: string;
  stall: null;
  days: number[];
}> = [];

let listed = 0;
let linkedMarkets = 0;

for (const row of roster) {
  const market = markets.find((m) => m.slug === row.slug);
  if (!market) throw new Error(`Vendor roster slug missing from markets: ${row.slug}`);
  const names = row.vendors.map((n) => n.trim()).filter(Boolean);
  if (!names.length) continue;
  const before = vendorLinks.length;
  const days = [...new Set(market.schedules.map((s) => s.weekday))].sort((a, b) => a - b);
  for (const name of names) {
    if (skipVendor(name)) continue;
    listed += 1;
    const shown = displayName(name);
    const key = vendorKey(shown || name);
    let rec = vendorsByKey.get(key);
    if (!rec) {
      rec = { name: shown || name, count: 0 };
      vendorsByKey.set(key, rec);
    }
    rec.count += 1;
    rec.name = pickDisplayName(rec.name, shown || name);
    let vendorId = vendorIdByKey.get(key);
    if (!vendorId) {
      vendorId = id(101 + vendors.length);
      let slug = slugify(rec.name) || "vendor";
      let unique = slug;
      let n = 2;
      while (usedSlugs.has(unique)) {
        unique = `${slug}-${n}`;
        n += 1;
      }
      usedSlugs.add(unique);
      vendors.push({
        id: vendorId,
        slug: unique,
        name: rec.name,
        about: null,
        website: null,
        instagram: null,
        tiktok: null,
        phone: null,
        tags: [],
        menus: [],
      });
      vendorIdByKey.set(key, vendorId);
    }
    if (!vendorLinks.some((link) => link.market_id === market.id && link.vendor_id === vendorId)) {
      vendorLinks.push({
        market_id: market.id,
        vendor_id: vendorId,
        stall: null,
        days,
      });
    }
  }
  if (vendorLinks.length > before) linkedMarkets += 1;
}

for (const vendor of vendors) {
  const key = [...vendorIdByKey.entries()].find(([, vid]) => vid === vendor.id)?.[0];
  if (!key) continue;
  const rec = vendorsByKey.get(key);
  if (rec) vendor.name = rec.name;
}

if (vendorLinks.some((link) => !link.market_id)) {
  throw new Error("Vendor link pointed at a missing market slug");
}

const directory = `import type {
  Market,
  MarketSchedule,
  MarketVendor,
  MenuItem,
  Post,
  Review,
  Vendor,
} from "@/types/database";

type SeedMarket = Omit<Market, "status" | "claimed_by" | "email" | "logo_url"> & {
  email?: string;
  logo_url?: string | null;
  schedules: Omit<MarketSchedule, "id" | "market_id">[];
};

type SeedVendor = Omit<Vendor, "status" | "claimed_by" | "logo_url"> & {
  logo_url?: string | null;
  menus: Omit<MenuItem, "id" | "vendor_id">[];
};

export const seedMarkets: SeedMarket[] = ${lit(markets, 0)};

export const seedVendors: SeedVendor[] = ${lit(vendors, 0)};

export const seedMarketVendors: MarketVendor[] = ${lit(vendorLinks, 0)};

export const seedPosts: Post[] = [];

export const seedReviews: Review[] = [];

export function toPublicMarket(m: SeedMarket): Market {
  return {
    id: m.id,
    slug: m.slug,
    name: m.name,
    about: m.about,
    address: m.address,
    city: m.city,
    province: m.province,
    postal_code: m.postal_code,
    lat: m.lat,
    lng: m.lng,
    geofence_radius_m: m.geofence_radius_m,
    website: m.website,
    instagram: m.instagram ?? null,
    tiktok: m.tiktok ?? null,
    phone: m.phone,
    email: m.email ?? null,
    logo_url: m.logo_url ?? null,
    tags: m.tags,
    status: "published",
    featured: m.featured,
    claimed_by: null,
  };
}

export function schedulesFor(marketId: string): MarketSchedule[] {
  const m = seedMarkets.find((x) => x.id === marketId);
  if (!m) return [];
  return m.schedules.map((s, i) => ({
    id: \`\${marketId}-sch-\${i}\`,
    market_id: marketId,
    ...s,
  }));
}

export function toPublicVendor(v: SeedVendor): Vendor {
  return {
    id: v.id,
    slug: v.slug,
    name: v.name,
    about: v.about,
    website: v.website,
    instagram: v.instagram ?? null,
    tiktok: v.tiktok ?? null,
    phone: v.phone,
    logo_url: v.logo_url ?? null,
    tags: v.tags,
    status: "published",
    claimed_by: null,
  };
}

export function menusFor(vendorId: string): MenuItem[] {
  const v = seedVendors.find((x) => x.id === vendorId);
  if (!v) return [];
  return v.menus.map((item, i) => ({
    id: \`\${vendorId}-menu-\${i}\`,
    vendor_id: vendorId,
    ...item,
  }));
}
`;

writeFileSync(join(root, "src/data/directory.ts"), directory);
console.log(
  `Wrote ${markets.length} markets, ${vendors.length} vendors, ${vendorLinks.length} stall links (${listed} names from ${linkedMarkets} markets)`,
);
