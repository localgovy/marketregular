import { isSupabaseConfigured } from "@/lib/constants";
import { distanceMeters } from "@/lib/geo";
import { LAUNCH_CITY, isLaunchCity } from "@/lib/launch";
import {
  localFeatured,
  localFloorTape,
  localMarketBySlug,
  localMarkets,
  localMenuCount,
  localPosts,
  localSchedules,
  localSearch,
  localSitemapVendors,
  localStalls,
  localTablePeek,
  localVendorBySlug,
  localVendors,
} from "@/lib/data/local";
import { applyDirectoryTags, searchWeekdays } from "@/lib/find-paths";
import { isMarketOpen, isOpenOnWeekday } from "@/lib/schedule";
import { mergeReviews, reviewFromPost, reviewFromReview } from "@/lib/floor-note";
import { withListingStats } from "@/lib/listing-score";
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

/** Anon cannot SELECT * (email / claimed_by are revoked). */
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
  const { data } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, role")
    .eq("id", user.id)
    .maybeSingle();
  if (data) return data as Profile;
  return {
    id: user.id,
    display_name: user.email?.split("@")[0] ?? "You",
    avatar_url: null,
    role: "user",
  };
}

export async function listMarkets(): Promise<Market[]> {
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
}

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
  return data.map(withListingStats);
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
    const q = `%${filters.q.trim()}%`;
    marketQuery = marketQuery.or(
      `name.ilike.${q},city.ilike.${q},about.ilike.${q},address.ilike.${q}`,
    );
    vendorQuery = vendorQuery.or(`name.ilike.${q},about.ilike.${q}`);
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
  let vendors = ((vendorRows ?? []) as Vendor[]).map(withListingStats);
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
  if (filters.near) {
    const here = filters.near;
    markets = [...markets].sort(
      (a, b) =>
        distanceMeters(here, { lat: a.lat, lng: a.lng }) -
        distanceMeters(here, { lat: b.lat, lng: b.lng }),
    );
  }

  return {
    markets,
    vendors: withVendorHalls(vendors, groupVendorHalls(stalls, allMarkets)),
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

  const vendorMap = new Map((vendors ?? []).map((v: Vendor) => [v.id, withListingStats(v)]));
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
    ...withListingStats(vendor as Vendor),
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
  if (!supabase) return localPosts(limit);
  const { data, error } = await supabase
    .from("posts")
    .select("*, profiles(display_name, avatar_url), markets(name, slug, city)")
    .eq("flagged", false)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data?.length) return localPosts(limit);
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
  if (!supabase) return localFloorTape(limit);

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

  if (postError && reviewError) return localFloorTape(limit);

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
  if (!merged.length) return localFloorTape(limit);
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
