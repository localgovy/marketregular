import { isSupabaseConfigured } from "@/lib/constants";
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
  localVendorBySlug,
  localVendors,
} from "@/lib/data/local";
import { isMarketOpen, isOpenOnWeekday } from "@/lib/schedule";
import { decodeFloorBody } from "@/lib/floor-note";
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
    .select("market_id, stall, vendors(id, name, slug, status)");
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
      },
    ];
  });
}

export async function searchDirectory(filters: SearchFilters) {
  const supabase = await db();
  if (!supabase) return localSearch(filters);

  let marketQuery = supabase.from("markets").select("*").eq("status", "published");
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
  if (filters.tag) {
    marketQuery = marketQuery.contains("tags", [filters.tag]);
    vendorQuery = vendorQuery.contains("tags", [filters.tag]);
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

  const [{ data: schedules }, { data: links }, { data: reviews }, { data: posts }] =
    await Promise.all([
      supabase.from("market_schedules").select("*").eq("market_id", market.id),
      supabase.from("market_vendors").select("*").eq("market_id", market.id),
      supabase
        .from("reviews")
        .select("*, profiles(display_name)")
        .eq("market_id", market.id)
        .eq("flagged", false)
        .order("created_at", { ascending: false }),
      supabase
        .from("posts")
        .select("*, profiles(display_name, avatar_url)")
        .eq("market_id", market.id)
        .eq("flagged", false)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

  const vendorIds = (links ?? []).map((l: { vendor_id: string }) => l.vendor_id);
  const { data: vendors } =
    vendorIds.length > 0
      ? await supabase.from("vendors").select("*").in("id", vendorIds)
      : { data: [] };

  const vendorMap = new Map((vendors ?? []).map((v: Vendor) => [v.id, v]));

  return {
    ...(market as Market),
    schedules: (schedules ?? []) as MarketSchedule[],
    vendors: (links ?? []).flatMap((link: { vendor_id: string; stall: string | null; days: number[] }) => {
      const v = vendorMap.get(link.vendor_id);
      if (!v) return [];
      return [{ ...v, stall: link.stall, days: link.days }];
    }),
    reviews: ((reviews ?? []) as Array<Review & { profiles?: { display_name: string | null } }>).map(
      (r) => ({ ...r, author_name: r.profiles?.display_name ?? "Regular" }),
    ),
    posts: ((posts ?? []) as Array<Post & { profiles?: { display_name: string | null; avatar_url: string | null } }>).map(
      (p) => ({
        ...p,
        author_name: p.profiles?.display_name ?? "Regular",
        author_avatar: p.profiles?.avatar_url,
        market_name: market.name,
        market_slug: market.slug,
        market_city: market.city,
      }),
    ),
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

  const [{ data: menus }, { data: links }, { data: reviews }] = await Promise.all([
    supabase.from("vendor_menus").select("*").eq("vendor_id", vendor.id),
    supabase.from("market_vendors").select("*").eq("vendor_id", vendor.id),
    supabase
      .from("reviews")
      .select("*, profiles(display_name)")
      .eq("vendor_id", vendor.id)
      .eq("flagged", false)
      .order("created_at", { ascending: false }),
  ]);

  const marketIds = (links ?? []).map((l: { market_id: string }) => l.market_id);
  const { data: markets } =
    marketIds.length > 0
      ? await supabase.from("markets").select("*").in("id", marketIds)
      : { data: [] };
  const marketMap = new Map((markets ?? []).map((m: Market) => [m.id, m]));

  return {
    ...(vendor as Vendor),
    menus: (menus ?? []) as MenuItem[],
    markets: (links ?? []).flatMap((link: { market_id: string; stall: string | null; days: number[] }) => {
      const m = marketMap.get(link.market_id);
      if (!m) return [];
      return [{ ...m, stall: link.stall, days: link.days }];
    }),
    reviews: ((reviews ?? []) as Array<Review & { profiles?: { display_name: string | null } }>).map(
      (r) => ({ ...r, author_name: r.profiles?.display_name ?? "Regular" }),
    ),
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
  ).map((p) => ({
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
        .select("*, profiles(display_name), markets(name, slug)")
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

  const fromPosts: FloorItem[] = (
    (posts ?? []) as Array<
      Post & {
        profiles?: { display_name: string | null };
        markets?: { name: string; slug: string };
      }
    >
  ).map((p) => {
    const decoded = decodeFloorBody(p.body);
    return {
      id: p.id,
      kind: "post" as const,
      body: decoded.body,
      created_at: p.created_at,
      author_name: p.profiles?.display_name ?? "Regular",
      market_name: p.markets?.name ?? null,
      market_slug: p.markets?.slug ?? null,
      vendor_name: null,
      vendor_slug: decoded.vendorSlug,
      rating: null,
      verified_on_site: p.verified_on_site,
      tags: decoded.tags,
    };
  });

  const fromReviews: FloorItem[] = (
    (reviews ?? []) as Array<
      Review & {
        profiles?: { display_name: string | null };
        markets?: { name: string; slug: string };
        vendors?: { name: string; slug: string };
      }
    >
  ).map((r) => {
    const decoded = decodeFloorBody(r.body);
    return {
      id: r.id,
      kind: "review" as const,
      body: decoded.body,
      created_at: r.created_at,
      author_name: r.profiles?.display_name ?? "Regular",
      market_name: r.markets?.name ?? null,
      market_slug: r.markets?.slug ?? null,
      vendor_name: r.vendors?.name ?? null,
      vendor_slug: r.vendors?.slug ?? decoded.vendorSlug,
      rating: r.rating,
      verified_on_site: r.verified_on_site,
      tags: decoded.tags,
    };
  });

  const merged = [...fromPosts, ...fromReviews].sort(
    (a, b) => +new Date(b.created_at) - +new Date(a.created_at),
  );
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
