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
  const schedules = row.schedules.map((s) => {
    if (row.slug === "cabbagetown-farmers-market") {
      return { ...s, season_start: s.season_start ?? "05-01", season_end: s.season_end ?? "10-31" };
    }
    return s;
  });
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
    schedules,
  };
});

const bySlug = Object.fromEntries(markets.map((m) => [m.slug, m.id]));

const vendorLinks = [
  { slug: "st-lawrence-farmers-market", vendor_id: id(101), stall: "North Market 14", days: [6] },
  { slug: "st-lawrence-market", vendor_id: id(102), stall: "Lower Hall", days: [2, 3, 4, 5, 6] },
  { slug: "st-lawrence-market", vendor_id: id(104), stall: "Cheese row", days: [2, 4, 6] },
  { slug: "evergreen-brick-works-saturday-farmers-market", vendor_id: id(101), stall: "A12", days: [6] },
  { slug: "evergreen-brick-works-saturday-farmers-market", vendor_id: id(103), stall: "B4", days: [6] },
  { slug: "the-stops-farmers-market", vendor_id: id(101), stall: "Barn 2", days: [6] },
  { slug: "the-stops-farmers-market", vendor_id: id(102), stall: "Barn 1", days: [6] },
  { slug: "dufferin-grove-organic-farmers-market", vendor_id: id(101), stall: "Park 6", days: [4] },
  { slug: "dufferin-grove-organic-farmers-market", vendor_id: id(102), stall: "Clubhouse", days: [4] },
  { slug: "withrow-park-farmers-market", vendor_id: id(103), stall: "East edge", days: [6] },
  { slug: "withrow-park-farmers-market", vendor_id: id(104), stall: "Centre", days: [6] },
  { slug: "sorauren-farmers-market", vendor_id: id(101), stall: "North row", days: [1] },
  { slug: "east-york-farmers-market", vendor_id: id(102), stall: "Civic 3", days: [2] },
  { slug: "the-junction-farmers-market", vendor_id: id(105), stall: "Baird Park", days: [6] },
  { slug: "the-leslieville-farmers-market", vendor_id: id(103), stall: "Greenwood", days: [0] },
].map((link) => ({
  market_id: bySlug[link.slug],
  vendor_id: link.vendor_id,
  stall: link.stall,
  days: link.days,
}));

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

type SeedMarket = Omit<Market, "status" | "claimed_by" | "email"> & {
  email?: string;
  schedules: Omit<MarketSchedule, "id" | "market_id">[];
};

type SeedVendor = Omit<Vendor, "status" | "claimed_by"> & {
  menus: Omit<MenuItem, "id" | "vendor_id">[];
};

export const seedMarkets: SeedMarket[] = ${lit(markets, 0)};

export const seedVendors: SeedVendor[] = [
  {
    id: "${id(101)}",
    slug: "red-barn-roots",
    name: "Red Barn Roots",
    about: "Certified organic vegetables from a 40-acre plot north of Toronto. CSA boxes and Saturday stall.",
    website: "https://example.com/red-barn-roots",
    phone: "905-555-0142",
    tags: ["produce", "organic"],
    menus: [
      { name: "Mixed greens", description: "Baby kale, mustard, and lettuce", price_cents: 600, season: "May–October", dietary: ["vegan", "organic"] },
      { name: "Storage carrots", description: "Orange and purple", price_cents: 400, season: "September–March", dietary: ["vegan", "organic"] },
      { name: "Tomato flats", description: "Heirloom when the weather holds", price_cents: 1800, season: "August–September", dietary: ["vegan"] },
    ],
  },
  {
    id: "${id(102)}",
    slug: "maple-hearth-bakery",
    name: "Maple Hearth Bakery",
    about: "Naturally leavened breads and butter pastries. Ontario wheat, baked overnight.",
    website: null,
    phone: "416-555-0198",
    tags: ["bakery"],
    menus: [
      { name: "Country loaf", description: "75% hydration, dark crust", price_cents: 800, season: null, dietary: ["vegetarian"] },
      { name: "Butter croissant", description: null, price_cents: 450, season: null, dietary: ["vegetarian"] },
      { name: "Rye walnut", description: "Saturday only", price_cents: 900, season: null, dietary: ["vegetarian"] },
    ],
  },
  {
    id: "${id(103)}",
    slug: "loon-lake-honey",
    name: "Loon Lake Honey",
    about: "Small-lot honey from hives on the Canadian Shield. Wildflower, basswood, and a spring dandelion run.",
    website: null,
    phone: null,
    tags: ["honey"],
    menus: [
      { name: "Wildflower 500g", description: null, price_cents: 1200, season: null, dietary: [] },
      { name: "Comb honey", description: "Limited", price_cents: 1600, season: "July–August", dietary: [] },
    ],
  },
  {
    id: "${id(104)}",
    slug: "twin-river-dairy",
    name: "Twin River Dairy",
    about: "Raw-milk style cheeses made from a closed herd in Oxford County. Clothbound cheddar and a weekly fresh chèvre.",
    website: "https://example.com/twin-river",
    phone: "519-555-0110",
    tags: ["cheese"],
    menus: [
      { name: "Clothbound cheddar", description: "12-month", price_cents: 2800, season: null, dietary: ["vegetarian"] },
      { name: "Fresh chèvre", description: "Saturday", price_cents: 1100, season: "April–November", dietary: ["vegetarian"] },
    ],
  },
  {
    id: "${id(105)}",
    slug: "shoreline-smokehouse",
    name: "Shoreline Smokehouse",
    about: "Hot-smoked Great Lakes trout and a peppery summer sausage. Cooler packed, card accepted.",
    website: null,
    phone: "647-555-0166",
    tags: ["seafood", "meat"],
    menus: [
      { name: "Smoked trout fillet", description: null, price_cents: 1800, season: null, dietary: [] },
      { name: "Lake fish pâté", description: null, price_cents: 900, season: null, dietary: [] },
    ],
  },
];

export const seedMarketVendors: MarketVendor[] = ${lit(vendorLinks, 0)};

function hoursAgo(h: number) {
  return new Date(Date.now() - h * 3600 * 1000).toISOString();
}

export const seedPosts: Post[] = [
  {
    id: "${id(201)}",
    user_id: null,
    market_id: "${bySlug["st-lawrence-market"]}",
    body: "Peaches just landed at the Niagara stall. Line is moving. Bring cash and a tote.",
    photos: [],
    verified_on_site: true,
    flagged: false,
    created_at: hoursAgo(1.2),
    author_name: "Priya M.",
    market_name: "St. Lawrence Market",
    market_slug: "st-lawrence-market",
    market_city: "Toronto",
    tags: ["peaches"],
  },
  {
    id: "${id(202)}",
    user_id: null,
    market_id: "${bySlug["evergreen-brick-works-saturday-farmers-market"]}",
    body: "Someone is handing out cheddar samples like it's a birthday. I am not above this.",
    photos: [],
    verified_on_site: true,
    flagged: false,
    created_at: hoursAgo(3.1),
    author_name: "Rae D.",
    market_name: "Evergreen Brick Works Saturday Farmers Market",
    market_slug: "evergreen-brick-works-saturday-farmers-market",
    market_city: "Toronto",
    tags: ["cheese"],
    vendor_name: "Twin River Dairy",
    vendor_slug: "twin-river-dairy",
  },
  {
    id: "${id(203)}",
    user_id: null,
    market_id: "${bySlug["the-stops-farmers-market"]}",
    body: "The tomato stall at the back of the barn is the one. They still had heirlooms at 11.",
    photos: [],
    verified_on_site: true,
    flagged: false,
    created_at: hoursAgo(2.2),
    author_name: "Helen P.",
    market_name: "The Stop’s Farmers’ Market",
    market_slug: "the-stops-farmers-market",
    market_city: "Toronto",
    tags: ["tomatoes"],
  },
  {
    id: "${id(204)}",
    user_id: null,
    market_id: "${bySlug["dufferin-grove-organic-farmers-market"]}",
    body: "Rye walnut is already gone. Country loaf is left if you can get here before six.",
    photos: [],
    verified_on_site: true,
    flagged: false,
    created_at: hoursAgo(0.8),
    author_name: "Omar S.",
    market_name: "Dufferin Grove Organic Farmers’ Market",
    market_slug: "dufferin-grove-organic-farmers-market",
    market_city: "Toronto",
    tags: ["bread"],
    vendor_name: "Maple Hearth Bakery",
    vendor_slug: "maple-hearth-bakery",
  },
];

export const seedReviews: Review[] = [
  {
    id: "${id(301)}",
    user_id: null,
    market_id: "${bySlug["st-lawrence-market"]}",
    vendor_id: null,
    rating: 5,
    body: "Saturday farmers' market is the real event. Get there before 8 if you want the good tomatoes.",
    verified_on_site: true,
    flagged: false,
    created_at: hoursAgo(40),
    author_name: "Maya K.",
  },
  {
    id: "${id(302)}",
    user_id: null,
    market_id: null,
    vendor_id: "${id(102)}",
    rating: 4,
    body: "Country loaf has a proper crust. Croissants sell out; don't be late.",
    verified_on_site: true,
    flagged: false,
    created_at: hoursAgo(72),
    author_name: "Eli B.",
  },
];

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
    phone: m.phone,
    email: m.email ?? null,
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
    phone: v.phone,
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
console.log(`Wrote ${markets.length} markets to src/data/directory.ts`);
