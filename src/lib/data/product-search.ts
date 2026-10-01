import { cache } from "react";
import { listMarkets, listSchedules, listStalls, listVendors } from "@/lib/data/catalog";
import {
  assertPublicSearchPayload,
  isAlcoholCategory,
  PRODUCT_PAGE,
  productHref,
  visiblePriceCents,
  type ProductHit,
  type ProductMarketHit,
  type VendorHit,
} from "@/lib/product-hits";
import { visitBadge, soonestWait, type VisitHall } from "@/lib/product-visit";
import { hallDayHours } from "@/lib/schedule";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import type { MarketSchedule } from "@/types/database";

export type FindMarket = {
  name: string;
  slug: string;
  days: number[];
  hours: Array<{ day: string; hours: string }>;
  ratingAvg: number | null;
  reviewCount: number;
};

export type FindVendor = {
  name: string;
  slug: string;
  ratingAvg: number | null;
  reviewCount: number;
  items: Array<{ name: string; priceCents: number | null }>;
  markets: FindMarket[];
  badge: "Open now" | "Later today" | "Selling this weekend" | null;
  /** 0 means open today. Higher means later in the week. 8 means no upcoming day. */
  waitDays: number;
};

function reviewFields(row: { rating_avg?: number | null; review_count?: number } | undefined) {
  return {
    ratingAvg: row?.rating_avg ?? null,
    reviewCount: row?.review_count ?? 0,
  };
}

type MenuRow = {
  name: string;
  product_category: string | null;
  product_slug: string | null;
  price_cents: number | null;
  vendor_id: string;
};

type RpcRow = {
  item_name: string;
  product_category: string | null;
  product_slug: string | null;
  price_cents: number | null;
  vendor_name: string;
  vendor_slug: string;
  markets: ProductMarketHit[] | null;
  open_today: boolean;
};

function asDays(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.filter((day): day is number => typeof day === "number");
}

const FOOD_CATEGORIES = [
  "bread-and-bakery",
  "eggs",
  "honey",
  "cheese-and-dairy",
  "maple",
  "apples-and-fruit",
  "vegetables",
  "meat-and-turkey",
  "pies-and-sweets",
  "prepared-foods",
  "preserves-and-sauces",
  "coffee-and-tea",
  "alcohol",
  "seafood",
  "flour-and-grains",
  "nuts-and-snacks",
  "beverages",
] as const;

async function menuRows(slugs: string[]): Promise<MenuRow[]> {
  const supabase = createPublicSupabaseClient();
  if (!supabase || slugs.length === 0) return [];
  const rows: MenuRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("vendor_menus")
      .select("name, product_category, product_slug, price_cents, vendor_id")
      .in("product_slug", slugs)
      .in("product_category", [...FOOD_CATEGORIES])
      .order("id")
      .range(from, from + 999);
    if (error) throw new Error("Could not load this product");
    assertPublicSearchPayload(data);
    const chunk = (data ?? []) as MenuRow[];
    rows.push(...chunk);
    if (chunk.length < 1000) return rows;
  }
}

export const listFindVendors = cache(async function listFindVendors(
  matchSlugs: string[],
  now = new Date(),
): Promise<FindVendor[]> {
  const [menus, vendors, stalls, markets, schedules] = await Promise.all([
    menuRows(matchSlugs),
    listVendors(),
    listStalls(),
    listMarkets(),
    listSchedules(),
  ]);
  const vendorById = new Map(vendors.map((vendor) => [vendor.id, vendor]));
  const marketById = new Map(markets.map((market) => [market.id, market]));
  const schedulesByMarket = new Map<string, MarketSchedule[]>();
  for (const row of schedules) {
    const list = schedulesByMarket.get(row.market_id) ?? [];
    list.push(row);
    schedulesByMarket.set(row.market_id, list);
  }
  const stallsByVendor = new Map<string, typeof stalls>();
  for (const stall of stalls) {
    if (!marketById.has(stall.market_id)) continue;
    const list = stallsByVendor.get(stall.id) ?? [];
    list.push(stall);
    stallsByVendor.set(stall.id, list);
  }

  const grouped = new Map<string, FindVendor>();
  for (const menu of menus) {
    const vendor = vendorById.get(menu.vendor_id);
    const vendorStalls = stallsByVendor.get(menu.vendor_id);
    if (!vendor || !vendorStalls?.length) continue;
    let group = grouped.get(vendor.id);
    if (!group) {
      const halls: VisitHall[] = [];
      const marketRows: FindMarket[] = [];
      for (const stall of vendorStalls) {
        const market = marketById.get(stall.market_id);
        if (!market) continue;
        const marketSchedules = schedulesByMarket.get(market.id) ?? [];
        halls.push({
          days: stall.days,
          province: market.province,
          schedules: marketSchedules,
        });
        marketRows.push({
          name: market.name,
          slug: market.slug,
          days: stall.days,
          hours: hallDayHours(stall.days, marketSchedules, market.province, now),
          ...reviewFields(market),
        });
      }
      marketRows.sort((a, b) => a.name.localeCompare(b.name));
      group = {
        name: vendor.name,
        slug: vendor.slug,
        ...reviewFields(vendor),
        items: [],
        markets: marketRows,
        badge: visitBadge(halls, now),
        waitDays: soonestWait(halls, now),
      };
      grouped.set(vendor.id, group);
    }
    group.items.push({
      name: menu.name,
      priceCents: visiblePriceCents(menu.product_category, menu.price_cents),
    });
  }

  return [...grouped.values()]
    .map((vendor) => {
      vendor.items.sort((a, b) => a.name.localeCompare(b.name, "en-CA"));
      return vendor;
    })
    .sort((a, b) => a.waitDays - b.waitDays || a.name.localeCompare(b.name, "en-CA"));
});

export async function searchProducts(args: {
  q: string;
  openToday?: boolean;
  marketSlug?: string | null;
  day?: number | null;
  offset?: number;
  now?: Date;
}): Promise<ProductHit[]> {
  const q = args.q.trim();
  if (!q) return [];
  const supabase = createPublicSupabaseClient();
  if (!supabase) return [];
  const now = args.now ?? new Date();
  const day = args.day != null && args.day >= 0 && args.day <= 6 ? args.day : null;
  const [{ data, error }, markets, schedules, vendors] = await Promise.all([
    supabase.rpc("search_products", {
      q,
      open_today: Boolean(args.openToday),
      market_slug: args.marketSlug?.trim() || null,
      day,
      lim: PRODUCT_PAGE,
      off: Math.max(0, args.offset ?? 0),
    }),
    listMarkets(),
    listSchedules(),
    listVendors(),
  ]);
  if (error) throw new Error("Could not search products");
  assertPublicSearchPayload(data);
  const marketBySlug = new Map(markets.map((market) => [market.slug, market]));
  const vendorBySlug = new Map(vendors.map((vendor) => [vendor.slug, vendor]));
  const schedulesByMarket = new Map<string, MarketSchedule[]>();
  for (const row of schedules) {
    const list = schedulesByMarket.get(row.market_id) ?? [];
    list.push(row);
    schedulesByMarket.set(row.market_id, list);
  }
  const rows = (data ?? []) as RpcRow[];
  const hits = rows.map((row) => {
    const markets = (row.markets ?? []).map((market) => {
      const days = asDays(market.days);
      const hall = marketBySlug.get(market.slug);
      return {
        name: market.name,
        slug: market.slug,
        days,
        hours: hall
          ? hallDayHours(days, schedulesByMarket.get(hall.id) ?? [], hall.province, now)
          : [],
        ...reviewFields(hall),
      };
    });
    const halls: VisitHall[] = markets.flatMap((market) => {
      const hall = marketBySlug.get(market.slug);
      if (!hall) return [];
      return [
        {
          days: market.days,
          province: hall.province,
          schedules: schedulesByMarket.get(hall.id) ?? [],
        },
      ];
    });
    const badge = visitBadge(halls, now);
    const openToday = badge === "Open now" || badge === "Later today";
    return {
      itemName: row.item_name,
      category: row.product_category,
      productSlug: row.product_slug,
      priceCents: visiblePriceCents(row.product_category, row.price_cents),
      vendorName: row.vendor_name,
      vendorSlug: row.vendor_slug,
      ...reviewFields(vendorBySlug.get(row.vendor_slug)),
      markets,
      openToday,
      badge,
      href: productHref(row.product_slug, row.item_name),
    };
  });
  if (!args.openToday) return hits;
  return hits.filter((hit) => hit.openToday);
}

export async function searchVendorsByName(q: string, limit = 20): Promise<VendorHit[]> {
  const needle = q.trim().toLowerCase();
  if (needle.length < 2) return [];
  const supabase = createPublicSupabaseClient();
  if (!supabase) {
    const [vendors, stalls] = await Promise.all([listVendors(), listStalls()]);
    const linked = new Set(stalls.map((stall) => stall.id));
    return vendors
      .filter((vendor) => linked.has(vendor.id) && vendor.name.toLowerCase().includes(needle))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, limit)
      .map((vendor) => ({
        name: vendor.name,
        slug: vendor.slug,
        href: `/vendors/${vendor.slug}`,
        ...reviewFields(vendor),
      }));
  }
  const pattern = `%${needle.replace(/[%_\\]/g, "\\$&")}%`;
  const { data, error } = await supabase
    .from("vendors")
    .select("id, slug, name, rating_avg, review_count")
    .eq("status", "published")
    .ilike("name", pattern)
    .order("name")
    .limit(Math.max(limit * 4, limit));
  if (error) throw new Error("Could not search vendors");
  assertPublicSearchPayload(data);
  const rows = (data ?? []) as Array<{
    id: string;
    slug: string;
    name: string;
    rating_avg: number | null;
    review_count: number | null;
  }>;
  if (!rows.length) return [];
  const { data: links, error: linkError } = await supabase
    .from("market_vendors")
    .select("vendor_id")
    .in(
      "vendor_id",
      rows.map((row) => row.id),
    );
  if (linkError) throw new Error("Could not search vendors");
  const linked = new Set((links ?? []).map((link) => link.vendor_id as string));
  return rows
    .filter((vendor) => linked.has(vendor.id))
    .slice(0, limit)
    .map((vendor) => ({
      name: vendor.name,
      slug: vendor.slug,
      href: `/vendors/${vendor.slug}`,
      ...reviewFields({
        rating_avg: vendor.rating_avg,
        review_count: vendor.review_count ?? 0,
      }),
    }));
}

export function findTitle(term: string, city: string) {
  return `${term} at ${city} farmers' markets`;
}

export function pageIsAlcohol(category: string) {
  return isAlcoholCategory(category);
}
