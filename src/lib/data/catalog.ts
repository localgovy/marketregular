import { unstable_cache } from "next/cache";
import { cache } from "react";
import { isSupabaseConfigured, provinceTz } from "@/lib/constants";
import { DIRECTORY_TAG } from "@/lib/directory-cache";
import { DIRECTORY_CENSUS_ID } from "@/lib/launch";
import {
  localFeatured,
  localMarketBySlug,
  localMarkets,
  localMenuCount,
  localMenuVendorIds,
  localSchedules,
  localSearch,
  localSitemapVendors,
  localStalls,
  localTablePeek,
  localVendorBySlug,
  localVendors,
} from "@/lib/data/local";
import {
  applyDirectoryTags,
  filterMarketsByAreas,
  parseDirectorySort,
  placeAreasForMarkets,
  queryNamesHall,
  scopeVendorsToMarkets,
  searchWeekdays,
  slugsForPlaceQuery,
  unionById,
} from "@/lib/find-paths";
import { directoryInitialProps } from "@/lib/directory-page";
import { sortDirectoryMarkets, sortDirectoryVendors } from "@/lib/directory-sort";
import { countryTagsFromQuery, withVendorCountryTags } from "@/lib/country-tags";
import { productTagsFromQuery, isProductNounQuery, withVendorProductTags } from "@/lib/vendor-tags";
import { preferQueryNameHits, hallsHostingNameHits } from "@/lib/search-rank";
import { isMarketOpen, isOpenOnWeekday } from "@/lib/schedule";
import { mergeReviews, reviewFromPost, reviewFromReview } from "@/lib/floor-note";
import { withListingStats } from "@/lib/listing-score";
import { vendorHasSubstance, type ListingContactFields } from "@/lib/listing-substance";
import { loadMyProfile } from "@/lib/my-profile";
import { createServiceClient } from "@/lib/supabase/admin";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { groupVendorHalls, withVendorHalls } from "@/lib/vendor-halls";
import { isSeasonAlias, seasonAliasTarget } from "@/lib/listing-siblings";
import { UNAFFILIATED_VENDOR_SLUGS } from "@/lib/unaffiliated-vendors";
import { publishesVendorRoster } from "@/lib/vendor-roster";
import type {
  FloorItem,
  Market,
  MarketDetail,
  MarketSchedule,
  MenuItem,
  Post,
  Profile,
  Review,
  SearchFilters,
  StallRef,
  Vendor,
  VendorDetail,
  VendorHall,
} from "@/types/database";

async function db() {
  if (!isSupabaseConfigured()) return null;
  return createServerSupabaseClient();
}

/** Published directory views. Service role only; the anon key cannot read these tables. */
function publicDb() {
  return createServiceClient();
}

/** Posts and reviews stay on the anon key so row policies still hide flagged notes. */
function visitorDb() {
  return createPublicSupabaseClient();
}

const PAGE = 1000;

/** Private columns stay off these views. Contact is get_listing_contact, service role only. */
const MARKET_PUBLIC =
  "id, slug, name, about, address, city, province, postal_code, lat, lng, geofence_radius_m, website, tags, status, featured, created_at, updated_at, logo_url, review_count, rating_avg, instagram, tiktok, facebook";
const VENDOR_PUBLIC =
  "id, slug, name, about, website, tags, status, created_at, updated_at, logo_url, review_count, rating_avg, instagram, tiktok, facebook";
/** `research_notes` is sourcing detail for the desk, not visitor copy — never selected here. */
const SCHEDULE_PUBLIC =
  "id, market_id, weekday, opens_at, closes_at, season_start, season_end, notes";
const POST_PUBLIC = "id, user_id, market_id, body, photos, flagged, created_at";
const REVIEW_PUBLIC = "id, user_id, market_id, vendor_id, rating, body, flagged, created_at";
const MENU_PUBLIC = "id, vendor_id, name, description, price_cents, season, dietary";
const STALL_PUBLIC = "market_id, vendor_id, stall, days";

/** Score, then the tag guesses that keep name-only roster shops inside the filters. */
function hydrateVendor(vendor: Vendor) {
  return withVendorProductTags(withVendorCountryTags(withListingStats(vendor)));
}

function directoryFailed(error: { message?: string } | null): never {
  throw new Error(error?.message || "Directory read failed");
}

async function fetchAllRows<T>(
  run: (from: number, to: number) => PromiseLike<{
    data: T[] | null;
    error: { message?: string } | null;
  }>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await run(from, from + PAGE - 1);
    if (error) directoryFailed(error);
    const chunk = data ?? [];
    rows.push(...chunk);
    if (chunk.length < PAGE) return rows;
  }
}

type PublishedDirectory = {
  markets: Market[];
  vendors: Vendor[];
  stalls: StallRef[];
  /** Published vendors with a stall row, including halls that are not public. */
  rosterVendorIds: string[];
  schedules: MarketSchedule[];
  menuVendorIds: string[];
};

type StallRow = {
  market_id: string;
  stall: string | null;
  days?: number[];
  vendors?: unknown;
  markets?: unknown;
};

function stallsFromRows(rows: StallRow[]): StallRef[] {
  return rows.flatMap((row) => {
    const vendor = publishedVendorFromStall(row);
    if (!vendor) return [];
    const market = marketFromStall(row);
    if (!market || market.status !== "published") return [];
    return [
      {
        id: vendor.id,
        name: vendor.name,
        slug: vendor.slug,
        market_id: row.market_id,
        stall: row.stall,
        days: Array.isArray(row.days) ? row.days : [],
      },
    ];
  });
}

/** Published shops keep a directory row even when their only hall is not public. */
function rosterVendorIdsFromRows(rows: StallRow[]): string[] {
  const ids = new Set<string>();
  for (const row of rows) {
    const vendor = publishedVendorFromStall(row);
    if (!vendor || !marketFromStall(row)) continue;
    ids.add(vendor.id);
  }
  return [...ids];
}

function publishedVendorFromStall(row: StallRow) {
  const raw = row.vendors;
  const vendor = Array.isArray(raw) ? raw[0] : raw;
  if (!vendor || typeof vendor !== "object") return null;
  const parsed = vendor as { id: string; name: string; slug: string; status: string };
  if (parsed.status !== "published") return null;
  return parsed;
}

function marketFromStall(row: StallRow) {
  const raw = row.markets;
  const market = Array.isArray(raw) ? raw[0] : raw;
  if (!market || typeof market !== "object") return null;
  return market as { city: string; status: string };
}

/**
 * Next's data cache rejects a single entry over 2MB. The whole directory is
 * past that, so one `unstable_cache` never stored and every page refetched it.
 * Each table is its own entry, still under the cap, and still tagged `directory`.
 */
const DIRECTORY_CACHE = { revalidate: 120, tags: [DIRECTORY_TAG] };

function requirePublicDb() {
  const supabase = publicDb();
  if (!supabase) directoryFailed(null);
  return supabase;
}

const loadCachedMarkets = unstable_cache(
  async () => {
    const supabase = requirePublicDb();
    return fetchAllRows<Market>((from, to) =>
      supabase
        .from("published_markets")
        .select(MARKET_PUBLIC)
        .eq("status", "published")
        .order("name")
        .range(from, to),
    );
  },
  ["published-directory-markets-v1"],
  DIRECTORY_CACHE,
);

const loadCachedVendors = unstable_cache(
  async () => {
    const supabase = requirePublicDb();
    return fetchAllRows<Vendor>((from, to) =>
      supabase
        .from("published_vendors")
        .select(VENDOR_PUBLIC)
        .eq("status", "published")
        .order("name")
        .range(from, to),
    );
  },
  ["published-directory-vendors-v1"],
  DIRECTORY_CACHE,
);

const loadCachedStallRows = unstable_cache(
  async () => {
    const supabase = requirePublicDb();
    const rows = await fetchAllRows<{
      market_id: string;
      stall: string | null;
      days: number[] | null;
      vendor_id: string;
      vendor_name: string;
      vendor_slug: string;
      vendor_status: string;
      market_city: string;
      market_status: string;
    }>((from, to) =>
      supabase
        .from("published_stalls")
        .select(
          "market_id, stall, days, vendor_id, vendor_name, vendor_slug, vendor_status, market_city, market_status",
        )
        .order("market_id")
        .order("vendor_id")
        .range(from, to),
    );
    return rows.map((row) => ({
      market_id: row.market_id,
      stall: row.stall,
      days: row.days ?? [],
      vendors: {
        id: row.vendor_id,
        name: row.vendor_name,
        slug: row.vendor_slug,
        status: row.vendor_status,
      },
      markets: { city: row.market_city, status: row.market_status },
    }));
  },
  ["published-directory-stalls-v1"],
  DIRECTORY_CACHE,
);

const loadCachedSchedules = unstable_cache(
  async () => {
    const supabase = requirePublicDb();
    return fetchAllRows<MarketSchedule>((from, to) =>
      supabase.from("published_schedules").select(SCHEDULE_PUBLIC).order("id").range(from, to),
    );
  },
  ["published-directory-schedules-v1"],
  DIRECTORY_CACHE,
);

const loadCachedMenuVendorIds = unstable_cache(
  async () => {
    const supabase = requirePublicDb();
    const menuIds = await supabase.rpc("menu_vendor_ids");
    if (menuIds.error) directoryFailed(menuIds.error);
    if (!Array.isArray(menuIds.data)) directoryFailed({ message: "Menu vendor ids were not a list" });
    return menuIds.data.filter((id): id is string => typeof id === "string");
  },
  ["published-directory-menu-ids-v1"],
  DIRECTORY_CACHE,
);

const getPublishedDirectory = cache(async function getPublishedDirectory() {
  if (!publicDb()) directoryFailed(null);
  const [markets, vendors, stallRows, schedules, menuVendorIds] = await Promise.all([
    loadCachedMarkets(),
    loadCachedVendors(),
    loadCachedStallRows(),
    loadCachedSchedules(),
    loadCachedMenuVendorIds(),
  ]);
  const folded = foldSeasonAliases(markets, schedules);
  return {
    markets: folded.markets,
    vendors,
    stalls: stallsFromRows(stallRows),
    rosterVendorIds: rosterVendorIdsFromRows(stallRows),
    schedules: folded.schedules,
    menuVendorIds,
  } satisfies PublishedDirectory;
});

/** One search card. The alias's Sunday hours still count on the host market. */
function foldSeasonAliases<T extends { id: string; slug: string }, S extends { market_id: string }>(
  markets: T[],
  schedules: S[],
) {
  let nextMarkets = markets;
  let nextSchedules = schedules;
  for (const market of markets) {
    const hostSlug = seasonAliasTarget(market.slug);
    if (!hostSlug) continue;
    const host = markets.find((item) => item.slug === hostSlug);
    if (!host) continue;
    nextSchedules = nextSchedules.map((row) =>
      row.market_id === market.id ? { ...row, market_id: host.id } : row,
    );
    nextMarkets = nextMarkets.filter((item) => item.slug !== market.slug);
  }
  return { markets: nextMarkets, schedules: nextSchedules };
}

export type DirectoryCensus = {
  markets: number;
  vendors: number;
  menus: number;
  talliedAt: string | null;
};

/**
 * Published directory totals for the homepage ticket. Kept in `directory_census`
 * and refreshed on listing writes — not a hardcoded city list.
 */
const loadCachedDirectoryCensus = unstable_cache(
  async (): Promise<DirectoryCensus> => {
    const supabase = requirePublicDb();
    const { data, error } = await supabase
      .from("directory_census")
      .select("markets, vendors, menus, tallied_at")
      .eq("id", DIRECTORY_CENSUS_ID)
      .maybeSingle();
    if (error || !data) directoryFailed(error);
    return {
      markets: data.markets,
      vendors: data.vendors,
      menus: data.menus ?? 0,
      talliedAt: data.tallied_at,
    };
  },
  ["directory-census-v2"],
  DIRECTORY_CACHE,
);

export async function getDirectoryCensus(): Promise<DirectoryCensus> {
  if (!publicDb()) {
    return {
      markets: localMarkets().length,
      vendors: localVendors().length,
      menus: localMenuCount(),
      talliedAt: null,
    };
  }
  return loadCachedDirectoryCensus();
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await db();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { profile, error } = await loadMyProfile(supabase);
  if (profile) {
    return {
      id: profile.id,
      display_name: profile.display_name,
      avatar_url: profile.avatar_url,
      role: profile.role,
      username: profile.username,
      favorite_market_slugs: profile.favorite_market_slugs ?? [],
      onboarded_at: profile.onboarded_at,
    };
  }
  // RPC failed: do not pretend this account still needs onboarding.
  if (error) {
    return {
      id: user.id,
      display_name: user.email?.split("@")[0] ?? "You",
      avatar_url: null,
      role: "user",
      username: null,
      favorite_market_slugs: [],
      onboarded_at: user.created_at ?? new Date().toISOString(),
    };
  }
  return {
    id: user.id,
    display_name: user.email?.split("@")[0] ?? "You",
    avatar_url: null,
    role: "user",
    username: null,
    favorite_market_slugs: [],
    onboarded_at: null,
  };
}

export const listMarkets = cache(async function listMarkets(): Promise<Market[]> {
  if (!publicDb()) return localMarkets().filter((market) => !isSeasonAlias(market.slug));
  const { markets } = await getPublishedDirectory();
  return markets.map(withListingStats);
});

export const listVendors = cache(async function listVendors(): Promise<Vendor[]> {
  if (!publicDb()) return localVendors();
  const { vendors, stalls, rosterVendorIds } = await getPublishedDirectory();
  const listed = new Set([...stalls.map((stall) => stall.id), ...rosterVendorIds]);
  return vendors
    .map(hydrateVendor)
    .filter((vendor) => listed.has(vendor.id) || UNAFFILIATED_VENDOR_SLUGS.has(vendor.slug));
});

/** Same bar the stall page uses to decide `index`, so the sitemap never advertises a noindex URL. */
export async function listSitemapVendors(): Promise<Vendor[]> {
  const supabase = publicDb();
  if (!supabase) return localSitemapVendors();
  const [vendors, menuVendorIds] = await Promise.all([listVendors(), listMenuVendorIds()]);
  return vendors.filter((vendor) =>
    vendorHasSubstance({ ...vendor, hasMenu: menuVendorIds.has(vendor.id) }),
  );
}

export const listMenuVendorIds = cache(async function listMenuVendorIds(): Promise<Set<string>> {
  if (!publicDb()) return localMenuVendorIds();
  const { menuVendorIds } = await getPublishedDirectory();
  return new Set(menuVendorIds);
});

export const listStalls = cache(async function listStalls(): Promise<StallRef[]> {
  if (!publicDb()) return localStalls();
  const { stalls } = await getPublishedDirectory();
  return stalls;
});

async function hallsByVendorIds(vendorIds: string[]): Promise<Map<string, VendorHall[]>> {
  if (!vendorIds.length) return new Map();
  const supabase = publicDb();
  if (!supabase) return groupVendorHalls(localStalls(), localMarkets());

  const { data, error } = await supabase
    .from("published_stalls")
    .select("vendor_id, market_id, market_slug, market_name, market_city, market_status")
    .in("vendor_id", vendorIds);
  if (error) directoryFailed(error);
  if (!data?.length) return new Map();

  const stalls: StallRef[] = [];
  const markets: Pick<Market, "id" | "slug" | "name">[] = [];
  const seenMarket = new Set<string>();
  for (const row of data as unknown as Array<{
    vendor_id: string;
    market_id: string;
    market_slug: string;
    market_name: string;
    market_city: string;
    market_status: string;
  }>) {
    if (row.market_status !== "published") continue;
    const market = {
      id: row.market_id,
      slug: row.market_slug,
      name: row.market_name,
      city: row.market_city,
      status: row.market_status,
    };
    stalls.push({
      id: row.vendor_id,
      name: "",
      slug: "",
      market_id: market.id,
      stall: null,
      days: [],
    });
    if (!seenMarket.has(market.id)) {
      seenMarket.add(market.id);
      markets.push({ id: market.id, slug: market.slug, name: market.name });
    }
  }
  return groupVendorHalls(stalls, markets);
}

export type TablePeek = {
  vendorName: string;
  vendorSlug: string;
  item: string;
  priceCents: number | null;
  note: string | null;
};

export async function getTablePeek(vendorIds: string[]): Promise<TablePeek[]> {
  if (!vendorIds.length) return [];
  const supabase = publicDb();
  if (!supabase) return localTablePeek(vendorIds);
  const { data, error } = await supabase
    .from("published_menus")
    .select("name, price_cents, vendor_id")
    .in("vendor_id", vendorIds)
    .limit(12);
  if (error || !data?.length) return [];
  const menuRows = data as Array<{
    name: string;
    price_cents: number | null;
    vendor_id: string;
  }>;
  const { data: vendorRows, error: vendorError } = await supabase
    .from("published_vendors")
    .select("id, name, slug")
    .in("id", [...new Set(menuRows.map((row) => row.vendor_id))]);
  if (vendorError || !vendorRows?.length) return [];
  const vendorById = new Map(
    (vendorRows as Array<{ id: string; name: string; slug: string }>).map((vendor) => [vendor.id, vendor]),
  );

  const seen = new Set<string>();
  const lines: TablePeek[] = [];
  for (const row of menuRows) {
    if (seen.has(row.vendor_id)) continue;
    const vendor = vendorById.get(row.vendor_id);
    if (!vendor) continue;
    seen.add(row.vendor_id);
    lines.push({
      vendorName: vendor.name,
      vendorSlug: vendor.slug,
      item: row.name,
      priceCents: row.price_cents,
      note: null,
    });
    if (lines.length >= 3) break;
  }
  return lines;
}

function searchNeedle(raw: string) {
  return raw
    .replace(/[,()"\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

function includesFold(value: string | null | undefined, needle: string) {
  if (!value || !needle) return false;
  return value.toLowerCase().includes(needle.toLowerCase());
}

export async function searchDirectory(filters: SearchFilters, now = new Date()) {
  if (!publicDb()) return localSearch(filters, now);

  const raw = filters.q?.trim() ?? "";
  const queryTags = raw
    ? [...new Set([...productTagsFromQuery(raw), ...countryTagsFromQuery(raw)])]
    : [];
  const nounQuery = raw ? isProductNounQuery(raw) : false;
  const needle = searchNeedle(raw);
  const tagNeedles = queryTags.slice(0, 8);

  const [allMarkets, allVendors, stalls, scheduleRows] = await Promise.all([
    listMarkets(),
    listVendors(),
    listStalls(),
    listSchedules(),
  ]);

  const schedulesByMarket = new Map<string, MarketSchedule[]>();
  for (const row of scheduleRows) {
    const list = schedulesByMarket.get(row.market_id) ?? [];
    list.push(row);
    schedulesByMarket.set(row.market_id, list);
  }

  let markets = allMarkets.filter((market) => {
    if (filters.province && market.province !== filters.province) return false;
    if (filters.city && market.city.toLowerCase() !== filters.city.toLowerCase()) return false;
    if (filters.setup && !(market.tags ?? []).includes(filters.setup)) return false;
    if (!needle) return true;
    const columns = nounQuery
      ? [market.name, market.city, market.address]
      : [market.name, market.city, market.about, market.address];
    return columns.some((value) => includesFold(value, needle));
  });
  let vendors = allVendors.filter((vendor) => {
    if (!needle && !tagNeedles.length) return true;
    const columns = nounQuery ? [vendor.name] : [vendor.name, vendor.about];
    const textHit = needle ? columns.some((value) => includesFold(value, needle)) : false;
    const tagHit = tagNeedles.some((tag) => (vendor.tags ?? []).includes(tag));
    return textHit || tagHit;
  });
  if (raw) {
    const placeSlugs = new Set(slugsForPlaceQuery(raw));
    if (placeSlugs.size) {
      const seen = new Set(markets.map((market) => market.id));
      for (const market of allMarkets) {
        if (!placeSlugs.has(market.slug) || seen.has(market.id)) continue;
        markets.push(market);
        seen.add(market.id);
      }
      markets.sort((a, b) => a.name.localeCompare(b.name));
    }
    // Product/cuisine words must not dump a hall's whole roster. Place and hall-name
    // queries still should.
    const rosterHallIds = new Set<string>();
    if (placeSlugs.size) {
      for (const market of markets) {
        if (placeSlugs.has(market.slug)) rosterHallIds.add(market.id);
      }
    }
    if (!queryTags.length) {
      for (const market of markets) {
        if (queryNamesHall(raw, market.name)) rosterHallIds.add(market.id);
      }
    }
    if (rosterHallIds.size) {
      const wantIds = stalls
        .filter((stall) => rosterHallIds.has(stall.market_id))
        .map((stall) => stall.id);
      const have = new Set(vendors.map((vendor) => vendor.id));
      const missing = wantIds.filter((id) => !have.has(id));
      if (missing.length) {
        const byId = new Map(allVendors.map((vendor) => [vendor.id, vendor]));
        const extra = missing.flatMap((id) => {
          const vendor = byId.get(id);
          return vendor && !have.has(vendor.id) ? [vendor] : [];
        });
        vendors = [...vendors, ...extra];
        vendors.sort((a, b) => a.name.localeCompare(b.name));
      }
    }
    if (queryTags.length) {
      const tagged = applyDirectoryTags(
        allMarkets,
        allVendors,
        stalls.map((stall) => ({ market_id: stall.market_id, vendor_id: stall.id })),
        queryTags,
      );
      vendors = unionById(vendors, tagged.vendors);
      if (nounQuery) {
        const halls = hallsHostingNameHits(
          stalls.map((stall) => ({ market_id: stall.market_id, vendor_id: stall.id })),
          vendors,
          raw,
        );
        markets = unionById(
          markets,
          allMarkets.filter((market) => halls.has(market.id)),
        );
      } else {
        markets = unionById(markets, tagged.markets);
      }
      markets.sort((a, b) => a.name.localeCompare(b.name));
      vendors.sort((a, b) => a.name.localeCompare(b.name));
    }
  }
  if (!raw && !tagNeedles.length) {
    const stalled = new Set(stalls.map((stall) => stall.id));
    vendors = vendors.filter((vendor) => stalled.has(vendor.id));
  }
  const days = filters.openNow ? [] : searchWeekdays(filters);
  if (days.length) {
    markets = markets.filter((m) =>
      days.some((day) =>
        isOpenOnWeekday(
          schedulesByMarket.get(m.id) ?? [],
          day,
          provinceTz(m.province),
          now,
        ),
      ),
    );
  }
  if (filters.openNow) {
    markets = markets.filter((m) =>
      isMarketOpen(schedulesByMarket.get(m.id) ?? [], m.province, now),
    );
  }
  if (filters.tags?.length) {
    const tagged = applyDirectoryTags(
      markets,
      vendors,
      stalls
        .filter((stall) => !days.length || stall.days.some((day) => days.includes(day)))
        .map((stall) => ({ market_id: stall.market_id, vendor_id: stall.id })),
      filters.tags,
    );
    markets = tagged.markets;
    vendors = tagged.vendors;
  }
  markets = filterMarketsByAreas(markets, filters.areas ?? []);
  vendors = scopeVendorsToMarkets(
    markets,
    vendors,
    stalls.map((stall) => ({ market_id: stall.market_id, vendor_id: stall.id, days: stall.days })),
    filters,
    days,
  );
  const sort = parseDirectorySort(filters.sort, Boolean(filters.near));
  const halls = groupVendorHalls(stalls, allMarkets);
  const marketsBySlug = new Map(allMarkets.map((market) => [market.slug, market]));
  // Near-sort needs every hall to order the list. Other sorts attach halls
  // only to the page that is about to render.
  const rankedVendors =
    sort === "near"
      ? sortDirectoryVendors(withVendorHalls(vendors, halls), sort, {
          near: filters.near,
          marketsBySlug,
        })
      : sortDirectoryVendors(vendors, sort, {
          near: filters.near,
          marketsBySlug,
        });

  return {
    markets: preferQueryNameHits(
      sortDirectoryMarkets(markets, sort, {
        near: filters.near,
        schedulesFor: (id) => schedulesByMarket.get(id) ?? [],
      }),
      raw,
    ),
    vendors: preferQueryNameHits(rankedVendors, raw),
    schedulesByMarket: Object.fromEntries(schedulesByMarket),
    halls,
  };
}

export type BareMarketsDirectory = {
  directory: ReturnType<typeof directoryInitialProps>;
  places: ReturnType<typeof placeAreasForMarkets>;
  items: Array<{ name: string; path: string }>;
};

/** First page of unfiltered /markets. Small enough to store; the full vendor table is not. */
async function buildBareMarketsDirectory(): Promise<BareMarketsDirectory> {
  const { markets, vendors, schedulesByMarket, halls } = await searchDirectory({});
  return {
    directory: directoryInitialProps(markets, vendors, schedulesByMarket, halls),
    places: placeAreasForMarkets(markets),
    items: markets.map((market) => ({
      name: market.name,
      path: `/markets/${market.slug}`,
    })),
  };
}

const loadCachedBareMarketsDirectory = unstable_cache(
  buildBareMarketsDirectory,
  ["markets-page-bare-v2"],
  DIRECTORY_CACHE,
);

export async function getBareMarketsDirectory(): Promise<BareMarketsDirectory> {
  if (!publicDb()) return buildBareMarketsDirectory();
  return loadCachedBareMarketsDirectory();
}

const EMPTY_CONTACT: ListingContactFields = { phone: null, email: null };

/** One published listing's phone and email. Not used by directory lists. */
export const getListingContact = cache(async function getListingContact(
  kind: "market" | "vendor",
  slug: string,
): Promise<ListingContactFields> {
  const supabase = publicDb();
  if (!supabase) {
    if (kind === "market") {
      const market = localMarketBySlug(slug);
      return { phone: market?.phone ?? null, email: market?.email ?? null };
    }
    const vendor = localVendorBySlug(slug);
    return { phone: vendor?.phone ?? null, email: vendor?.email ?? null };
  }
  const { data, error } = await supabase.rpc("get_listing_contact", {
    p_kind: kind,
    p_slug: slug,
  });
  if (error || data == null) return EMPTY_CONTACT;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") return EMPTY_CONTACT;
  const record = row as { phone?: unknown; email?: unknown };
  return {
    phone: typeof record.phone === "string" ? record.phone : null,
    email: typeof record.email === "string" ? record.email : null,
  };
});

export const getMarketBySlug = cache(async function getMarketBySlug(
  slug: string,
): Promise<MarketDetail | null> {
  const supabase = publicDb();
  if (!supabase) return localMarketBySlug(slug);

  const { data: market, error } = await supabase
    .from("published_markets")
    .select(MARKET_PUBLIC)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error) directoryFailed(error);
  if (!market) return null;

  const visitor = visitorDb();
  const [schedulesRes, linksRes, postsRes] = await Promise.all([
    supabase.from("published_schedules").select(SCHEDULE_PUBLIC).eq("market_id", market.id),
    supabase.from("published_stalls").select(STALL_PUBLIC).eq("market_id", market.id),
    visitor
      ? visitor
          .from("posts")
          .select(`${POST_PUBLIC}, profiles(display_name, avatar_url)`)
          .eq("market_id", market.id)
          .eq("flagged", false)
          .order("created_at", { ascending: false })
          .limit(40)
      : Promise.resolve({ data: [] as Post[], error: null }),
  ]);
  if (schedulesRes.error) directoryFailed(schedulesRes.error);
  if (linksRes.error) directoryFailed(linksRes.error);
  if (postsRes.error) directoryFailed(postsRes.error);
  const schedules = schedulesRes.data;
  const links = linksRes.data;
  const posts = postsRes.data;

  const vendorIdList = (links ?? []).map((l: { vendor_id: string }) => l.vendor_id);
  const showRoster = publishesVendorRoster(market.slug);
  // Scoped to this hall and its stalls. Reading the whole table would cap at 1000 rows.
  const reviewScope = [`market_id.eq.${market.id}`];
  if (vendorIdList.length) reviewScope.push(`vendor_id.in.(${vendorIdList.join(",")})`);
  const [vendorRes, hallsMap, reviews] = await Promise.all([
    showRoster && vendorIdList.length > 0
      ? supabase.from("published_vendors").select(VENDOR_PUBLIC).in("id", vendorIdList)
      : Promise.resolve({ data: [] as Vendor[], error: null }),
    showRoster ? hallsByVendorIds(vendorIdList) : Promise.resolve(new Map<string, VendorHall[]>()),
    visitor
      ? fetchAllRows<Review>((from, to) =>
          visitor
            .from("reviews")
            .select(`${REVIEW_PUBLIC}, profiles(display_name)`)
            .eq("flagged", false)
            .or(reviewScope.join(","))
            .order("created_at", { ascending: false })
            .range(from, to),
        )
      : Promise.resolve([] as Review[]),
  ]);
  if (vendorRes.error) directoryFailed(vendorRes.error);
  const vendors = vendorRes.data;

  const vendorMap = new Map(
    (vendors ?? []).map((v: Vendor) => [v.id, hydrateVendor(v)]),
  );
  const vendorIds = new Set(vendorIdList);
  const missingVendorIds = [
    ...new Set(
      (reviews ?? [])
        .map((row) => row.vendor_id)
        .filter((id): id is string => typeof id === "string" && !vendorMap.has(id)),
    ),
  ];
  if (missingVendorIds.length) {
    const { data: named, error: namedError } = await supabase
      .from("published_vendors")
      .select(VENDOR_PUBLIC)
      .in("id", missingVendorIds);
    if (namedError) directoryFailed(namedError);
    for (const row of named ?? []) vendorMap.set(row.id, hydrateVendor(row));
  }
  const reviewMarketIds = [
    ...new Set(
      (reviews ?? [])
        .map((row) => row.market_id)
        .filter((id): id is string => typeof id === "string" && id !== market.id),
    ),
  ];
  const reviewMarkets = new Map<string, { name: string; slug: string }>([
    [market.id, { name: market.name, slug: market.slug }],
  ]);
  if (reviewMarketIds.length) {
    const { data: namedMarkets, error: namedMarketError } = await supabase
      .from("published_markets")
      .select("id, name, slug")
      .in("id", reviewMarketIds);
    if (namedMarketError) directoryFailed(namedMarketError);
    for (const row of namedMarkets ?? []) reviewMarkets.set(row.id, { name: row.name, slug: row.slug });
  }

  const mappedReviews = (
    (reviews ?? []) as unknown as Array<
      Review & {
        profiles?: { display_name: string | null };
      }
    >
  )
    .filter((row) => row.market_id === market.id || (row.vendor_id && vendorIds.has(row.vendor_id)))
    .map((r) => {
      const stall = r.vendor_id ? vendorMap.get(r.vendor_id) : undefined;
      const hall = r.market_id ? reviewMarkets.get(r.market_id) : undefined;
      return {
        ...r,
        author_name: r.profiles?.display_name ?? "Regular",
        market_name: hall?.name ?? market.name,
        market_slug: hall?.slug ?? market.slug,
        vendor_name: stall?.name ?? null,
        vendor_slug: stall?.slug ?? null,
      };
    });

  const mappedPosts = (
    (posts ?? []) as unknown as Array<Post & { profiles?: { display_name: string | null; avatar_url: string | null } }>
  ).map((p) => ({
    ...p,
    author_name: p.profiles?.display_name ?? "Regular",
    author_avatar: p.profiles?.avatar_url,
    market_name: market.name,
    market_slug: market.slug,
    market_city: market.city,
  }));

  const vendorList = (links ?? []).flatMap((link: { vendor_id: string; stall: string | null; days: number[] }) => {
    const v = vendorMap.get(link.vendor_id);
    if (!v) return [];
    return [{ ...v, stall: link.stall, days: link.days, halls: hallsMap.get(v.id) ?? [] }];
  });

  return {
    ...withListingStats(market as Market),
    schedules: (schedules ?? []) as MarketSchedule[],
    vendors: showRoster ? vendorList : [],
    reviews: mappedReviews,
    posts: mappedPosts,
    feed: mergeReviews([
      ...mappedPosts.map((post) => reviewFromPost(post)),
      ...mappedReviews.map((row) => reviewFromReview(row)),
    ]),
  };
});

export const getVendorBySlug = cache(async function getVendorBySlug(
  slug: string,
): Promise<VendorDetail | null> {
  const supabase = publicDb();
  if (!supabase) return localVendorBySlug(slug);

  const { data: vendor, error } = await supabase
    .from("published_vendors")
    .select(VENDOR_PUBLIC)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error) directoryFailed(error);
  if (!vendor) return null;

  const visitor = visitorDb();
  const [menusRes, linksRes, reviewsRes] = await Promise.all([
    supabase.from("published_menus").select(MENU_PUBLIC).eq("vendor_id", vendor.id),
    supabase.from("published_stalls").select(STALL_PUBLIC).eq("vendor_id", vendor.id),
    visitor
      ? visitor
          .from("reviews")
          .select(`${REVIEW_PUBLIC}, profiles(display_name)`)
          .eq("vendor_id", vendor.id)
          .eq("flagged", false)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as Review[], error: null }),
  ]);
  if (menusRes.error) directoryFailed(menusRes.error);
  if (linksRes.error) directoryFailed(linksRes.error);
  if (reviewsRes.error) directoryFailed(reviewsRes.error);
  const menus = menusRes.data;
  const links = linksRes.data;
  const reviews = reviewsRes.data;

  const marketIds = (links ?? []).map((l: { market_id: string }) => l.market_id);
  const [marketsRes, postsRes, scheduleRes] = await Promise.all([
    marketIds.length > 0
      ? supabase
          .from("published_markets")
          .select(MARKET_PUBLIC)
          .eq("status", "published")
          .in("id", marketIds)
      : Promise.resolve({ data: [] as Market[], error: null }),
    marketIds.length > 0 && visitor
      ? visitor
          .from("posts")
          .select(`${POST_PUBLIC}, profiles(display_name)`)
          .eq("flagged", false)
          .in("market_id", marketIds)
          .order("created_at", { ascending: false })
          .limit(120)
      : Promise.resolve({ data: [] as Post[], error: null }),
    marketIds.length > 0
      ? supabase.from("published_schedules").select(SCHEDULE_PUBLIC).in("market_id", marketIds)
      : Promise.resolve({ data: [] as MarketSchedule[], error: null }),
  ]);
  if (marketsRes.error) directoryFailed(marketsRes.error);
  if (postsRes.error) directoryFailed(postsRes.error);
  if (scheduleRes.error) directoryFailed(scheduleRes.error);
  const markets = marketsRes.data;
  const posts = postsRes.data;
  const scheduleRows = scheduleRes.data;
  const marketMap = new Map((markets ?? []).map((m: Market) => [m.id, withListingStats(m)]));
  const schedulesByMarket = new Map<string, MarketSchedule[]>();
  for (const row of (scheduleRows ?? []) as MarketSchedule[]) {
    const list = schedulesByMarket.get(row.market_id) ?? [];
    list.push(row);
    schedulesByMarket.set(row.market_id, list);
  }

  const vendorMarkets = (links ?? []).flatMap((link: { market_id: string; stall: string | null; days: number[] }) => {
    const m = marketMap.get(link.market_id);
    if (!m) return [];
    return [{ ...m, stall: link.stall, days: link.days, schedules: schedulesByMarket.get(m.id) ?? [] }];
  });
  if (
    !vendorMarkets.length &&
    !(links ?? []).length &&
    !UNAFFILIATED_VENDOR_SLUGS.has(slug)
  ) {
    return null;
  }

  const publishedMarketIds = new Set((markets ?? []).map((market: Market) => market.id));

  const mappedReviews = (
    (reviews ?? []) as unknown as Array<
      Review & {
        profiles?: { display_name: string | null };
      }
    >
  )
    .filter((row) => !row.market_id || publishedMarketIds.has(row.market_id))
    .map((r) => {
      const hall = r.market_id ? marketMap.get(r.market_id) : undefined;
      return {
        ...r,
        author_name: r.profiles?.display_name ?? "Regular",
        market_name: hall?.name ?? null,
        market_slug: hall?.slug ?? null,
        vendor_name: (vendor as Vendor).name,
        vendor_slug: (vendor as Vendor).slug,
      };
    });

  const mappedPosts = (
    (posts ?? []) as unknown as Array<
      Post & {
        profiles?: { display_name: string | null };
      }
    >
  )
    .filter((p) => {
      if (p.market_id && !publishedMarketIds.has(p.market_id)) return false;
      const hall = p.market_id ? marketMap.get(p.market_id) : undefined;
      const decoded = reviewFromPost({
        ...p,
        author_name: p.profiles?.display_name ?? "Regular",
        market_name: hall?.name,
        market_slug: hall?.slug,
      });
      return decoded.vendor_slug === slug;
    })
    .map((p) => {
      const hall = p.market_id ? marketMap.get(p.market_id) : undefined;
      return {
        ...p,
        author_name: p.profiles?.display_name ?? "Regular",
        market_name: hall?.name,
        market_slug: hall?.slug,
        vendor_name: (vendor as Vendor).name,
        vendor_slug: (vendor as Vendor).slug,
      };
    });

  return {
    ...hydrateVendor(vendor as Vendor),
    menus: (menus ?? []) as MenuItem[],
    markets: vendorMarkets,
    reviews: mappedReviews,
    feed: mergeReviews([
      ...mappedPosts.map((post) => reviewFromPost(post)),
      ...mappedReviews.map((row) => reviewFromReview(row)),
    ]),
  };
});

export async function getLivePosts(limit = 20): Promise<Post[]> {
  const visitor = visitorDb();
  if (!visitor || !publicDb()) return [];
  const markets = await listMarkets();
  const marketById = new Map(markets.map((market) => [market.id, market]));
  if (!marketById.size) return [];
  const { data, error } = await visitor
    .from("posts")
    .select(`${POST_PUBLIC}, profiles(display_name, avatar_url)`)
    .eq("flagged", false)
    .in("market_id", [...marketById.keys()])
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data?.length) return [];
  return (
    data as unknown as Array<
      Post & {
        profiles?: { display_name: string | null; avatar_url: string | null };
      }
    >
  ).flatMap((p) => {
    const hall = marketById.get(p.market_id);
    if (!hall) return [];
    return [{
      ...p,
      author_name: p.profiles?.display_name ?? "Regular",
      author_avatar: p.profiles?.avatar_url,
      market_name: hall.name,
      market_slug: hall.slug,
      market_city: hall.city,
    }];
  });
}

async function loadFloorTape(limit: number): Promise<FloorItem[]> {
  const visitor = visitorDb();
  if (!visitor || !publicDb()) return [];
  const [markets, vendors] = await Promise.all([listMarkets(), listVendors()]);
  const marketById = new Map(markets.map((market) => [market.id, market]));
  const vendorById = new Map(vendors.map((vendor) => [vendor.id, vendor]));
  if (!marketById.size) return [];

  const [{ data: posts, error: postError }, { data: reviews, error: reviewError }] =
    await Promise.all([
      visitor
        .from("posts")
        .select(`${POST_PUBLIC}, profiles(display_name)`)
        .eq("flagged", false)
        .in("market_id", [...marketById.keys()])
        .order("created_at", { ascending: false })
        .limit(limit),
      visitor
        .from("reviews")
        .select(`${REVIEW_PUBLIC}, profiles(display_name)`)
        .eq("flagged", false)
        .in("market_id", [...marketById.keys()])
        .order("created_at", { ascending: false })
        .limit(limit),
    ]);

  if (postError && reviewError) return [];

  const fromPosts = (
    (posts ?? []) as unknown as Array<
      Post & {
        profiles?: { display_name: string | null };
      }
    >
  ).flatMap((p) => {
    const hall = marketById.get(p.market_id);
    if (!hall) return [];
    return [
      reviewFromPost({
        ...p,
        author_name: p.profiles?.display_name ?? "Regular",
        market_name: hall.name,
        market_slug: hall.slug,
      }),
    ];
  });

  const fromReviews = (
    (reviews ?? []) as unknown as Array<
      Review & {
        profiles?: { display_name: string | null };
      }
    >
  ).flatMap((r) => {
    const hall = r.market_id ? marketById.get(r.market_id) : undefined;
    if (!hall) return [];
    const stall = r.vendor_id ? vendorById.get(r.vendor_id) : undefined;
    return [
      reviewFromReview({
        ...r,
        author_name: r.profiles?.display_name ?? "Regular",
        market_name: hall.name,
        market_slug: hall.slug,
        vendor_name: stall?.name ?? null,
        vendor_slug: stall?.slug ?? null,
      }),
    ];
  });

  const merged = mergeReviews([...fromPosts, ...fromReviews]);
  return merged.slice(0, limit);
}

const loadCachedFloorTape = unstable_cache(
  async (limit: number) => loadFloorTape(limit),
  ["floor-tape-v1"],
  { revalidate: 120 },
);

export async function getFloorTape(limit = 24): Promise<FloorItem[]> {
  const size = Number.isFinite(limit) ? Math.trunc(limit) : 24;
  if (size < 1) return [];
  return loadCachedFloorTape(size);
}

export async function getFeaturedMarkets() {
  if (!publicDb()) return localFeatured();
  const markets = await listMarkets();
  return markets.filter((market) => market.featured);
}

export async function getOpenToday() {
  const [markets, schedules] = await Promise.all([listMarkets(), listSchedules()]);
  const byMarket = new Map<string, MarketSchedule[]>();
  for (const row of schedules) {
    const list = byMarket.get(row.market_id) ?? [];
    list.push(row);
    byMarket.set(row.market_id, list);
  }
  return markets.filter((m) => isMarketOpen(byMarket.get(m.id) ?? [], m.province));
}

export async function getCities() {
  const markets = await listMarkets();
  return [...new Set(markets.map((m) => m.city))].sort();
}

export const listSchedules = cache(async function listSchedules(): Promise<MarketSchedule[]> {
  if (!publicDb()) return localSchedules();
  const { schedules } = await getPublishedDirectory();
  return schedules;
});

export async function getSchedules(marketId: string) {
  if (!publicDb()) {
    const m = localMarketBySlug(
      localMarkets().find((x) => x.id === marketId)?.slug ?? "",
    );
    return m?.schedules ?? [];
  }
  const schedules = await listSchedules();
  return schedules.filter((row) => row.market_id === marketId);
}
