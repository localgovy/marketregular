import { unstable_cache } from "next/cache";
import { DIRECTORY_DATA_REVALIDATE_SECONDS, DIRECTORY_TAG } from "@/lib/directory-cache";
import { cache } from "react";
import { listMarkets, listSchedules, listStalls, listVendors } from "@/lib/data/catalog";
import { requireBuildSnapshot } from "@/lib/data/build-snapshot";
import {
  FIND_MENU_PAGE,
  FIND_MENU_PAGE_CAP,
  FIND_SLUG_SLICE,
} from "@/lib/data/snapshot-select";
import {
  assertPublicSearchPayload,
  isAlcoholCategory,
  MAX_PRODUCT_SEARCH_OFFSET,
  MIN_PRODUCT_SEARCH_CHARS,
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
import { isInjectionProbe } from "@/lib/injection-probe";
import { foldSearchText } from "@/lib/search-text";
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
export { MAX_PRODUCT_SEARCH_OFFSET, MIN_PRODUCT_SEARCH_CHARS } from "@/lib/product-hits";

export type FindMarket = {
  name: string;
  slug: string;
  days: number[];
  hours: Array<{ day: string; hours: string }>;
  ratingAvg: number | null;
  reviewCount: number;
  logoUrl?: string | null;
  stall?: string | null;
};

export type FindVendor = {
  name: string;
  slug: string;
  logoUrl: string | null;
  ratingAvg: number | null;
  reviewCount: number;
  items: Array<{ id?: string; name: string; priceCents: number | null; imageUrl: string | null }>;
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

/** Shared by the products page and paging. */
export const SEARCH_QUERY_MAX = 80;

export function normalizeSearchQuery(q: string) {
  return q.trim().replace(/\s+/g, " ").slice(0, SEARCH_QUERY_MAX);
}

const MENU_FIND_SELECT = "id, name, product_category, product_slug, price_cents, vendor_id";
const MENU_FIND_PHOTO_SELECT = `${MENU_FIND_SELECT}, image_url`;

function inFindScope(
  row: MenuRow,
  scope: { categories: readonly string[]; includeNull: boolean },
) {
  if (row.product_category === PET_FOOD_CATEGORY) return false;
  if (row.product_category == null) return scope.includeNull;
  return scope.categories.includes(row.product_category);
}

/**
 * One product page, not the whole catalogue.
 * A shared index of every find slug kept each render running until the
 * function was killed, so the page cache never stored.
 */
const FIND_MENU_TTL_MS = 120_000;
const FIND_MENU_MEMORY_CAP = 48;

const loadCachedFindMenus = unstable_cache(
  async (slugKey: string, classifierKey: string): Promise<MenuRow[]> => {
    return readFindMenus(
      slugKey ? slugKey.split("\n") : [],
      classifierKey ? classifierKey.split("\n") : [],
    );
  },
  ["find-page-menus-v2"],
  { revalidate: DIRECTORY_DATA_REVALIDATE_SECONDS, tags: [DIRECTORY_TAG] },
);

const findMenuMemory = new Map<string, { at: number; rows: MenuRow[] }>();

function rememberFindMenus(key: string, rows: MenuRow[]) {
  findMenuMemory.set(key, { at: Date.now(), rows });
  if (findMenuMemory.size <= FIND_MENU_MEMORY_CAP) return;
  let oldestKey = "";
  let oldestAt = Infinity;
  for (const [entryKey, entry] of findMenuMemory) {
    if (entry.at < oldestAt) {
      oldestAt = entry.at;
      oldestKey = entryKey;
    }
  }
  if (oldestKey) findMenuMemory.delete(oldestKey);
}

async function loadFindMenus(page: FindPageQuery): Promise<MenuRow[]> {
  const slugs = [...new Set(page.matchSlugs)].filter(Boolean).sort();
  const classifiers = [...new Set(page.matchClassifiers ?? [])].filter(Boolean).sort();
  if (!slugs.length && !classifiers.length) return [];
  const slugKey = slugs.join("\n");
  const classifierKey = classifiers.join("\n");
  const memoryKey = `${slugKey}\0${classifierKey}`;
  const hit = findMenuMemory.get(memoryKey);
  if (hit && Date.now() - hit.at < FIND_MENU_TTL_MS) return hit.rows;
  const snap = await requireBuildSnapshot();
  if (snap) {
    const rows = snap.findMenus(slugs, classifiers) as MenuRow[];
    rememberFindMenus(memoryKey, rows);
    return rows;
  }
  const rows = await loadCachedFindMenus(slugKey, classifierKey);
  rememberFindMenus(memoryKey, rows);
  return rows;
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

function pageHead(row: { id?: string; menu_id?: string; classifier_slug?: string } | undefined) {
  if (!row) return "";
  return `${row.id ?? row.menu_id ?? ""}\0${row.classifier_slug ?? ""}`;
}

async function readFindMenus(slugs: string[], classifiers: string[]): Promise<MenuRow[]> {
  const supabase = createServiceClient();
  if (!supabase) return [];
  const findColumns = { current: MENU_FIND_PHOTO_SELECT };
  const rows: MenuRow[] = [];

  for (let index = 0; index < slugs.length; index += FIND_SLUG_SLICE) {
    const slice = slugs.slice(index, index + FIND_SLUG_SLICE);
    let previousHead = "";
    for (let page = 0; page < FIND_MENU_PAGE_CAP; page++) {
      const from = page * FIND_MENU_PAGE;
      const { data, error } = await selectFindMenuPage(findColumns, (columns) =>
        supabase
          .from("published_menus")
          .select(columns)
          .in("product_slug", slice)
          .order("id")
          .range(from, from + FIND_MENU_PAGE - 1),
      );
      if (error) throw new Error("Could not load this product");
      assertPublicSearchPayload(data);
      const chunk = (data ?? []) as MenuRow[];
      const head = chunk[0]?.id ?? "";
      if (page > 0 && head && head === previousHead) break;
      previousHead = head;
      for (const row of chunk) {
        if (row.product_slug) rows.push(row);
      }
      if (chunk.length < FIND_MENU_PAGE) break;
    }
  }

  if (!classifiers.length) return rows;
  const ids: string[] = [];
  const seen = new Set<string>();
  let previousHead = "";
  for (let page = 0; page < FIND_MENU_PAGE_CAP; page++) {
    const from = page * FIND_MENU_PAGE;
    const { data, error } = await supabase
      .from("vendor_menu_classifier_assignments")
      .select("menu_id, classifier_slug")
      .in("classifier_slug", classifiers)
      .order("menu_id")
      .order("classifier_slug")
      .range(from, from + FIND_MENU_PAGE - 1);
    if (error) throw new Error("Could not load this product");
    const chunk = data ?? [];
    const head = pageHead(chunk[0] as { menu_id?: string; classifier_slug?: string } | undefined);
    if (page > 0 && head && head === previousHead) break;
    previousHead = head;
    for (const row of chunk) {
      const menuId = row.menu_id as string;
      if (!menuId || seen.has(menuId)) continue;
      seen.add(menuId);
      ids.push(menuId);
    }
    if (chunk.length < FIND_MENU_PAGE) break;
  }

  for (let index = 0; index < ids.length; index += 80) {
    const slice = ids.slice(index, index + 80);
    const { data, error } = await selectFindMenuPage(findColumns, (columns) =>
      supabase.from("published_menus").select(columns).in("id", slice),
    );
    if (error) throw new Error("Could not load this product");
    assertPublicSearchPayload(data);
    for (const row of (data ?? []) as MenuRow[]) {
      if (row.id) rows.push(row);
    }
  }
  return rows;
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
  const [menuRows, vendors, stalls, markets, schedules] = await Promise.all([
    loadFindMenus(page),
    listVendors(),
    listStalls(),
    listMarkets(),
    listSchedules(),
  ]);
  const menus = dedupeMenus(menuRows).filter((row) => inFindScope(row, scope));
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
          logoUrl: market.logo_url,
          stall: stall.stall,
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
      id: menu.id,
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

const SEARCH_MEMORY_TTL_MS = 60_000;
const SEARCH_MEMORY_CAP = 64;

const searchRowMemory = new Map<string, { at: number; rows: RpcRow[] }>();
const vendorSearchMemory = new Map<string, { at: number; rows: VendorHit[] }>();

function rememberMapEntry<T>(
  map: Map<string, { at: number; rows: T }>,
  key: string,
  rows: T,
) {
  map.set(key, { at: Date.now(), rows });
  if (map.size <= SEARCH_MEMORY_CAP) return;
  const oldestKey = map.keys().next().value;
  if (oldestKey !== undefined) map.delete(oldestKey);
}

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
    const { data, error } = await supabase
      .rpc("search_products", {
        q,
        open_today: openToday,
        market_slug: marketSlug || null,
        day: day >= 0 && day <= 6 ? day : null,
        lim: PRODUCT_PAGE,
        off: offset,
      })
      .abortSignal(AbortSignal.timeout(8000));
    if (error) {
      const message = error.message ?? "";
      if (error.code === "20" || /abort|timeout/i.test(message)) {
        const timeout = new Error("search timed out");
        timeout.name = "SearchTimeout";
        throw timeout;
      }
      throw new Error("Could not search products");
    }
    assertPublicSearchPayload(data);
    return (data ?? []) as RpcRow[];
  },
  ["search-products-v7"],
  { revalidate: 60 },
);

async function readSearchRows(
  q: string,
  openToday: boolean,
  marketSlug: string,
  day: number,
  offset: number,
): Promise<RpcRow[]> {
  const key = `${q}\0${openToday ? 1 : 0}\0${marketSlug}\0${day}\0${offset}`;
  const hit = searchRowMemory.get(key);
  if (hit && Date.now() - hit.at < SEARCH_MEMORY_TTL_MS) return hit.rows;
  const rows = await loadCachedSearchRows(q, openToday, marketSlug, day, offset);
  rememberMapEntry(searchRowMemory, key, rows);
  return rows;
}

export async function searchProducts(args: {
  q: string;
  openToday?: boolean;
  marketSlug?: string | null;
  day?: number | null;
  offset?: number;
  now?: Date;
}): Promise<ProductHit[]> {
  const q = normalizeSearchQuery(args.q);
  const marketSlug = args.marketSlug?.trim().slice(0, 160) ?? "";
  if (
    isInjectionProbe(args.q) ||
    isInjectionProbe(q) ||
    isInjectionProbe(args.marketSlug) ||
    isInjectionProbe(marketSlug)
  ) {
    return [];
  }
  if (foldSearchText(q).length < MIN_PRODUCT_SEARCH_CHARS) return [];
  const now = args.now ?? new Date();
  const day = args.day != null && args.day >= 0 && args.day <= 6 ? args.day : -1;
  const rawOffset = args.offset ?? 0;
  const offset = Number.isFinite(rawOffset)
    ? Math.max(0, Math.min(Math.trunc(rawOffset), MAX_PRODUCT_SEARCH_OFFSET))
    : 0;
  const openToday = Boolean(args.openToday);
  let data: RpcRow[] = [];
  let markets: Awaited<ReturnType<typeof listMarkets>> = [];
  let schedules: Awaited<ReturnType<typeof listSchedules>> = [];
  let vendors: Awaited<ReturnType<typeof listVendors>> = [];
  try {
    [data, markets, schedules, vendors] = await Promise.all([
      readSearchRows(q, openToday, marketSlug, day, offset),
      listMarkets(),
      listSchedules(),
      listVendors(),
    ]);
  } catch (error) {
    const timedOut =
      error instanceof Error &&
      (error.name === "SearchTimeout" || error.name === "AbortError" || /timed out|abort/i.test(error.message));
    if (!timedOut) throw error;
    return [];
  }
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
        logoUrl: hall?.logo_url ?? null,
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

const VENDOR_NAME_COLUMNS = "id, slug, name, logo_url, rating_avg, review_count";

function throwIfAborted(error: { code?: string; message?: string }) {
  const message = error.message ?? "";
  if (error.code === "20" || /abort|timeout/i.test(message)) {
    const timeout = new Error("vendor search timed out");
    timeout.name = "SearchTimeout";
    throw timeout;
  }
  throw new Error("Could not search vendors");
}

const loadCachedVendorsByName = unstable_cache(
  async (needle: string, limit: number): Promise<VendorHit[]> => {
    const supabase = createServiceClient();
    if (!supabase) {
      const [vendors, stalls] = await Promise.all([listVendors(), listStalls()]);
      const linked = new Set(stalls.map((stall) => stall.id));
      return vendors
        .filter(
          (vendor) => vendorStaysInSearch(vendor, linked) && foldSearchText(vendor.name).includes(needle),
        )
        .sort((a, b) => a.name.localeCompare(b.name))
        .slice(0, limit)
        .map((vendor) => namedVendorHit(vendor));
    }
    // Phrase ilike stays on the name trigram index. A slash between the words
    // ("Author/Illustrator") is not a phrase hit, so those few names are read
    // beside it and folded in memory.
    const pattern = `%${needle.replace(/[%_\\]/g, "\\$&")}%`;
    const page = Math.max(limit * 4, limit);
    const matches: NamedVendor[] = [];
    const seen = new Set<string>();
    const slashNames = needle.includes(" ")
      ? supabase
          .from("published_vendors")
          .select(VENDOR_NAME_COLUMNS)
          .eq("status", "published")
          .like("name", "%/%")
          .limit(100)
          .abortSignal(AbortSignal.timeout(8000))
          .then((result) => result)
      : null;
    for (let from = 0; matches.length < limit && from < 1000; from += page) {
      const { data, error } = await supabase
        .from("published_vendors")
        .select(VENDOR_NAME_COLUMNS)
        .eq("status", "published")
        .ilike("name", pattern)
        .order("name")
        .range(from, from + page - 1)
        .abortSignal(AbortSignal.timeout(8000));
      if (error) throwIfAborted(error);
      assertPublicSearchPayload(data);
      const rows = (data ?? []) as NamedVendor[];
      if (!rows.length) break;
      const { data: links, error: linkError } = await supabase
        .from("published_stalls")
        .select("vendor_id")
        .in(
          "vendor_id",
          rows.map((row) => row.id),
        )
        .abortSignal(AbortSignal.timeout(8000));
      if (linkError) throwIfAborted(linkError);
      const linked = new Set((links ?? []).map((link) => link.vendor_id as string));
      for (const vendor of rows) {
        if (seen.has(vendor.id) || !vendorStaysInSearch(vendor, linked)) continue;
        seen.add(vendor.id);
        matches.push(vendor);
        if (matches.length >= limit) break;
      }
      if (rows.length < page) break;
    }
    if (slashNames) {
      const { data, error } = await slashNames;
      if (error) throwIfAborted(error);
      assertPublicSearchPayload(data);
      const extra = ((data ?? []) as NamedVendor[]).filter(
        (vendor) => !seen.has(vendor.id) && foldSearchText(vendor.name).includes(needle),
      );
      if (extra.length) {
        const { data: links, error: linkError } = await supabase
          .from("published_stalls")
          .select("vendor_id")
          .in(
            "vendor_id",
            extra.map((vendor) => vendor.id),
          )
          .abortSignal(AbortSignal.timeout(8000));
        if (linkError) throwIfAborted(linkError);
        const linked = new Set((links ?? []).map((link) => link.vendor_id as string));
        let added = false;
        for (const vendor of extra) {
          if (seen.has(vendor.id) || !vendorStaysInSearch(vendor, linked)) continue;
          seen.add(vendor.id);
          matches.push(vendor);
          added = true;
        }
        if (added) matches.sort((a, b) => a.name.localeCompare(b.name));
      }
    }
    return matches.slice(0, limit).map((vendor) => namedVendorHit(vendor));
  },
  ["search-vendors-v1"],
  { revalidate: 60, tags: [DIRECTORY_TAG] },
);

export async function searchVendorsByName(q: string, limit = 20): Promise<VendorHit[]> {
  const normalized = normalizeSearchQuery(q);
  if (isInjectionProbe(q) || isInjectionProbe(normalized)) return [];
  const needle = foldSearchText(normalized);
  if (needle.length < MIN_PRODUCT_SEARCH_CHARS) return [];
  const cappedLimit = Math.max(1, Math.min(Math.trunc(limit), 20));
  const key = `${needle}\0${cappedLimit}`;
  const hit = vendorSearchMemory.get(key);
  if (hit && Date.now() - hit.at < SEARCH_MEMORY_TTL_MS) return hit.rows;
  try {
    const rows = await loadCachedVendorsByName(needle, cappedLimit);
    rememberMapEntry(vendorSearchMemory, key, rows);
    return rows;
  } catch (error) {
    const timedOut =
      error instanceof Error &&
      (error.name === "SearchTimeout" || error.name === "AbortError" || /timed out|abort/i.test(error.message));
    if (!timedOut) throw error;
    return [];
  }
}

export function findTitle(term: string, city: string) {
  return `${term} at ${city} farmers' markets`;
}

export function pageIsAlcohol(category: string) {
  return isAlcoholCategory(category);
}
