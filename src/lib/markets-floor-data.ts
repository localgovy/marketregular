import { unstable_cache } from "next/cache";
import { FIND_PAGES } from "@/data/find-pages";
import { DIRECTORY_DATA_REVALIDATE_SECONDS, DIRECTORY_TAG } from "@/lib/directory-cache";
import { FLOOR_TAXONOMY_PAGE, FLOOR_TAXONOMY_PAGE_CAP, fitFloorTaxonomy } from "@/lib/markets-floor-budget";
import { floorSchedules } from "@/lib/markets-floor-clock";
import { FIND_AREAS } from "@/lib/find-paths";
import { listingMarkSrc } from "@/lib/format";
import { productsBrowsePath } from "@/lib/product-browse-href";
import { createServiceClient } from "@/lib/supabase/admin";
import { vendorProductTags } from "@/lib/vendor-tags";
import { listMarkets, listSchedules, listStalls, listVendors } from "@/lib/data/catalog";
import { isSupabaseConfigured } from "@/lib/constants";
import type {
  FloorMarketStatic,
  FloorRosterEntry,
  FloorTaxonomy,
  FloorTaxonomySample,
  MarketsFloorBase,
} from "@/lib/markets-floor-types";
import type { Market, MarketSchedule } from "@/types/database";

const SAMPLE_NAME_CAP = 60;
const FACET_CAP = 6;
const CATEGORY_CAP = 8;

type MenuTaxRow = {
  id: string;
  vendor_id: string;
  name: string;
  price_cents: number | null;
  product_category: string | null;
  product_slug: string | null;
};

type AssignRow = {
  menu_id: string;
  classifier_slug: string;
};

type Bucket = {
  categories: Set<string>;
  origins: Set<string>;
  diets: Set<string>;
  production: Set<string>;
  samples: FloorTaxonomySample[];
};

const warned = new Set<string>();

function warnOnce(key: string, message: string) {
  if (warned.has(key)) return;
  warned.add(key);
  console.warn(message);
}

function sampleHref(productSlug: string | null, category: string) {
  if (productSlug) {
    const page = FIND_PAGES.find((entry) => entry.matchSlugs.includes(productSlug));
    if (page) return `/find/${page.slug}`;
  }
  const byCategory = FIND_PAGES.find((entry) => entry.category === category);
  if (byCategory) return `/find/${byCategory.slug}`;
  return productsBrowsePath(category, "featured");
}

function rememberSample(samples: FloorTaxonomySample[], row: MenuTaxRow) {
  const category = row.product_category;
  const name = row.name?.trim().slice(0, SAMPLE_NAME_CAP);
  if (!category || category === "other" || category === "pet-food" || !name) return;
  if (samples.some((sample) => sample.name === name)) return;
  const next: FloorTaxonomySample = {
    name,
    href: sampleHref(row.product_slug, category),
    priceCents: row.price_cents,
    category,
  };
  if (samples.length < 2) {
    samples.push(next);
    return;
  }
  if (next.priceCents == null) return;
  const replace = samples.findIndex((sample) => sample.priceCents == null);
  if (replace >= 0) samples[replace] = next;
}

function pack(bucket: Bucket): FloorTaxonomy {
  return {
    categories: [...bucket.categories].slice(0, CATEGORY_CAP),
    origins: [...bucket.origins].slice(0, FACET_CAP),
    diets: [...bucket.diets].slice(0, FACET_CAP),
    production: [...bucket.production].slice(0, FACET_CAP),
    samples: bucket.samples,
  };
}

async function readPages<T extends { id?: string; menu_id?: string }>(
  label: string,
  maxPages: number,
  run: (from: number) => Promise<{ data: T[] | null; error: { message?: string } | null }>,
) {
  const rows: T[] = [];
  const batch = 4;
  let previousHead = "";
  for (let start = 0; start < maxPages; start += batch) {
    const count = Math.min(batch, maxPages - start);
    const chunks = await Promise.all(
      Array.from({ length: count }, async (_, offset) => {
        const page = start + offset;
        const { data, error } = await run(page * FLOOR_TAXONOMY_PAGE);
        if (error) throw new Error(error.message || "markets floor taxonomy read failed");
        return data ?? [];
      }),
    );
    let finished = false;
    for (const chunk of chunks) {
      const head = chunk[0]?.id ?? chunk[0]?.menu_id ?? "";
      if (head && head === previousHead) {
        finished = true;
        break;
      }
      if (head) previousHead = head;
      rows.push(...chunk);
      if (chunk.length < FLOOR_TAXONOMY_PAGE) {
        finished = true;
        break;
      }
    }
    if (finished) break;
    if (start + count >= maxPages) {
      warnOnce(label, `markets floor ${label} hit its row cap`);
    }
  }
  return rows;
}

async function scanFloorTaxonomy(): Promise<Record<string, FloorTaxonomy>> {
  const supabase = createServiceClient();
  if (!supabase) return {};
  const [menus, assignments, vendors] = await Promise.all([
    readPages<MenuTaxRow>("menus", FLOOR_TAXONOMY_PAGE_CAP, async (from) => {
      const { data, error } = await supabase
        .from("published_menus")
        .select("id, vendor_id, name, price_cents, product_category, product_slug")
        .order("id")
        .range(from, from + FLOOR_TAXONOMY_PAGE - 1);
      return { data: (data ?? null) as MenuTaxRow[] | null, error };
    }),
    readPages<AssignRow>("facets", FLOOR_TAXONOMY_PAGE_CAP, async (from) => {
      const { data, error } = await supabase
        .from("vendor_menu_classifier_assignments")
        .select("menu_id, classifier_slug")
        .or("classifier_slug.like.origin.*,classifier_slug.like.diet.*,classifier_slug.like.production.*")
        .order("menu_id")
        .order("classifier_slug")
        .range(from, from + FLOOR_TAXONOMY_PAGE - 1);
      return { data: (data ?? null) as AssignRow[] | null, error };
    }),
    listVendors(),
  ]);

  const slugById = new Map(vendors.map((vendor) => [vendor.id, vendor.slug]));
  const buckets = new Map<string, Bucket>();
  function bucketFor(slug: string) {
    const existing = buckets.get(slug);
    if (existing) return existing;
    const created: Bucket = {
      categories: new Set(),
      origins: new Set(),
      diets: new Set(),
      production: new Set(),
      samples: [],
    };
    buckets.set(slug, created);
    return created;
  }

  const vendorByMenu = new Map<string, string>();
  for (const row of menus) {
    const slug = slugById.get(row.vendor_id);
    if (!slug) continue;
    vendorByMenu.set(row.id, slug);
    const bucket = bucketFor(slug);
    if (row.product_category && row.product_category !== "other" && row.product_category !== "pet-food") {
      bucket.categories.add(row.product_category);
    }
    rememberSample(bucket.samples, row);
  }
  for (const row of assignments) {
    const slug = vendorByMenu.get(row.menu_id);
    const classifier = row.classifier_slug;
    if (!slug || !classifier) continue;
    const bucket = bucketFor(slug);
    if (classifier.startsWith("origin.")) bucket.origins.add(classifier.slice("origin.".length));
    else if (classifier.startsWith("diet.")) bucket.diets.add(classifier.slice("diet.".length));
    else if (classifier.startsWith("production.")) {
      bucket.production.add(classifier.slice("production.".length));
    }
  }

  const taxonomy: Record<string, FloorTaxonomy> = {};
  for (const [slug, bucket] of buckets) {
    if (
      bucket.categories.size === 0 &&
      bucket.origins.size === 0 &&
      bucket.diets.size === 0 &&
      bucket.production.size === 0
    ) {
      continue;
    }
    taxonomy[slug] = pack(bucket);
  }
  return fitFloorTaxonomy(taxonomy);
}

const loadCachedFloorTaxonomy = unstable_cache(scanFloorTaxonomy, ["markets-floor-taxonomy-v2"], {
  revalidate: DIRECTORY_DATA_REVALIDATE_SECONDS,
  tags: [DIRECTORY_TAG],
});

let taxonomyInflight: Promise<Record<string, FloorTaxonomy>> | null = null;

function loadFloorTaxonomy() {
  if (!taxonomyInflight) {
    taxonomyInflight = loadCachedFloorTaxonomy().finally(() => {
      taxonomyInflight = null;
    });
  }
  return taxonomyInflight;
}

function neighbourhoodFor(market: Market) {
  for (const area of FIND_AREAS) {
    if (area.slugs.includes(market.slug)) return area.label;
  }
  return market.city || "Toronto";
}

function indoorOutdoor(tags: string[]) {
  const lower = tags.map((tag) => tag.toLowerCase());
  if (lower.includes("indoor")) return "Indoor";
  if (lower.includes("outdoor")) return "Outdoor";
  return null;
}

/**
 * The directory the markets page renders.
 * Menu rows are aggregated once an hour. Open and hours are applied in the browser.
 */
export async function loadMarketsFloorView(): Promise<MarketsFloorBase> {
  const [markets, vendors, stalls, schedules, taxonomyBySlug] = await Promise.all([
    listMarkets(),
    listVendors(),
    listStalls(),
    listSchedules(),
    isSupabaseConfigured() ? loadFloorTaxonomy() : Promise.resolve({} as Record<string, FloorTaxonomy>),
  ]);

  const scheduleMap = new Map<string, MarketSchedule[]>();
  for (const row of schedules) {
    const list = scheduleMap.get(row.market_id) ?? [];
    list.push(row);
    scheduleMap.set(row.market_id, list);
  }
  const vendorCountByMarket = new Map<string, number>();
  for (const stall of stalls) {
    vendorCountByMarket.set(stall.market_id, (vendorCountByMarket.get(stall.market_id) ?? 0) + 1);
  }

  const marketById = new Map(markets.map((market) => [market.id, market]));
  const vendorById = new Map(vendors.map((vendor) => [vendor.id, vendor]));

  const floorMarkets: FloorMarketStatic[] = markets.map((market) => ({
    id: market.id,
    slug: market.slug,
    name: market.name,
    city: market.city,
    address: market.address,
    province: market.province,
    lat: market.lat,
    lng: market.lng,
    logo_url: listingMarkSrc(market.logo_url),
    rating_avg: market.rating_avg ?? null,
    review_count: market.review_count ?? 0,
    tags: market.tags ?? [],
    vendorCount: vendorCountByMarket.get(market.id) ?? 0,
    neighbourhood: neighbourhoodFor(market),
    indoor_outdoor: indoorOutdoor(market.tags ?? []),
    schedules: floorSchedules(scheduleMap.get(market.id) ?? []),
  }));

  const roster: FloorRosterEntry[] = [];
  const seen = new Set<string>();
  for (const stall of stalls) {
    const market = marketById.get(stall.market_id);
    if (!market) continue;
    const key = `${market.slug}\0${stall.slug}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const vendor = vendorById.get(stall.id);
    roster.push({
      marketSlug: market.slug,
      vendorSlug: stall.slug,
      name: stall.name,
      logoUrl: listingMarkSrc(vendor?.logo_url),
      ratingAvg: vendor?.rating_avg ?? null,
      reviewCount: vendor?.review_count ?? 0,
      tags: vendorProductTags(stall.name, vendor?.tags),
    });
  }

  const usedTaxonomy: Record<string, FloorTaxonomy> = {};
  for (const entry of roster) {
    const tax = taxonomyBySlug[entry.vendorSlug];
    if (tax) usedTaxonomy[entry.vendorSlug] = tax;
  }

  return {
    renderedAt: Date.now(),
    markets: floorMarkets,
    roster,
    taxonomyBySlug: usedTaxonomy,
  };
}
