import { cache } from "react";
import { isSupabaseConfigured } from "@/lib/constants";
import { LAUNCH_CITY, isLaunchCity } from "@/lib/launch";
import {
  localFeatured,
  localMarketBySlug,
  localMarkets,
  localMenuCount,
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
  parseDirectorySort,
  searchWeekdays,
  slugsForPlaceQuery,
} from "@/lib/find-paths";
import { sortDirectoryMarkets, sortDirectoryVendors } from "@/lib/directory-sort";
import { countryTagsFromQuery, withVendorCountryTags } from "@/lib/country-tags";
import { isMarketOpen, isOpenOnWeekday } from "@/lib/schedule";
import { mergeReviews, reviewFromPost, reviewFromReview } from "@/lib/floor-note";
import { withListingStats } from "@/lib/listing-score";
import { fetchMyPublicProfile } from "@/lib/my-profile";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { groupVendorHalls, withVendorHalls } from "@/lib/vendor-halls";
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

function publicDb() {
  return createPublicSupabaseClient();
}

const PAGE = 1000;

/** email / claimed_by are revoked from anon and authenticated. */
const MARKET_PUBLIC =
  "id, slug, name, about, address, city, province, postal_code, lat, lng, geofence_radius_m, website, phone, tags, status, featured, created_at, updated_at, logo_url, review_count, rating_avg, instagram, tiktok";
const VENDOR_PUBLIC =
  "id, slug, name, about, website, phone, tags, status, created_at, updated_at, logo_url, review_count, rating_avg, instagram, tiktok";

async function fetchAllRows<T>(
  run: (from: number, to: number) => PromiseLike<{
    data: T[] | null;
    error: { message?: string } | null;
  }>,
): Promise<{ data: T[]; error: { message?: string } | null }> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await run(from, from + PAGE - 1);
    if (error) return { data: rows, error };
    const chunk = data ?? [];
    rows.push(...chunk);
    if (chunk.length < PAGE) return { data: rows, error: null };
  }
}

export type DirectoryCensus = {
  markets: number;
  vendors: number;
  menus: number;
  talliedAt: string | null;
};

export async function getDirectoryCensus(): Promise<DirectoryCensus> {
  const supabase = publicDb();
  if (!supabase) {
    return {
      markets: localMarkets().length,
      vendors: localVendors().length,
      menus: localMenuCount(),
      talliedAt: null,
    };
  }
  const { data, error } = await supabase
    .from("directory_census")
    .select("markets, vendors, menus, tallied_at")
    .eq("id", LAUNCH_CITY.toLowerCase())
    .maybeSingle();
  if (error || !data) {
    return {
      markets: localMarkets().length,
      vendors: localVendors().length,
      menus: localMenuCount(),
      talliedAt: null,
    };
  }
  return {
    markets: data.markets,
    vendors: data.vendors,
    menus: data.menus ?? 0,
    talliedAt: data.tallied_at,
  };
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await db();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const row = await fetchMyPublicProfile(supabase);
  if (row) return row;
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
  const supabase = publicDb();
  if (!supabase) return localMarkets();
  const { data, error } = await fetchAllRows<Market>((from, to) =>
    supabase
      .from("markets")
      .select(MARKET_PUBLIC)
      .eq("status", "published")
      .ilike("city", LAUNCH_CITY)
      .order("name")
      .range(from, to),
  );
  if (error) return localMarkets();
  return data.map(withListingStats);
});

export async function listVendors(): Promise<Vendor[]> {
  const supabase = publicDb();
  if (!supabase) return localVendors();
  const { data, error } = await fetchAllRows<Vendor>((from, to) =>
    supabase
      .from("vendors")
      .select(VENDOR_PUBLIC)
      .eq("status", "published")
      .order("name")
      .range(from, to),
  );
  if (error) return localVendors();
  return data.map((vendor) => withVendorCountryTags(withListingStats(vendor)));
}

export async function listSitemapVendors(): Promise<Vendor[]> {
  const supabase = publicDb();
  if (!supabase) return localSitemapVendors();
  const [vendors, menuRows] = await Promise.all([
    listVendors(),
    fetchAllRows<{ vendor_id: string }>((from, to) =>
      supabase.from("vendor_menus").select("vendor_id").range(from, to),
    ),
  ]);
  const withMenu = new Set((menuRows.data ?? []).map((row) => row.vendor_id));
  return vendors.filter((vendor) => Boolean(vendor.about?.trim()) || withMenu.has(vendor.id));
}

export async function listStalls(): Promise<StallRef[]> {
  const supabase = publicDb();
  if (!supabase) return localStalls();
  const { data, error } = await fetchAllRows<{
    market_id: string;
    stall: string | null;
    days?: number[];
    vendors?: unknown;
  }>((from, to) =>
    supabase
      .from("market_vendors")
      .select("market_id, stall, days, vendors(id, name, slug, status)")
      .order("market_id")
      .order("vendor_id")
      .range(from, to),
  );
  if (error) return localStalls();
  return data.flatMap((row) => {
    const raw = (row as { vendors?: unknown }).vendors;
    const vendor = Array.isArray(raw) ? raw[0] : raw;
    if (!vendor || typeof vendor !== "object") return [];
    const v = vendor as { id: string; name: string; slug: string; status: string };
    if (v.status !== "published") return [];
    return [
      {
        id: v.id,
        name: v.name,
        slug: v.slug,
        market_id: (row as { market_id: string }).market_id,
        stall: (row as { stall: string | null }).stall,
        days: Array.isArray((row as { days?: number[] }).days)
          ? ((row as { days: number[] }).days)
          : [],
      },
    ];
  });
}

async function hallsByVendorIds(vendorIds: string[]): Promise<Map<string, VendorHall[]>> {
  if (!vendorIds.length) return new Map();
  const supabase = publicDb();
  if (!supabase) return groupVendorHalls(localStalls(), localMarkets());

  const { data, error } = await supabase
    .from("market_vendors")
    .select("vendor_id, markets(id, slug, name, city, status)")
    .in("vendor_id", vendorIds);
  if (error) return groupVendorHalls(localStalls(), localMarkets());
  if (!data?.length) return new Map();

  const stalls: StallRef[] = [];
  const markets: Pick<Market, "id" | "slug" | "name">[] = [];
  const seenMarket = new Set<string>();
  for (const row of data as Array<{
    vendor_id: string;
    markets:
      | { id: string; slug: string; name: string; city: string; status: string }
      | { id: string; slug: string; name: string; city: string; status: string }[]
      | null;
  }>) {
    const raw = row.markets;
    const market = Array.isArray(raw) ? raw[0] : raw;
    if (!market || market.status !== "published" || !isLaunchCity(market.city)) continue;
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
    .from("vendor_menus")
    .select("name, price_cents, vendor_id, vendors(name, slug)")
    .in("vendor_id", vendorIds)
    .limit(12);
  if (error || !data?.length) return localTablePeek(vendorIds);

  const seen = new Set<string>();
  const lines: TablePeek[] = [];
  for (const row of data as Array<{
    name: string;
    price_cents: number | null;
    vendor_id: string;
    vendors: { name: string; slug: string } | { name: string; slug: string }[] | null;
  }>) {
    if (seen.has(row.vendor_id)) continue;
    const raw = row.vendors;
    const vendor = Array.isArray(raw) ? raw[0] : raw;
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
  return lines.length ? lines : localTablePeek(vendorIds);
}

function tagContainsFilter(slug: string) {
  return slug.includes("-") ? `tags.cs.{"${slug}"}` : `tags.cs.{${slug}}`;
}

function postgrestIlike(column: string, raw: string) {
  const needle = raw
    .replace(/[,()"\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  if (!needle) return null;
  const escaped = needle.replaceAll("%", "\\%").replaceAll("_", "\\_");
  return `${column}.ilike."%${escaped}%"`;
}

export async function searchDirectory(filters: SearchFilters) {
  const supabase = publicDb();
  if (!supabase) return localSearch(filters);

  let marketQuery = supabase
    .from("markets")
    .select(MARKET_PUBLIC)
    .eq("status", "published")
    .ilike("city", LAUNCH_CITY);
  let vendorQuery = supabase.from("vendors").select(VENDOR_PUBLIC).eq("status", "published");

  if (filters.q?.trim()) {
    const raw = filters.q.trim();
    const marketOr = ["name", "city", "about", "address"]
      .map((column) => postgrestIlike(column, raw))
      .filter((part): part is string => Boolean(part));
    if (marketOr.length) marketQuery = marketQuery.or(marketOr.join(","));
    const originFilters = countryTagsFromQuery(raw)
      .slice(0, 6)
      .map(tagContainsFilter);
    const vendorOr = ["name", "about"]
      .map((column) => postgrestIlike(column, raw))
      .filter((part): part is string => Boolean(part));
    const vendorParts = [...vendorOr, ...originFilters];
    if (vendorParts.length) vendorQuery = vendorQuery.or(vendorParts.join(","));
  }
  if (filters.province) marketQuery = marketQuery.eq("province", filters.province);
  if (filters.city) marketQuery = marketQuery.ilike("city", filters.city);
  if (filters.setup) {
    marketQuery = marketQuery.contains("tags", [filters.setup]);
  }

  const [{ data: marketRows }, { data: vendorRows }, { data: scheduleRows }, stalls, allMarkets] =
    await Promise.all([
      marketQuery.order("name"),
      vendorQuery.order("name"),
      supabase.from("market_schedules").select("*"),
      listStalls(),
      listMarkets(),
    ]);

  if (!marketRows?.length && !vendorRows?.length) return localSearch(filters);

  const schedulesByMarket = new Map<string, MarketSchedule[]>();
  for (const row of (scheduleRows ?? []) as MarketSchedule[]) {
    const list = schedulesByMarket.get(row.market_id) ?? [];
    list.push(row);
    schedulesByMarket.set(row.market_id, list);
  }

  let markets = ((marketRows ?? []) as Market[]).map(withListingStats);
  let vendors = ((vendorRows ?? []) as Vendor[]).map((vendor) =>
    withVendorCountryTags(withListingStats(vendor)),
  );
  if (filters.q?.trim()) {
    const placeSlugs = new Set(slugsForPlaceQuery(filters.q));
    if (placeSlugs.size) {
      const seen = new Set(markets.map((market) => market.id));
      for (const market of allMarkets) {
        if (!placeSlugs.has(market.slug) || seen.has(market.id)) continue;
        markets.push(market);
        seen.add(market.id);
      }
      markets.sort((a, b) => a.name.localeCompare(b.name));
    }
  }
  const originQuery = filters.q?.trim() ? countryTagsFromQuery(filters.q) : [];
  if (originQuery.length && vendors.length) {
    const vendorIds = new Set(vendors.map((vendor) => vendor.id));
    const hostIds = new Set(
      stalls.filter((stall) => vendorIds.has(stall.id)).map((stall) => stall.market_id),
    );
    const seen = new Set(markets.map((market) => market.id));
    for (const market of allMarkets) {
      if (!hostIds.has(market.id) || seen.has(market.id)) continue;
      markets.push(market);
      seen.add(market.id);
    }
    markets.sort((a, b) => a.name.localeCompare(b.name));
  }
  const days = searchWeekdays(filters);
  if (days.length) {
    markets = markets.filter((m) =>
      days.some((day) => isOpenOnWeekday(schedulesByMarket.get(m.id) ?? [], day)),
    );
  }
  if (filters.openNow) {
    markets = markets.filter((m) =>
      isMarketOpen(schedulesByMarket.get(m.id) ?? [], m.province),
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
  const sort = parseDirectorySort(filters.sort, Boolean(filters.near));
  const halls = groupVendorHalls(stalls, allMarkets);
  const withHalls = withVendorHalls(vendors, halls);
  const marketsBySlug = new Map(allMarkets.map((market) => [market.slug, market]));

  return {
    markets: sortDirectoryMarkets(markets, sort, {
      near: filters.near,
      schedulesFor: (id) => schedulesByMarket.get(id) ?? [],
    }),
    vendors: sortDirectoryVendors(withHalls, sort, {
      near: filters.near,
      marketsBySlug,
    }),
  };
}

export async function getMarketBySlug(slug: string): Promise<MarketDetail | null> {
  const supabase = publicDb();
  if (!supabase) return localMarketBySlug(slug);

  const { data: market } = await supabase
    .from("markets")
    .select(MARKET_PUBLIC)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (!market) return localMarketBySlug(slug);
  if (!isLaunchCity((market as Market).city)) return null;

  const [{ data: schedules }, { data: links }, { data: reviews }, { data: posts }] =
    await Promise.all([
      supabase.from("market_schedules").select("*").eq("market_id", market.id),
      supabase.from("market_vendors").select("*").eq("market_id", market.id),
      supabase
        .from("reviews")
        .select("*, profiles(display_name), vendors(name, slug), markets(name, slug)")
        .eq("flagged", false)
        .order("created_at", { ascending: false }),
      supabase
        .from("posts")
        .select("*, profiles(display_name, avatar_url)")
        .eq("market_id", market.id)
        .eq("flagged", false)
        .order("created_at", { ascending: false })
        .limit(40),
    ]);

  const vendorIdList = (links ?? []).map((l: { vendor_id: string }) => l.vendor_id);
  const [{ data: vendors }, hallsMap] = await Promise.all([
    vendorIdList.length > 0
      ? supabase.from("vendors").select(VENDOR_PUBLIC).in("id", vendorIdList)
      : Promise.resolve({ data: [] as Vendor[] }),
    hallsByVendorIds(vendorIdList),
  ]);

  const vendorMap = new Map(
    (vendors ?? []).map((v: Vendor) => [v.id, withVendorCountryTags(withListingStats(v))]),
  );
  const vendorIds = new Set(vendorIdList);

  const mappedReviews = (
    (reviews ?? []) as Array<
      Review & {
        profiles?: { display_name: string | null };
        vendors?: { name: string; slug: string } | null;
        markets?: { name: string; slug: string } | null;
      }
    >
  )
    .filter((row) => row.market_id === market.id || (row.vendor_id && vendorIds.has(row.vendor_id)))
    .map((r) => ({
      ...r,
      author_name: r.profiles?.display_name ?? "Regular",
      market_name: r.markets?.name ?? market.name,
      market_slug: r.markets?.slug ?? market.slug,
      vendor_name: r.vendors?.name ?? null,
      vendor_slug: r.vendors?.slug ?? null,
    }));

  const mappedPosts = (
    (posts ?? []) as Array<Post & { profiles?: { display_name: string | null; avatar_url: string | null } }>
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
    vendors: vendorList,
    reviews: mappedReviews,
    posts: mappedPosts,
    feed: mergeReviews([
      ...mappedPosts.map((post) => reviewFromPost(post)),
      ...mappedReviews.map((row) => reviewFromReview(row)),
    ]),
  };
}

export async function getVendorBySlug(slug: string): Promise<VendorDetail | null> {
  const supabase = publicDb();
  if (!supabase) return localVendorBySlug(slug);

  const { data: vendor } = await supabase
    .from("vendors")
    .select(VENDOR_PUBLIC)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (!vendor) return localVendorBySlug(slug);

  const [{ data: menus }, { data: links }, { data: reviews }, { data: posts }] = await Promise.all([
    supabase.from("vendor_menus").select("*").eq("vendor_id", vendor.id),
    supabase.from("market_vendors").select("*").eq("vendor_id", vendor.id),
    supabase
      .from("reviews")
      .select("*, profiles(display_name), markets(name, slug), vendors(name, slug)")
      .eq("vendor_id", vendor.id)
      .eq("flagged", false)
      .order("created_at", { ascending: false }),
    supabase
      .from("posts")
      .select("*, profiles(display_name), markets(name, slug, city)")
      .eq("flagged", false)
      .order("created_at", { ascending: false })
      .limit(80),
  ]);

  const marketIds = (links ?? []).map((l: { market_id: string }) => l.market_id);
  const { data: markets } =
    marketIds.length > 0
      ? await supabase.from("markets").select(MARKET_PUBLIC).in("id", marketIds)
      : { data: [] };
  const marketMap = new Map((markets ?? []).map((m: Market) => [m.id, withListingStats(m)]));

  const vendorMarkets = (links ?? []).flatMap((link: { market_id: string; stall: string | null; days: number[] }) => {
    const m = marketMap.get(link.market_id);
    if (!m || !isLaunchCity(m.city)) return [];
    return [{ ...m, stall: link.stall, days: link.days }];
  });
  if (!vendorMarkets.length) return localVendorBySlug(slug);

  const marketIdSet = new Set(vendorMarkets.map((m) => m.id));
  const mappedReviews = (
    (reviews ?? []) as Array<
      Review & {
        profiles?: { display_name: string | null };
        markets?: { name: string; slug: string } | null;
        vendors?: { name: string; slug: string } | null;
      }
    >
  ).map((r) => ({
    ...r,
    author_name: r.profiles?.display_name ?? "Regular",
    market_name: r.markets?.name ?? null,
    market_slug: r.markets?.slug ?? null,
    vendor_name: r.vendors?.name ?? (vendor as Vendor).name,
    vendor_slug: r.vendors?.slug ?? (vendor as Vendor).slug,
  }));

  const mappedPosts = (
    (posts ?? []) as Array<
      Post & {
        profiles?: { display_name: string | null };
        markets?: { name: string; slug: string; city: string };
      }
    >
  )
    .filter((p) => marketIdSet.has(p.market_id))
    .filter((p) => {
      const decoded = reviewFromPost({
        ...p,
        author_name: p.profiles?.display_name ?? "Regular",
        market_name: p.markets?.name,
        market_slug: p.markets?.slug,
      });
      return decoded.vendor_slug === slug;
    })
    .map((p) => ({
      ...p,
      author_name: p.profiles?.display_name ?? "Regular",
      market_name: p.markets?.name,
      market_slug: p.markets?.slug,
      vendor_name: (vendor as Vendor).name,
      vendor_slug: (vendor as Vendor).slug,
    }));

  return {
    ...withVendorCountryTags(withListingStats(vendor as Vendor)),
    menus: (menus ?? []) as MenuItem[],
    markets: vendorMarkets,
    reviews: mappedReviews,
    feed: mergeReviews([
      ...mappedPosts.map((post) => reviewFromPost(post)),
      ...mappedReviews.map((row) => reviewFromReview(row)),
    ]),
  };
}

export async function getLivePosts(limit = 20): Promise<Post[]> {
  const supabase = publicDb();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("posts")
    .select("*, profiles(display_name, avatar_url), markets(name, slug, city)")
    .eq("flagged", false)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data?.length) return [];
  return (
    data as Array<
      Post & {
        profiles?: { display_name: string | null; avatar_url: string | null };
        markets?: { name: string; slug: string; city: string };
      }
    >
  )
    .filter((p) => !p.markets?.city || isLaunchCity(p.markets.city)).map((p) => ({
    ...p,
    author_name: p.profiles?.display_name ?? "Regular",
    author_avatar: p.profiles?.avatar_url,
    market_name: p.markets?.name,
    market_slug: p.markets?.slug,
    market_city: p.markets?.city,
  }));
}

export async function getFloorTape(limit = 24): Promise<FloorItem[]> {
  const supabase = publicDb();
  if (!supabase) return [];

  const [{ data: posts, error: postError }, { data: reviews, error: reviewError }] =
    await Promise.all([
      supabase
        .from("posts")
        .select("*, profiles(display_name), markets(name, slug, city)")
        .eq("flagged", false)
        .order("created_at", { ascending: false })
        .limit(limit),
      supabase
        .from("reviews")
        .select("*, profiles(display_name), markets(name, slug), vendors(name, slug)")
        .eq("flagged", false)
        .order("created_at", { ascending: false })
        .limit(limit),
    ]);

  if (postError && reviewError) return [];

  const fromPosts = (
    (posts ?? []) as Array<
      Post & {
        profiles?: { display_name: string | null };
        markets?: { name: string; slug: string; city?: string };
      }
    >
  )
    .filter((p) => !p.markets?.city || isLaunchCity(p.markets.city))
    .map((p) =>
      reviewFromPost({
        ...p,
        author_name: p.profiles?.display_name ?? "Regular",
        market_name: p.markets?.name ?? null,
        market_slug: p.markets?.slug ?? null,
      }),
    );

  const fromReviews = (
    (reviews ?? []) as Array<
      Review & {
        profiles?: { display_name: string | null };
        markets?: { name: string; slug: string };
        vendors?: { name: string; slug: string };
      }
    >
  ).map((r) =>
    reviewFromReview({
      ...r,
      author_name: r.profiles?.display_name ?? "Regular",
      market_name: r.markets?.name ?? null,
      market_slug: r.markets?.slug ?? null,
      vendor_name: r.vendors?.name ?? null,
      vendor_slug: r.vendors?.slug ?? null,
    }),
  );

  const merged = mergeReviews([...fromPosts, ...fromReviews]);
  return merged.slice(0, limit);
}

export async function getFeaturedMarkets() {
  const supabase = publicDb();
  if (!supabase) return localFeatured();
  const { data } = await supabase
    .from("markets")
    .select(MARKET_PUBLIC)
    .eq("status", "published")
    .eq("featured", true)
    .ilike("city", LAUNCH_CITY)
    .order("name");
  if (!data?.length) return localFeatured();
  return (data as Market[]).map(withListingStats);
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

export async function listSchedules(): Promise<MarketSchedule[]> {
  const supabase = publicDb();
  if (!supabase) return localSchedules();
  const { data, error } = await fetchAllRows<MarketSchedule>((from, to) =>
    supabase.from("market_schedules").select("*").order("id").range(from, to),
  );
  if (error) return localSchedules();
  return data;
}

export async function getSchedules(marketId: string) {
  const supabase = publicDb();
  if (!supabase) {
    const m = localMarketBySlug(
      localMarkets().find((x) => x.id === marketId)?.slug ?? "",
    );
    return m?.schedules ?? [];
  }
  const { data } = await supabase
    .from("market_schedules")
    .select("*")
    .eq("market_id", marketId);
  return (data ?? []) as MarketSchedule[];
}
