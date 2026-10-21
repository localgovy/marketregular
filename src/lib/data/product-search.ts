import { unstable_cache } from "next/cache";
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
import { stallHall } from "@/lib/season-fold";
import { UNAFFILIATED_VENDOR_SLUGS } from "@/lib/unaffiliated-vendors";
import { FIND_PAGES } from "@/data/find-pages";
import { createServiceClient } from "@/lib/supabase/admin";
import { menuItemPhotoUrl, publishedMenuSelectMissingPhoto } from "@/lib/menu-item-photo-url";
import {
  categoriesForFindScope,
  PET_FOOD_CATEGORY,
  type FindClassifierScope,
} from "@/lib/product-categories";
import type { MarketSchedule } from "@/types/database";

export {
  BABY_CATEGORY,
  GIFTS_CATEGORY,
  FOOD_CATEGORIES,
  GOODS_CATEGORIES,
  PET_FOOD_CATEGORY,
  menuCategoryLabel,
  menuInProductSearch,
} from "@/lib/product-categories";

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
  logoUrl: string | null;
  ratingAvg: number | null;
  reviewCount: number;
  items: Array<{ name: string; priceCents: number | null; imageUrl: string | null }>;
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
  id?: string;
  name: string;
  product_category: string | null;
  product_slug: string | null;
  price_cents: number | null;
  vendor_id: string;
  image_url?: string | null;
};

export type FindPageQuery = {
  matchSlugs: readonly string[];
  matchClassifiers?: readonly string[];
  classifierScope?: FindClassifierScope;
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
  image_url?: string | null;
};

function asDays(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.filter((day): day is number => typeof day === "number");
}

/** Shared by the products page, `/api/search`, and paging. */
export const SEARCH_QUERY_MAX = 80;

export function normalizeSearchQuery(q: string) {
  return q.trim().replace(/\s+/g, " ").slice(0, SEARCH_QUERY_MAX);
}

const MENU_FIND_SELECT = "id, name, product_category, product_slug, price_cents, vendor_id";
const MENU_FIND_PHOTO_SELECT = `${MENU_FIND_SELECT}, image_url`;

type FindMenuIndex = {
  bySlug: Map<string, MenuRow[]>;
  byClassifier: Map<string, MenuRow[]>;
};

function inFindScope(
  row: MenuRow,
  scope: { categories: readonly string[]; includeNull: boolean },
) {
  if (row.product_category === PET_FOOD_CATEGORY) return false;
  if (row.product_category == null) return scope.includeNull;
  return scope.categories.includes(row.product_category);
}

/** One sequential read per worker, refreshed every 2 minutes so a seeded picture can show up. */
const FIND_MENU_INDEX_MS = 120_000;
let findMenuIndex: { at: number; promise: Promise<FindMenuIndex> } | null = null;

function loadFindMenuIndex() {
  if (findMenuIndex && Date.now() - findMenuIndex.at < FIND_MENU_INDEX_MS) return findMenuIndex.promise;
  const entry: { at: number; promise: Promise<FindMenuIndex> } = {
    at: Date.now(),
    promise: Promise.resolve({ bySlug: new Map(), byClassifier: new Map() }),
  };
  entry.promise = readFindMenuIndex().then(
    (index) => {
      if (findMenuIndex === entry) entry.at = Date.now();
      return index;
    },
    (error: unknown) => {
      if (findMenuIndex === entry) findMenuIndex = null;
      throw error;
    },
  );
  findMenuIndex = entry;
  return entry.promise;
}

type FindMenuPage = {
  data: unknown;
  error: { message?: string; code?: string } | null;
};

async function selectFindMenuPage(
  columns: { current: string },
  run: (columns: string) => PromiseLike<FindMenuPage>,
): Promise<FindMenuPage> {
  const first = await run(columns.current);
  if (!first.error || columns.current === MENU_FIND_SELECT || !publishedMenuSelectMissingPhoto(first.error)) {
    return first;
  }
  columns.current = MENU_FIND_SELECT;
  return run(MENU_FIND_SELECT);
}

async function readFindMenuIndex(): Promise<FindMenuIndex> {
  const bySlug = new Map<string, MenuRow[]>();
  const byClassifier = new Map<string, MenuRow[]>();
  const supabase = createServiceClient();
  if (!supabase) return { bySlug, byClassifier };
  const findColumns = { current: MENU_FIND_PHOTO_SELECT };

  const slugs = [...new Set(FIND_PAGES.flatMap((page) => page.matchSlugs))];
  for (let index = 0; index < slugs.length; index += 40) {
    const slice = slugs.slice(index, index + 40);
    for (let from = 0; ; from += 1000) {
      const { data, error } = await selectFindMenuPage(findColumns, (columns) =>
        supabase
          .from("published_menus")
          .select(columns)
          .in("product_slug", slice)
          .order("id")
          .range(from, from + 999),
      );
      if (error) throw new Error("Could not load this product");
      assertPublicSearchPayload(data);
      const chunk = (data ?? []) as MenuRow[];
      for (const row of chunk) {
        if (!row.product_slug) continue;
        const list = bySlug.get(row.product_slug) ?? [];
        list.push(row);
        bySlug.set(row.product_slug, list);
      }
      if (chunk.length < 1000) break;
    }
  }

  const classifiers = [...new Set(FIND_PAGES.flatMap((page) => page.matchClassifiers ?? []))];
  const idsByClassifier = new Map<string, string[]>();
  if (classifiers.length > 0) {
    const seen = new Set<string>();
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase
        .from("vendor_menu_classifier_assignments")
        .select("menu_id, classifier_slug")
        .in("classifier_slug", classifiers)
        .order("menu_id")
        .order("classifier_slug")
        .range(from, from + 999);
      if (error) throw new Error("Could not load this product");
      const chunk = data ?? [];
      for (const row of chunk) {
        const menuId = row.menu_id as string;
        const classifier = row.classifier_slug as string;
        const list = idsByClassifier.get(classifier) ?? [];
        list.push(menuId);
        idsByClassifier.set(classifier, list);
        seen.add(menuId);
      }
      if (chunk.length < 1000) break;
    }
    const ids = [...seen];
    const byId = new Map<string, MenuRow>();
    for (let index = 0; index < ids.length; index += 80) {
      const slice = ids.slice(index, index + 80);
      const { data, error } = await selectFindMenuPage(findColumns, (columns) =>
        supabase.from("published_menus").select(columns).in("id", slice),
      );
      if (error) throw new Error("Could not load this product");
      assertPublicSearchPayload(data);
      for (const row of (data ?? []) as MenuRow[]) {
        if (row.id) byId.set(row.id, row);
      }
    }
    for (const [classifier, menuIds] of idsByClassifier) {
      byClassifier.set(
        classifier,
        menuIds.flatMap((id) => {
          const row = byId.get(id);
          return row ? [row] : [];
        }),
      );
    }
  }

  return { bySlug, byClassifier };
}

function dedupeMenus(rows: MenuRow[]) {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = row.id ?? `${row.vendor_id}\0${row.name}\0${row.product_slug ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export const listFindVendors = cache(async function listFindVendors(
  page: FindPageQuery,
  now = new Date(),
): Promise<FindVendor[]> {
  const scope = categoriesForFindScope(page.classifierScope);
  const index = await loadFindMenuIndex();
  const [vendors, stalls, markets, schedules] = await Promise.all([
    listVendors(),
    listStalls(),
    listMarkets(),
    listSchedules(),
  ]);
  const menus = dedupeMenus([
    ...page.matchSlugs.flatMap((slug) => index.bySlug.get(slug) ?? []),
    ...(page.matchClassifiers ?? []).flatMap((classifier) => index.byClassifier.get(classifier) ?? []),
  ]).filter((row) => inFindScope(row, scope));
  const vendorById = new Map(vendors.map((vendor) => [vendor.id, vendor]));
  const schedulesByMarket = new Map<string, MarketSchedule[]>();
  for (const row of schedules) {
    const list = schedulesByMarket.get(row.market_id) ?? [];
    list.push(row);
    schedulesByMarket.set(row.market_id, list);
  }
  const stallsByVendor = new Map<string, typeof stalls>();
  for (const stall of stalls) {
    if (!stallHall(markets, schedulesByMarket, stall.market_id)) continue;
    const list = stallsByVendor.get(stall.id) ?? [];
    list.push(stall);
    stallsByVendor.set(stall.id, list);
  }

  const grouped = new Map<string, FindVendor>();
  for (const menu of menus) {
    if (menu.product_category === PET_FOOD_CATEGORY) continue;
    const vendor = vendorById.get(menu.vendor_id);
    const vendorStalls = stallsByVendor.get(menu.vendor_id);
    if (!vendor || !vendorStalls?.length) continue;
    let group = grouped.get(vendor.id);
    if (!group) {
      const halls: VisitHall[] = [];
      const marketRows: FindMarket[] = [];
      for (const stall of vendorStalls) {
        const hall = stallHall(markets, schedulesByMarket, stall.market_id);
        if (!hall) continue;
        const market = hall.market;
        const marketSchedules = hall.rows;
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
        logoUrl: vendor.logo_url,
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
      imageUrl: menuItemPhotoUrl(menu.image_url, menu.id),
    });
  }

  return [...grouped.values()]
    .map((vendor) => {
      vendor.items.sort((a, b) => a.name.localeCompare(b.name, "en-CA"));
      return vendor;
    })
    .sort((a, b) => a.waitDays - b.waitDays || a.name.localeCompare(b.name, "en-CA"));
});

const loadCachedSearchRows = unstable_cache(
  async (
    q: string,
    openToday: boolean,
    marketSlug: string,
    day: number,
    offset: number,
  ): Promise<RpcRow[]> => {
    const supabase = createServiceClient();
    if (!supabase) return [];
    const { data, error } = await supabase.rpc("search_products", {
      q,
      open_today: openToday,
      market_slug: marketSlug || null,
      day: day >= 0 && day <= 6 ? day : null,
      lim: PRODUCT_PAGE,
      off: offset,
    });
    if (error) throw new Error("Could not search products");
    assertPublicSearchPayload(data);
    return (data ?? []) as RpcRow[];
  },
  ["search-products-v5"],
  { revalidate: 60 },
);

export async function searchProducts(args: {
  q: string;
  openToday?: boolean;
  marketSlug?: string | null;
  day?: number | null;
  offset?: number;
  now?: Date;
}): Promise<ProductHit[]> {
  const q = normalizeSearchQuery(args.q);
  if (!q) return [];
  const now = args.now ?? new Date();
  const day = args.day != null && args.day >= 0 && args.day <= 6 ? args.day : -1;
  const marketSlug = args.marketSlug?.trim().slice(0, 160) ?? "";
  const rawOffset = args.offset ?? 0;
  const offset = Number.isFinite(rawOffset)
    ? Math.max(0, Math.min(Math.trunc(rawOffset), 4000))
    : 0;
  const openToday = Boolean(args.openToday);
  const [data, markets, schedules, vendors] = await Promise.all([
    loadCachedSearchRows(q, openToday, marketSlug, day, offset),
    listMarkets(),
    listSchedules(),
    listVendors(),
  ]);
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
    const vendor = vendorBySlug.get(row.vendor_slug);
    return {
      itemName: row.item_name,
      category: row.product_category,
      productSlug: row.product_slug,
      priceCents: visiblePriceCents(row.product_category, row.price_cents),
      vendorName: row.vendor_name,
      vendorSlug: row.vendor_slug,
      logoUrl: vendor?.logo_url ?? null,
      ...reviewFields(vendor),
      markets,
      openToday,
      badge,
      href: productHref(row.product_slug, row.item_name),
      imageUrl: menuItemPhotoUrl(row.image_url),
    };
  });
  if (!args.openToday) return hits;
  return hits.filter((hit) => hit.openToday);
}

type NamedVendor = {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  rating_avg: number | null;
  review_count: number | null;
};

function namedVendorHit(vendor: NamedVendor): VendorHit {
  return {
    name: vendor.name,
    slug: vendor.slug,
    href: `/vendors/${vendor.slug}`,
    logoUrl: vendor.logo_url,
    ...reviewFields({
      rating_avg: vendor.rating_avg,
      review_count: vendor.review_count ?? 0,
    }),
  };
}

function vendorStaysInSearch(vendor: { id: string; slug: string }, linked: Set<string>) {
  return linked.has(vendor.id) || UNAFFILIATED_VENDOR_SLUGS.has(vendor.slug);
}

export async function searchVendorsByName(q: string, limit = 20): Promise<VendorHit[]> {
  const needle = normalizeSearchQuery(q).toLowerCase();
  if (needle.length < 2) return [];
  const supabase = createServiceClient();
  if (!supabase) {
    const [vendors, stalls] = await Promise.all([listVendors(), listStalls()]);
    const linked = new Set(stalls.map((stall) => stall.id));
    return vendors
      .filter(
        (vendor) => vendorStaysInSearch(vendor, linked) && vendor.name.toLowerCase().includes(needle),
      )
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, limit)
      .map((vendor) => namedVendorHit(vendor));
  }
  const pattern = `%${needle.replace(/[%_\\]/g, "\\$&")}%`;
  const page = Math.max(limit * 4, limit);
  const matches: VendorHit[] = [];
  for (let from = 0; matches.length < limit && from < 4000; from += page) {
    const { data, error } = await supabase
      .from("published_vendors")
      .select("id, slug, name, logo_url, rating_avg, review_count")
      .eq("status", "published")
      .ilike("name", pattern)
      .order("name")
      .range(from, from + page - 1);
    if (error) throw new Error("Could not search vendors");
    assertPublicSearchPayload(data);
    const rows = (data ?? []) as NamedVendor[];
    if (!rows.length) break;
    const { data: links, error: linkError } = await supabase
      .from("published_stalls")
      .select("vendor_id")
      .in(
        "vendor_id",
        rows.map((row) => row.id),
      );
    if (linkError) throw new Error("Could not search vendors");
    const linked = new Set((links ?? []).map((link) => link.vendor_id as string));
    for (const vendor of rows) {
      if (!vendorStaysInSearch(vendor, linked)) continue;
      matches.push(namedVendorHit(vendor));
      if (matches.length >= limit) break;
    }
    if (rows.length < page) break;
  }
  return matches;
}

export function findTitle(term: string, city: string) {
  return `${term} at ${city} farmers' markets`;
}

export function pageIsAlcohol(category: string) {
  return isAlcoholCategory(category);
}
