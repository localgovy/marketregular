import { unstable_cache } from "next/cache";
import { cache } from "react";
import { isSupabaseConfigured, provinceTz } from "@/lib/constants";
import {
  DIRECTORY_CACHE_BUDGET,
  DIRECTORY_DATA_REVALIDATE_SECONDS,
  DIRECTORY_FETCH_CAP,
  DIRECTORY_REVALIDATE_SECONDS,
  DIRECTORY_TAG,
  PUBLISHED_ROWS_REVALIDATE_SECONDS,
  budgetRangeResult,
  chunkBySerializedSize,
  joinDirectoryPages,
  loadBudgetedRange,
  rangesForCount,
  serializedBytes,
  windowFromSample,
  type BudgetedRange,
} from "@/lib/directory-cache";
import {
  isProductionBuild,
  registerBuildDirectoryLoader,
  requireBuildSnapshot,
  type BuildSnapshot,
} from "@/lib/data/build-snapshot";
import { selectInChunks } from "@/lib/data/id-chunks";
import {
  LISTING_REVIEW_CAP,
  MARKET_POST_CAP,
  REVIEW_CHUNK,
  selectChunkedListingReviews,
  VENDOR_POST_CAP,
} from "@/lib/data/snapshot-select";
import {
  MENU_PUBLIC,
  MENU_PUBLIC_FLAT,
  MENU_PUBLIC_PHOTO,
  stripContainsAlcohol,
  stripMenuCategory,
} from "@/lib/data/published-menu-select";
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
import { foldSearchText } from "@/lib/search-text";
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
import { scheduleOrigin, type FoldedSchedule } from "@/lib/season-fold";
import { UNAFFILIATED_VENDOR_SLUGS } from "@/lib/unaffiliated-vendors";
import { publishesVendorRoster } from "@/lib/vendor-roster";
import { menuItemPhotoUrl, publishedMenuSelectMissingPhoto } from "@/lib/menu-item-photo-url";
import { publishedMenuSelectMissingSections } from "@/lib/menu-sections";
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

/** Notes on a listing page. The live list renders this many; the header score is rating_avg. */
const LISTING_NOTE_CAP = LISTING_REVIEW_CAP;
const REVIEW_ID_CHUNK = REVIEW_CHUNK;

/** Private columns stay off these views. Contact is get_listing_contact, service role only. */
const MARKET_PUBLIC =
  "id, slug, name, about, address, city, province, postal_code, lat, lng, geofence_radius_m, website, tags, status, featured, created_at, updated_at, logo_url, review_count, rating_avg, instagram, tiktok, facebook";
const VENDOR_PUBLIC =
  "id, slug, name, about, website, tags, status, created_at, updated_at, logo_url, review_count, rating_avg, instagram, tiktok, facebook";
/** `research_notes` is sourcing detail for admin, not visitor copy — never selected here. */
const SCHEDULE_PUBLIC =
  "id, market_id, weekday, opens_at, closes_at, season_start, season_end, notes";
const POST_PUBLIC = "id, user_id, market_id, body, photos, flagged, created_at";
const REVIEW_PUBLIC = "id, user_id, market_id, vendor_id, rating, body, flagged, created_at";
const STALL_PUBLIC = "market_id, vendor_id, stall, days";

type DirectoryClient = NonNullable<ReturnType<typeof createServiceClient>>;
type PublishedMenuSelect = string;

function menuSelectMissingCategory(error: { message?: string; code?: string } | null | undefined) {
  if (!error) return false;
  const message = (error.message ?? "").toLowerCase();
  if (!message.includes("product_category") && !message.includes("product_slug")) return false;
  const code = (error.code ?? "").toUpperCase();
  return (
    code === "42703" ||
    code === "PGRST204" ||
    message.includes("does not exist") ||
    message.includes("schema cache") ||
    message.includes("could not find")
  );
}

let publishedMenuSelect: PublishedMenuSelect | null = null;
let publishedMenuSelectProbe: Promise<PublishedMenuSelect> | null = null;

async function probePublishedMenuSelect(supabase: DirectoryClient): Promise<PublishedMenuSelect | null> {
  try {
    const photo = await supabase.from("published_menus").select("image_url").limit(1);
    if (!photo.error) return MENU_PUBLIC_PHOTO;
    if (!publishedMenuSelectMissingPhoto(photo.error)) return null;
    const result = await supabase.from("published_menus").select("menu_section").limit(1);
    if (result.error && !publishedMenuSelectMissingSections(result.error)) return null;
    return publishedMenuSelectMissingSections(result.error) ? MENU_PUBLIC_FLAT : MENU_PUBLIC;
  } catch {
    return null;
  }
}

function resolvePublishedMenuSelect(supabase: DirectoryClient) {
  if (publishedMenuSelect) return Promise.resolve(publishedMenuSelect);
  if (!publishedMenuSelectProbe) {
    publishedMenuSelectProbe = probePublishedMenuSelect(supabase).then((columns) => {
      if (columns) {
        publishedMenuSelect = columns;
        return columns;
      }
      publishedMenuSelectProbe = null;
      return MENU_PUBLIC_PHOTO;
    });
  }
  return publishedMenuSelectProbe;
}

async function selectPublishedMenusForVendor(supabase: DirectoryClient, vendorId: string) {
  const columns = await resolvePublishedMenuSelect(supabase);
  const result = await supabase.from("published_menus").select(columns).eq("vendor_id", vendorId);
  if (result.error && columns === MENU_PUBLIC_PHOTO && publishedMenuSelectMissingPhoto(result.error)) {
    publishedMenuSelect = MENU_PUBLIC;
    return selectPublishedMenusForVendor(supabase, vendorId);
  }
  if (
    result.error &&
    columns === MENU_PUBLIC &&
    publishedMenuSelectMissingSections(result.error)
  ) {
    publishedMenuSelect = MENU_PUBLIC_FLAT;
    return selectPublishedMenusForVendor(supabase, vendorId);
  }
  if (result.error && (result.error.message ?? "").toLowerCase().includes("contains_alcohol")) {
    publishedMenuSelect = stripContainsAlcohol(columns);
    return selectPublishedMenusForVendor(supabase, vendorId);
  }
  if (result.error && menuSelectMissingCategory(result.error)) {
    publishedMenuSelect = stripMenuCategory(columns);
    return supabase.from("published_menus").select(publishedMenuSelect).eq("vendor_id", vendorId);
  }
  return result;
}

function asPublishedMenus(rows: unknown): MenuItem[] {
  if (!Array.isArray(rows)) return [];
  return rows.map((row) => {
    const item = row as MenuItem;
    return {
      ...item,
      menu_section: item.menu_section ?? null,
      menu_section_order:
        typeof item.menu_section_order === "number" && Number.isInteger(item.menu_section_order)
          ? item.menu_section_order
          : null,
      image_url: menuItemPhotoUrl(item.image_url, item.id),
    };
  });
}

/** Score, then the tag guesses that keep name-only roster shops inside the filters. */
function hydrateVendor(vendor: Vendor) {
  return withVendorProductTags(withVendorCountryTags(withListingStats(vendor)));
}

function directoryFailed(error: { message?: string } | null): never {
  throw new Error(error?.message || "Directory read failed");
}

/**
 * Newest notes for a hall and the stalls that work it.
 * One `.or(vendor_id.in.(…))` over the full history pages thousands of rows and
 * holds static generation past the 60s limit, which fails the export.
 */
async function newestListingReviews(
  visitor: NonNullable<ReturnType<typeof visitorDb>>,
  marketId: string,
  vendorIds: string[],
): Promise<Review[]> {
  const filters: Array<{ column: "market_id" | "vendor_id"; ids: string[] }> = [
    { column: "market_id", ids: [marketId] },
  ];
  if (vendorIds.length) filters.push({ column: "vendor_id", ids: vendorIds });

  const rows: Review[] = [];
  const seen = new Set<string>();
  for (const filter of filters) {
    for (let index = 0; index < filter.ids.length; index += REVIEW_ID_CHUNK) {
      const ids = filter.ids.slice(index, index + REVIEW_ID_CHUNK);
      const { data, error } = await visitor
        .from("reviews")
        .select(`${REVIEW_PUBLIC}, profiles(display_name)`)
        .eq("flagged", false)
        .in(filter.column, ids)
        .order("created_at", { ascending: false })
        .limit(LISTING_NOTE_CAP);
      if (error) directoryFailed(error);
      for (const row of (data ?? []) as Review[]) {
        if (seen.has(row.id)) continue;
        seen.add(row.id);
        rows.push(row);
      }
    }
  }
  return rows
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
    .slice(0, LISTING_NOTE_CAP);
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
 * Next's data cache rejects one entry over 2MB. Vendors alone are past that,
 * so one entry per list never stored and every page refetched it.
 * Each list is split into ranges under DIRECTORY_CACHE_BUDGET, still tagged `directory`.
 * A range that does not fit is not stored; the halves are cached instead.
 */
const DIRECTORY_CACHE = { revalidate: DIRECTORY_DATA_REVALIDATE_SECONDS, tags: [DIRECTORY_TAG] };
const PUBLISHED_ROWS_CACHE = { revalidate: PUBLISHED_ROWS_REVALIDATE_SECONDS, tags: [DIRECTORY_TAG] };
const DIRECTORY_VIEW_CACHE = { revalidate: DIRECTORY_REVALIDATE_SECONDS, tags: [DIRECTORY_TAG] };
const DIRECTORY_SAMPLE_ROWS = 50;

function requirePublicDb() {
  const supabase = publicDb();
  if (!supabase) directoryFailed(null);
  return supabase;
}

async function exactCount(
  supabase: DirectoryClient,
  table: "published_markets" | "published_vendors" | "published_stalls" | "published_schedules",
  column: string,
  publishedOnly: boolean,
) {
  let query = supabase.from(table).select(column, { count: "exact", head: true });
  if (publishedOnly) query = query.eq("status", "published");
  const { count, error } = await query;
  if (error || count == null) directoryFailed(error);
  return count;
}

function byName<T extends { id: string; name: string }>(rows: T[]) {
  return rows.sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
}

function byId<T extends { id: string }>(rows: T[]) {
  return rows.sort((a, b) => a.id.localeCompare(b.id));
}

type CachedStallRow = {
  market_id: string;
  stall: string | null;
  days: number[];
  vendors: { id: string; name: string; slug: string; status: string };
  markets: { city: string; status: string };
};

function cacheStallRow(row: {
  market_id: string;
  stall: string | null;
  days: number[] | null;
  vendor_id: string;
  vendor_name: string;
  vendor_slug: string;
  vendor_status: string;
  market_city: string;
  market_status: string;
}): CachedStallRow {
  return {
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
  };
}

function byStall(rows: CachedStallRow[]) {
  return rows.sort(
    (a, b) =>
      a.market_id.localeCompare(b.market_id) ||
      a.vendors.id.localeCompare(b.vendors.id) ||
      (a.stall ?? "").localeCompare(b.stall ?? ""),
  );
}

/**
 * One published list, cached as parallel ranges.
 * Offsets use a stable id order. Callers sort back to the order the pages used to render.
 */
function publishedDirectoryRows<T>(options: {
  name: string;
  count: (supabase: DirectoryClient) => Promise<number>;
  fetchRange: (supabase: DirectoryClient, from: number, to: number) => Promise<T[]>;
  headId: (row: T) => string;
  sort: (rows: T[]) => T[];
}) {
  const loadManifest = unstable_cache(
    async () => {
      const supabase = requirePublicDb();
      const count = await options.count(supabase);
      const sampleTo = Math.min(DIRECTORY_SAMPLE_ROWS, count) - 1;
      const sample = sampleTo >= 0 ? await options.fetchRange(supabase, 0, sampleTo) : [];
      return { count, window: windowFromSample(sample) };
    },
    [`published-directory-${options.name}-manifest-v3`],
    PUBLISHED_ROWS_CACHE,
  );

  const loadRange = unstable_cache(
    async (from: number, to: number): Promise<BudgetedRange<T>> => {
      const supabase = requirePublicDb();
      const rows = await options.fetchRange(supabase, from, to);
      const result = budgetRangeResult(rows, from, to);
      return result;
    },
    [`published-directory-${options.name}-range-v3`],
    PUBLISHED_ROWS_CACHE,
  );

  async function readFresh() {
    const supabase = requirePublicDb();
    const count = await options.count(supabase);
    // A restored build cache may still be inside its hour. Listing pages used to
    // query live rows, so a deploy must not prerender from that older copy.
    if (count > DIRECTORY_FETCH_CAP) {
      throw new Error(`Published ${options.name} exceeded ${DIRECTORY_FETCH_CAP} rows`);
    }
    const sampleTo = Math.min(DIRECTORY_SAMPLE_ROWS, count) - 1;
    const sample = sampleTo >= 0 ? await options.fetchRange(supabase, 0, sampleTo) : [];
    const window = windowFromSample(sample);
    const ranges = rangesForCount(count, window);
    const pages = await Promise.all(
      ranges.map((range) =>
        loadBudgetedRange(
          range.from,
          range.to,
          async (from, to) => {
            const rows = await options.fetchRange(supabase, from, to);
            return budgetRangeResult(rows, from, to);
          },
          DIRECTORY_CACHE_BUDGET,
          options.name,
        ),
      ),
    );
    return options.sort(joinDirectoryPages(pages, options.headId));
  }

  const loadPublishedRows = cache(async function loadPublishedRows() {
    const { count, window } = await loadManifest();
    if (count > DIRECTORY_FETCH_CAP) console.error("published directory page cap", DIRECTORY_FETCH_CAP);
    const ranges = rangesForCount(count, window);
    const pages = await Promise.all(
      ranges.map((range) =>
        loadBudgetedRange(
          range.from,
          range.to,
          (from, to) => loadRange(from, to),
          DIRECTORY_CACHE_BUDGET,
          options.name,
        ),
      ),
    );
    return options.sort(joinDirectoryPages(pages, options.headId));
  });
  return Object.assign(loadPublishedRows, { fresh: readFresh });
}

const loadCachedMarkets = publishedDirectoryRows<Market>({
  name: "markets",
  count: (supabase) => exactCount(supabase, "published_markets", "id", true),
  fetchRange: async (supabase, from, to) => {
    const { data, error } = await supabase
      .from("published_markets")
      .select(MARKET_PUBLIC)
      .eq("status", "published")
      .order("id")
      .range(from, to);
    if (error) directoryFailed(error);
    return (data ?? []) as Market[];
  },
  headId: (market) => market.id,
  sort: byName,
});

const loadCachedVendors = publishedDirectoryRows<Vendor>({
  name: "vendors",
  count: (supabase) => exactCount(supabase, "published_vendors", "id", true),
  fetchRange: async (supabase, from, to) => {
    const { data, error } = await supabase
      .from("published_vendors")
      .select(VENDOR_PUBLIC)
      .eq("status", "published")
      .order("id")
      .range(from, to);
    if (error) directoryFailed(error);
    return (data ?? []) as Vendor[];
  },
  headId: (vendor) => vendor.id,
  sort: byName,
});

const loadCachedStallRows = publishedDirectoryRows<CachedStallRow>({
  name: "stalls",
  count: (supabase) => exactCount(supabase, "published_stalls", "market_id", false),
  fetchRange: async (supabase, from, to) => {
    const { data, error } = await supabase
      .from("published_stalls")
      .select(
        "market_id, stall, days, vendor_id, vendor_name, vendor_slug, vendor_status, market_city, market_status",
      )
      .order("market_id")
      .order("vendor_id")
      .range(from, to);
    if (error) directoryFailed(error);
    return (data ?? []).map((row) => cacheStallRow(row));
  },
  headId: (row) => `${row.market_id}:${row.vendors.id}`,
  sort: byStall,
});

const loadCachedSchedules = publishedDirectoryRows<MarketSchedule>({
  name: "schedules",
  count: (supabase) => exactCount(supabase, "published_schedules", "id", false),
  fetchRange: async (supabase, from, to) => {
    const { data, error } = await supabase
      .from("published_schedules")
      .select(SCHEDULE_PUBLIC)
      .order("id")
      .range(from, to);
    if (error) directoryFailed(error);
    return (data ?? []) as MarketSchedule[];
  },
  headId: (row) => row.id,
  sort: byId,
});

const readMenuVendorIds = cache(async function readMenuVendorIds() {
  const supabase = requirePublicDb();
  const menuIds = await supabase.rpc("menu_vendor_ids");
  if (menuIds.error) directoryFailed(menuIds.error);
  if (!Array.isArray(menuIds.data)) directoryFailed({ message: "Menu vendor ids were not a list" });
  return menuIds.data.filter((id): id is string => typeof id === "string");
});

const loadCachedMenuManifest = unstable_cache(
  async () => {
    const ids = await readMenuVendorIds();
    return { parts: chunkBySerializedSize(ids).length };
  },
  ["published-directory-menu-ids-manifest-v3"],
  PUBLISHED_ROWS_CACHE,
);

const loadCachedMenuPart = unstable_cache(
  async (part: number) => {
    const ids = await readMenuVendorIds();
    const chunk = chunkBySerializedSize(ids)[part] ?? [];
    const bytes = serializedBytes(chunk);
    if (bytes > DIRECTORY_CACHE_BUDGET) {
      console.warn("directory cache window over budget", { label: "menu-ids", part, bytes });
      if (chunk.length > 1) throw new Error("directory cache menu ids exceeded budget");
    }
    return chunk;
  },
  ["published-directory-menu-ids-part-v3"],
  PUBLISHED_ROWS_CACHE,
);

const loadCachedMenuVendorIds = cache(async function loadCachedMenuVendorIds() {
  const { parts } = await loadCachedMenuManifest();
  if (parts < 1) return [];
  const chunks = await Promise.all(
    Array.from({ length: parts }, (_, part) => loadCachedMenuPart(part)),
  );
  return chunks.flat();
});

async function loadPublishedDirectory(): Promise<PublishedDirectory> {
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
  };
}

function directoryErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Directory read failed";
}

async function loadPublishedDirectoryWithRetry(): Promise<PublishedDirectory> {
  try {
    return await loadPublishedDirectory();
  } catch (first) {
    console.error("published directory", directoryErrorMessage(first));
    await new Promise((resolve) => setTimeout(resolve, 400));
    return loadPublishedDirectory();
  }
}

function directoryFromSnapshot(snap: BuildSnapshot): PublishedDirectory {
  const records = snap.records();
  const folded = foldSeasonAliases(records.markets, records.schedules);
  return {
    markets: folded.markets,
    vendors: records.vendors,
    stalls: records.stalls,
    rosterVendorIds: records.rosterVendorIds,
    schedules: folded.schedules,
    menuVendorIds: records.menuVendorIds,
  };
}

const getPublishedDirectory = cache(async function getPublishedDirectory() {
  if (!publicDb()) directoryFailed(null);
  if (isProductionBuild()) {
    const snap = await requireBuildSnapshot();
    if (snap) return directoryFromSnapshot(snap);
  }
  return loadPublishedDirectoryWithRetry();
});

registerBuildDirectoryLoader(async () => {
  const [markets, vendors, stallRows, schedules, menuVendorIds] = await Promise.all([
    loadCachedMarkets.fresh(),
    loadCachedVendors.fresh(),
    loadCachedStallRows.fresh(),
    loadCachedSchedules.fresh(),
    readMenuVendorIds(),
  ]);
  return {
    markets,
    vendors,
    stalls: stallsFromRows(stallRows),
    rosterVendorIds: rosterVendorIdsFromRows(stallRows),
    schedules,
    menuVendorIds,
  };
});

/** One search card. The alias's Sunday hours still count on the host market. */
function foldSeasonAliases<T extends { id: string; slug: string }, S extends MarketSchedule>(
  markets: T[],
  schedules: S[],
) {
  let nextMarkets = markets;
  let nextSchedules: FoldedSchedule[] = schedules.map((row) => ({
    ...row,
    origin_market_id: scheduleOrigin(row),
  }));
  for (const market of markets) {
    const hostSlug = seasonAliasTarget(market.slug);
    if (!hostSlug) continue;
    const host = markets.find((item) => item.slug === hostSlug);
    if (!host) continue;
    nextSchedules = nextSchedules.map((row) =>
      scheduleOrigin(row) === market.id ? { ...row, market_id: host.id } : row,
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

  const data = await selectInChunks<{
    vendor_id: string;
    market_id: string;
    market_slug: string;
    market_name: string;
    market_city: string;
    market_status: string;
  }>(
    vendorIds,
    (slice) =>
      supabase
        .from("published_stalls")
        .select("vendor_id, market_id, market_slug, market_name, market_city, market_status")
        .in("vendor_id", slice),
    directoryFailed,
  );
  if (!data.length) return new Map();

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
  const folded = foldSearchText(needle);
  if (!value || !folded) return false;
  return foldSearchText(value).includes(folded);
}

type DirectorySnapshot = {
  expires: number;
  markets: Market[];
  vendors: Vendor[];
  stalls: StallRef[];
  schedulesByMarket: Map<string, MarketSchedule[]>;
  schedulesRecord: Record<string, MarketSchedule[]>;
  halls: Map<string, VendorHall[]>;
  marketsBySlug: Map<string, Market>;
  stallLinks: Array<{ market_id: string; vendor_id: string; days: number[] }>;
};

let directorySnapshotMemory: DirectorySnapshot | null = null;
let directorySnapshotTask: Promise<DirectorySnapshot> | null = null;
let directorySnapshotGeneration = 0;

/** Drop the in-process directory copy after a publish. The data cache tag still expires on its own. */
export function clearDirectoryMemory() {
  directorySnapshotGeneration += 1;
  directorySnapshotMemory = null;
  directorySnapshotTask = null;
}

async function buildDirectorySnapshot(generation: number): Promise<DirectorySnapshot> {
  const [markets, vendors, stalls, scheduleRows] = await Promise.all([
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
  const snapshot: DirectorySnapshot = {
    expires: Date.now() + DIRECTORY_REVALIDATE_SECONDS * 1000,
    markets,
    vendors,
    stalls,
    schedulesByMarket,
    schedulesRecord: Object.fromEntries(schedulesByMarket),
    halls: groupVendorHalls(stalls, markets),
    marketsBySlug: new Map(markets.map((market) => [market.slug, market])),
    stallLinks: stalls.map((stall) => ({
      market_id: stall.market_id,
      vendor_id: stall.id,
      days: stall.days,
    })),
  };
  if (generation === directorySnapshotGeneration) directorySnapshotMemory = snapshot;
  return snapshot;
}

/** One hydrated directory per cache window, so a tag click does not reload every table. */
async function loadDirectorySnapshot(): Promise<DirectorySnapshot> {
  if (directorySnapshotMemory && directorySnapshotMemory.expires > Date.now()) {
    return directorySnapshotMemory;
  }
  if (!directorySnapshotTask) {
    const generation = directorySnapshotGeneration;
    directorySnapshotTask = buildDirectorySnapshot(generation).finally(() => {
      directorySnapshotTask = null;
    });
  }
  return directorySnapshotTask;
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

  const snap = await loadDirectorySnapshot();
  const allMarkets = snap.markets;
  const allVendors = snap.vendors;
  const stalls = snap.stalls;
  const schedulesByMarket = snap.schedulesByMarket;
  const stallLinks = snap.stallLinks;

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
      stallLinks.filter((stall) => !days.length || stall.days.some((day) => days.includes(day))),
      filters.tags,
    );
    markets = tagged.markets;
    vendors = tagged.vendors;
  }
  markets = filterMarketsByAreas(markets, filters.areas ?? []);
  vendors = scopeVendorsToMarkets(markets, vendors, stallLinks, filters, days);
  const sort = parseDirectorySort(filters.sort, Boolean(filters.near));
  const halls = snap.halls;
  const marketsBySlug = snap.marketsBySlug;
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
  const orderedMarkets = sortDirectoryMarkets(markets, sort, {
    near: filters.near,
    schedulesFor: (id) => schedulesByMarket.get(id) ?? [],
    now,
  });
  const result = {
    markets: preferQueryNameHits(orderedMarkets, raw),
    vendors: preferQueryNameHits(rankedVendors, raw),
    schedulesByMarket: snap.schedulesRecord,
    halls,
  };
  return result;
}

export type BareMarketsDirectory = {
  /** Instant the cached first page was ordered. Later pages must reuse it. */
  sortedAt: string;
  directory: ReturnType<typeof directoryInitialProps>;
  places: ReturnType<typeof placeAreasForMarkets>;
  items: Array<{ name: string; path: string }>;
};

/** First page of unfiltered /markets. Small enough to store; the full vendor table is not. */
async function buildBareMarketsDirectory(): Promise<BareMarketsDirectory> {
  const now = new Date();
  const { markets, vendors, schedulesByMarket, halls } = await searchDirectory({}, now);
  return {
    sortedAt: now.toISOString(),
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
  ["markets-page-bare-v5"],
  DIRECTORY_VIEW_CACHE,
);

export async function getBareMarketsDirectory(): Promise<BareMarketsDirectory> {
  if (!publicDb()) return buildBareMarketsDirectory();
  // Trust the cache. Rebuilding here skipped the cache and ran the full
  // directory on every request once the window elapsed.
  return loadCachedBareMarketsDirectory();
}

const EMPTY_CONTACT: ListingContactFields = { phone: null, email: null };

type MarketLink = { vendor_id: string; stall: string | null; days: number[] };
type VendorLink = { market_id: string; stall: string | null; days: number[] };
type ReviewRow = Review & { profiles?: { display_name: string | null } | null };
type MarketPostRow = Post & {
  profiles?: { display_name: string | null; avatar_url?: string | null } | null;
};
type VendorPostRow = Post & { profiles?: { display_name: string | null } | null };

function mapMarketDetail(input: {
  market: Market;
  schedules: MarketSchedule[] | null;
  links: MarketLink[] | null;
  posts: MarketPostRow[] | null;
  vendors: Vendor[];
  hallsMap: Map<string, VendorHall[]>;
  reviews: ReviewRow[] | null;
  extraVendors: Vendor[];
  extraMarkets: Array<{ id: string; name: string; slug: string }>;
  showRoster: boolean;
}): MarketDetail {
  const { market, links, posts, reviews, showRoster } = input;
  const vendorMap = new Map(input.vendors.map((vendor) => [vendor.id, hydrateVendor(vendor)]));
  for (const vendor of input.extraVendors) {
    if (!vendorMap.has(vendor.id)) vendorMap.set(vendor.id, hydrateVendor(vendor));
  }
  const vendorIds = new Set((links ?? []).map((link) => link.vendor_id));
  const reviewMarkets = new Map<string, { name: string; slug: string }>([
    [market.id, { name: market.name, slug: market.slug }],
  ]);
  for (const named of input.extraMarkets) {
    if (named.id !== market.id) reviewMarkets.set(named.id, { name: named.name, slug: named.slug });
  }

  const mappedReviews = (reviews ?? [])
    .filter((row) => row.market_id === market.id || (row.vendor_id && vendorIds.has(row.vendor_id)))
    .map((row) => {
      const stall = row.vendor_id ? vendorMap.get(row.vendor_id) : undefined;
      const hall = row.market_id ? reviewMarkets.get(row.market_id) : undefined;
      return {
        ...row,
        author_name: row.profiles?.display_name ?? "Regular",
        market_name: hall?.name ?? market.name,
        market_slug: hall?.slug ?? market.slug,
        vendor_name: stall?.name ?? null,
        vendor_slug: stall?.slug ?? null,
      };
    });

  const mappedPosts = (posts ?? []).map((post) => ({
    ...post,
    author_name: post.profiles?.display_name ?? "Regular",
    author_avatar: post.profiles?.avatar_url,
    market_name: market.name,
    market_slug: market.slug,
    market_city: market.city,
  }));

  const vendorList = (links ?? []).flatMap((link) => {
    const vendor = vendorMap.get(link.vendor_id);
    if (!vendor) return [];
    return [{ ...vendor, stall: link.stall, days: link.days, halls: input.hallsMap.get(vendor.id) ?? [] }];
  });

  return {
    ...withListingStats(market),
    schedules: input.schedules ?? [],
    vendors: showRoster ? vendorList : [],
    reviews: mappedReviews,
    posts: mappedPosts,
    feed: mergeReviews([
      ...mappedPosts.map((post) => reviewFromPost(post)),
      ...mappedReviews.map((row) => reviewFromReview(row)),
    ]),
  };
}

function mapVendorDetail(input: {
  slug: string;
  vendor: Vendor;
  menus: MenuItem[];
  links: VendorLink[] | null;
  markets: Market[] | null;
  posts: VendorPostRow[] | null;
  schedules: MarketSchedule[] | null;
  reviews: ReviewRow[] | null;
}): VendorDetail | null {
  const { slug, vendor, links, markets, posts, reviews } = input;
  const marketMap = new Map((markets ?? []).map((market) => [market.id, withListingStats(market)]));
  const schedulesByMarket = new Map<string, MarketSchedule[]>();
  for (const row of input.schedules ?? []) {
    const list = schedulesByMarket.get(row.market_id) ?? [];
    list.push(row);
    schedulesByMarket.set(row.market_id, list);
  }

  const vendorMarkets = (links ?? []).flatMap((link) => {
    const market = marketMap.get(link.market_id);
    if (!market) return [];
    return [{ ...market, stall: link.stall, days: link.days, schedules: schedulesByMarket.get(market.id) ?? [] }];
  });
  if (!vendorMarkets.length && !(links ?? []).length && !UNAFFILIATED_VENDOR_SLUGS.has(slug)) {
    return null;
  }

  const publishedMarketIds = new Set((markets ?? []).map((market) => market.id));
  const mappedReviews = (reviews ?? [])
    .filter((row) => !row.market_id || publishedMarketIds.has(row.market_id))
    .map((row) => {
      const hall = row.market_id ? marketMap.get(row.market_id) : undefined;
      return {
        ...row,
        author_name: row.profiles?.display_name ?? "Regular",
        market_name: hall?.name ?? null,
        market_slug: hall?.slug ?? null,
        vendor_name: vendor.name,
        vendor_slug: vendor.slug,
      };
    });

  const mappedPosts = (posts ?? [])
    .filter((post) => {
      if (post.market_id && !publishedMarketIds.has(post.market_id)) return false;
      const hall = post.market_id ? marketMap.get(post.market_id) : undefined;
      const decoded = reviewFromPost({
        ...post,
        author_name: post.profiles?.display_name ?? "Regular",
        market_name: hall?.name,
        market_slug: hall?.slug,
      });
      return decoded.vendor_slug === slug;
    })
    .map((post) => {
      const hall = post.market_id ? marketMap.get(post.market_id) : undefined;
      return {
        ...post,
        author_name: post.profiles?.display_name ?? "Regular",
        market_name: hall?.name,
        market_slug: hall?.slug,
        vendor_name: vendor.name,
        vendor_slug: vendor.slug,
      };
    });

  return {
    ...hydrateVendor(vendor),
    menus: input.menus,
    markets: vendorMarkets,
    reviews: mappedReviews,
    feed: mergeReviews([
      ...mappedPosts.map((post) => reviewFromPost(post)),
      ...mappedReviews.map((row) => reviewFromReview(row)),
    ]),
  };
}

function marketDetailFromSnapshot(snap: BuildSnapshot, slug: string): MarketDetail | null {
  const market = snap.marketBySlug(slug);
  if (!market) return null;
  const links = snap.linksForMarket(market.id);
  const vendorIdList = links.map((link) => link.vendor_id);
  const showRoster = publishesVendorRoster(market.slug);
  const reviews = selectChunkedListingReviews(snap.reviewPool(market.id, vendorIdList), market.id, vendorIdList);
  const vendors: Vendor[] = [];
  if (showRoster) {
    for (const id of vendorIdList) {
      const vendor = snap.vendorById(id);
      if (vendor) vendors.push(vendor);
    }
  }
  const extraVendors: Vendor[] = [];
  const seenVendors = new Set(vendors.map((vendor) => vendor.id));
  for (const review of reviews) {
    if (!review.vendor_id || seenVendors.has(review.vendor_id)) continue;
    const named = snap.vendorById(review.vendor_id);
    if (!named) continue;
    seenVendors.add(named.id);
    extraVendors.push(named);
  }
  const extraMarkets: Array<{ id: string; name: string; slug: string }> = [];
  const seenMarkets = new Set<string>([market.id]);
  for (const review of reviews) {
    if (!review.market_id || seenMarkets.has(review.market_id)) continue;
    const named = snap.marketById(review.market_id);
    if (!named) continue;
    seenMarkets.add(named.id);
    extraMarkets.push(named);
  }
  return mapMarketDetail({
    market,
    schedules: snap.schedulesFor(market.id),
    links,
    posts: snap.postsForMarket(market.id, MARKET_POST_CAP),
    vendors,
    hallsMap: showRoster ? snap.hallsFor(vendorIdList) : new Map(),
    reviews,
    extraVendors,
    extraMarkets,
    showRoster,
  });
}

function vendorDetailFromSnapshot(snap: BuildSnapshot, slug: string): VendorDetail | null {
  const vendor = snap.vendorBySlug(slug);
  if (!vendor) return null;
  const links = snap.linksForVendor(vendor.id);
  const marketIds = [...new Set(links.map((link) => link.market_id))];
  const markets: Market[] = [];
  for (const id of marketIds) {
    const market = snap.marketById(id);
    if (market && market.status === "published") markets.push(market);
  }
  const schedules: MarketSchedule[] = [];
  for (const market of markets) schedules.push(...snap.schedulesFor(market.id));
  return mapVendorDetail({
    slug,
    vendor,
    menus: asPublishedMenus(snap.menusForVendor(vendor.id)),
    links,
    markets,
    posts: snap.postsForMarkets(marketIds, VENDOR_POST_CAP).map((post) => ({
      ...post,
      profiles: post.profiles ? { display_name: post.profiles.display_name } : null,
    })),
    schedules,
    reviews: snap.reviewsForVendor(vendor.id),
  });
}

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
  if (isProductionBuild()) {
    const snap = await requireBuildSnapshot();
    if (snap) return snap.contact(kind, slug);
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
  if (isProductionBuild()) {
    const snap = await requireBuildSnapshot();
    if (snap) return marketDetailFromSnapshot(snap, slug);
  }

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
          .limit(MARKET_POST_CAP)
      : Promise.resolve({ data: [] as MarketPostRow[], error: null }),
  ]);
  if (schedulesRes.error) directoryFailed(schedulesRes.error);
  if (linksRes.error) directoryFailed(linksRes.error);
  if (postsRes.error) directoryFailed(postsRes.error);
  const schedules = schedulesRes.data;
  const links = linksRes.data;
  const posts = postsRes.data;

  const vendorIdList = (links ?? []).map((link: { vendor_id: string }) => link.vendor_id);
  const showRoster = publishesVendorRoster(market.slug);
  const [vendors, hallsMap, reviews] = await Promise.all([
    showRoster && vendorIdList.length > 0
      ? selectInChunks<Vendor>(
          vendorIdList,
          (slice) => supabase.from("published_vendors").select(VENDOR_PUBLIC).in("id", slice),
          directoryFailed,
        )
      : Promise.resolve([] as Vendor[]),
    showRoster ? hallsByVendorIds(vendorIdList) : Promise.resolve(new Map<string, VendorHall[]>()),
    visitor
      ? newestListingReviews(visitor, market.id, vendorIdList)
      : Promise.resolve([] as ReviewRow[]),
  ]);

  const loadedIds = new Set(vendors.map((vendor) => vendor.id));
  const missingVendorIds = [
    ...new Set(
      (reviews ?? [])
        .map((row) => row.vendor_id)
        .filter((id): id is string => typeof id === "string" && !loadedIds.has(id)),
    ),
  ];
  let extraVendors: Vendor[] = [];
  if (missingVendorIds.length) {
    const { data: named, error: namedError } = await supabase
      .from("published_vendors")
      .select(VENDOR_PUBLIC)
      .in("id", missingVendorIds);
    if (namedError) directoryFailed(namedError);
    extraVendors = named ?? [];
  }
  const reviewMarketIds = [
    ...new Set(
      (reviews ?? [])
        .map((row) => row.market_id)
        .filter((id): id is string => typeof id === "string" && id !== market.id),
    ),
  ];
  let extraMarkets: Array<{ id: string; name: string; slug: string }> = [];
  if (reviewMarketIds.length) {
    const { data: namedMarkets, error: namedMarketError } = await supabase
      .from("published_markets")
      .select("id, name, slug")
      .in("id", reviewMarketIds);
    if (namedMarketError) directoryFailed(namedMarketError);
    extraMarkets = namedMarkets ?? [];
  }

  return mapMarketDetail({
    market: market as Market,
    schedules: (schedules ?? []) as MarketSchedule[],
    links: links ?? [],
    posts: (posts ?? []) as MarketPostRow[],
    vendors,
    hallsMap,
    reviews: (reviews ?? []) as ReviewRow[],
    extraVendors,
    extraMarkets,
    showRoster,
  });
});

export const getVendorBySlug = cache(async function getVendorBySlug(
  slug: string,
): Promise<VendorDetail | null> {
  const supabase = publicDb();
  if (!supabase) return localVendorBySlug(slug);
  if (isProductionBuild()) {
    const snap = await requireBuildSnapshot();
    if (snap) return vendorDetailFromSnapshot(snap, slug);
  }

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
    selectPublishedMenusForVendor(supabase, vendor.id),
    supabase.from("published_stalls").select(STALL_PUBLIC).eq("vendor_id", vendor.id),
    visitor
      ? visitor
          .from("reviews")
          .select(`${REVIEW_PUBLIC}, profiles(display_name)`)
          .eq("vendor_id", vendor.id)
          .eq("flagged", false)
          .order("created_at", { ascending: false })
          .limit(LISTING_NOTE_CAP)
      : Promise.resolve({ data: [] as ReviewRow[], error: null }),
  ]);
  if (menusRes.error) directoryFailed(menusRes.error);
  if (linksRes.error) directoryFailed(linksRes.error);
  if (reviewsRes.error) directoryFailed(reviewsRes.error);
  const links = linksRes.data;
  const reviews = reviewsRes.data;

  const marketIds = (links ?? []).map((link: { market_id: string }) => link.market_id);
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
          .limit(VENDOR_POST_CAP)
      : Promise.resolve({ data: [] as VendorPostRow[], error: null }),
    marketIds.length > 0
      ? supabase.from("published_schedules").select(SCHEDULE_PUBLIC).in("market_id", marketIds)
      : Promise.resolve({ data: [] as MarketSchedule[], error: null }),
  ]);
  if (marketsRes.error) directoryFailed(marketsRes.error);
  if (postsRes.error) directoryFailed(postsRes.error);
  if (scheduleRes.error) directoryFailed(scheduleRes.error);

  return mapVendorDetail({
    slug,
    vendor: vendor as Vendor,
    menus: asPublishedMenus(menusRes.data),
    links: links ?? [],
    markets: (marketsRes.data ?? []) as Market[],
    posts: (postsRes.data ?? []) as VendorPostRow[],
    schedules: (scheduleRes.data ?? []) as MarketSchedule[],
    reviews: (reviews ?? []) as ReviewRow[],
  });
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
  ["floor-tape-v2"],
  { revalidate: DIRECTORY_DATA_REVALIDATE_SECONDS, tags: [DIRECTORY_TAG] },
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

/**
 * Markets and their hours only. The header strip must not assemble vendors,
 * stalls, and menus just to name the halls open today.
 */
export const listMarketHours = cache(async function listMarketHours() {
  if (!publicDb()) return foldSeasonAliases(localMarkets(), localSchedules());
  if (isProductionBuild()) {
    const directory = await getPublishedDirectory();
    return { markets: directory.markets, schedules: directory.schedules };
  }
  const [markets, schedules] = await Promise.all([loadCachedMarkets(), loadCachedSchedules()]);
  return foldSeasonAliases(markets, schedules);
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
