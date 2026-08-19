import { isSupabaseConfigured } from "@/lib/constants";
import { distanceMeters } from "@/lib/geo";
import { LAUNCH_CITY, isLaunchCity } from "@/lib/launch";
import {
  localCities,
  localFeatured,
  localFloorTape,
  localMarketBySlug,
  localMarkets,
  localOpenToday,
  localPosts,
  localSchedules,
  localSearch,
  localStalls,
  localTablePeek,
  localVendorBySlug,
  localVendors,
} from "@/lib/data/local";
import { isMarketOpen, isOpenOnWeekday } from "@/lib/schedule";
import { mergeReviews, reviewFromPost, reviewFromReview } from "@/lib/floor-note";
import { createServerSupabaseClient } from "@/lib/supabase/server";
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
} from "@/types/database";

async function db() {
  if (!isSupabaseConfigured()) return null;
  return createServerSupabaseClient();
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
  const supabase = await db();
  if (!supabase) return localMarkets();
  const { data, error } = await supabase
    .from("markets")
    .select("*")
    .eq("status", "published")
    .ilike("city", LAUNCH_CITY)
    .order("name");
  if (error || !data?.length) return localMarkets();
  return data as Market[];
}

export async function listVendors(): Promise<Vendor[]> {
  const supabase = await db();
  if (!supabase) return localVendors();
  const { data, error } = await supabase
    .from("vendors")
    .select("*")
    .eq("status", "published")
    .order("name");
  if (error || !data?.length) return localVendors();
  return data as Vendor[];
}

export async function listStalls(): Promise<StallRef[]> {
  const supabase = await db();
  if (!supabase) return localStalls();
  const { data, error } = await supabase
    .from("market_vendors")
    .select("market_id, stall, days, vendors(id, name, slug, status)");
  if (error || !data?.length) return localStalls();
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

export type TablePeek = {
  vendorName: string;
  vendorSlug: string;
  item: string;
  priceCents: number | null;
  note: string | null;
};

export async function getTablePeek(vendorIds: string[]): Promise<TablePeek[]> {
  if (!vendorIds.length) return [];
  const supabase = await db();
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
  const supabase = await db();
  if (!supabase) return localSearch(filters);

  let marketQuery = supabase
    .from("markets")
    .select("*")
    .eq("status", "published")
    .ilike("city", LAUNCH_CITY);
  let vendorQuery = supabase.from("vendors").select("*").eq("status", "published");

  if (filters.q?.trim()) {
    const q = `%${filters.q.trim()}%`;
    marketQuery = marketQuery.or(
      `name.ilike.${q},city.ilike.${q},about.ilike.${q},address.ilike.${q}`,
    );
    vendorQuery = vendorQuery.or(`name.ilike.${q},about.ilike.${q}`);
  }
  if (filters.province) marketQuery = marketQuery.eq("province", filters.province);
  if (filters.city) marketQuery = marketQuery.ilike("city", filters.city);
  if (filters.tags?.length) {
    marketQuery = marketQuery.overlaps("tags", filters.tags);
    vendorQuery = vendorQuery.overlaps("tags", filters.tags);
  }
  if (filters.setup) {
    marketQuery = marketQuery.contains("tags", [filters.setup]);
  }

  const [{ data: marketRows }, { data: vendorRows }, { data: scheduleRows }] =
    await Promise.all([
      marketQuery.order("name"),
      vendorQuery.order("name"),
      supabase.from("market_schedules").select("*"),
    ]);

  if (!marketRows?.length && !vendorRows?.length) return localSearch(filters);

  const schedulesByMarket = new Map<string, MarketSchedule[]>();
  for (const row of (scheduleRows ?? []) as MarketSchedule[]) {
    const list = schedulesByMarket.get(row.market_id) ?? [];
    list.push(row);
    schedulesByMarket.set(row.market_id, list);
  }

  let markets = (marketRows ?? []) as Market[];
  if (filters.weekday != null) {
    markets = markets.filter((m) =>
      isOpenOnWeekday(schedulesByMarket.get(m.id) ?? [], filters.weekday!),
    );
  }
  if (filters.openNow) {
    markets = markets.filter((m) =>
      isMarketOpen(schedulesByMarket.get(m.id) ?? [], m.province),
    );
  }
  if (filters.near) {
    const here = filters.near;
    markets = [...markets].sort(
      (a, b) =>
        distanceMeters(here, { lat: a.lat, lng: a.lng }) -
        distanceMeters(here, { lat: b.lat, lng: b.lng }),
    );
  }

  return { markets, vendors: (vendorRows ?? []) as Vendor[] };
}

export async function getMarketBySlug(slug: string): Promise<MarketDetail | null> {
  const supabase = await db();
  if (!supabase) return localMarketBySlug(slug);

  const { data: market } = await supabase
    .from("markets")
    .select("*")
    .eq("slug", slug)
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
  const { data: vendors } =
    vendorIdList.length > 0
      ? await supabase.from("vendors").select("*").in("id", vendorIdList)
      : { data: [] };

  const vendorMap = new Map((vendors ?? []).map((v: Vendor) => [v.id, v]));
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
    return [{ ...v, stall: link.stall, days: link.days }];
  });

  return {
    ...(market as Market),
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
  const supabase = await db();
  if (!supabase) return localVendorBySlug(slug);

  const { data: vendor } = await supabase
    .from("vendors")
    .select("*")
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
      ? await supabase.from("markets").select("*").in("id", marketIds)
      : { data: [] };
  const marketMap = new Map((markets ?? []).map((m: Market) => [m.id, m]));

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
    ...(vendor as Vendor),
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
  const supabase = await db();
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
  const supabase = await db();
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
  const supabase = await db();
  if (!supabase) return localFeatured();
  const { data } = await supabase
    .from("markets")
    .select("*")
    .eq("status", "published")
    .eq("featured", true)
    .ilike("city", LAUNCH_CITY)
    .order("name");
  if (!data?.length) return localFeatured();
  return data as Market[];
}

export async function getOpenToday() {
  const markets = await listMarkets();
  const supabase = await db();
  if (!supabase) return localOpenToday();
  const { data: schedules } = await supabase.from("market_schedules").select("*");
  const byMarket = new Map<string, MarketSchedule[]>();
  for (const row of (schedules ?? []) as MarketSchedule[]) {
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
  const supabase = await db();
  if (!supabase) return localSchedules();
  const { data, error } = await supabase.from("market_schedules").select("*");
  if (error || !data?.length) return localSchedules();
  return data as MarketSchedule[];
}

export async function getSchedules(marketId: string) {
  const supabase = await db();
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
