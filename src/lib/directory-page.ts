import { parseDirectorySort, type MarketsSearch } from "@/lib/find-paths";
import { withVendorHalls } from "@/lib/vendor-halls";
import type { Market, MarketSchedule, SearchFilters, Vendor, VendorHall } from "@/types/database";

export const DIRECTORY_MARKET_PAGE = 10;
export const DIRECTORY_VENDOR_PAGE = 15;

export type MapMarket = Pick<
  Market,
  "id" | "name" | "slug" | "lat" | "lng" | "city" | "address"
>;

export type DirectoryMarketCard = Pick<
  Market,
  | "id"
  | "slug"
  | "name"
  | "about"
  | "address"
  | "city"
  | "province"
  | "lat"
  | "lng"
  | "logo_url"
  | "rating_avg"
  | "review_count"
  | "tags"
>;

export type DirectoryVendorCard = Pick<
  Vendor,
  "id" | "slug" | "name" | "about" | "logo_url" | "rating_avg" | "review_count" | "tags"
> & { halls: VendorHall[] };

export type DirectorySchedule = Pick<
  MarketSchedule,
  "id" | "market_id" | "weekday" | "opens_at" | "closes_at" | "season_start" | "season_end"
>;

export function filtersFromSearch(search: MarketsSearch): SearchFilters {
  const lat = search.lat === undefined || search.lat === "" ? Number.NaN : Number(search.lat);
  const lng = search.lng === undefined || search.lng === "" ? Number.NaN : Number(search.lng);
  const near = Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : undefined;
  return {
    q: search.q?.trim() || undefined,
    weekdays: search.weekdays?.length ? search.weekdays : undefined,
    tags: search.tags?.length ? search.tags : undefined,
    areas: search.areas?.length ? search.areas : undefined,
    setup: search.setup || undefined,
    openNow: search.openNow || undefined,
    near,
    sort: parseDirectorySort(search.sort, Boolean(near)),
  };
}

/**
 * Next page of a directory list.
 *
 * Callers must not slice by how many rows are already on screen. The bare
 * /markets page is ordered once and cached; a later read sorts again. Those
 * two orders diverge as markets open and close, so an offset page can be
 * entirely rows the visitor already has, and the button never advances.
 */
export function nextDirectoryPage<T extends { id: string }>(
  rows: readonly T[],
  seen: ReadonlySet<string>,
  take: number,
): { page: T[]; done: boolean } {
  const page: T[] = [];
  if (take <= 0) return { page, done: true };
  for (const row of rows) {
    if (seen.has(row.id)) continue;
    if (page.length === take) return { page, done: false };
    page.push(row);
  }
  return { page, done: true };
}

export function directoryVendorCards(
  vendors: Vendor[],
  halls: Map<string, VendorHall[]>,
  offset = 0,
  take = DIRECTORY_VENDOR_PAGE,
) {
  return withVendorHalls(vendors.slice(offset, offset + take), halls).map(toDirectoryVendorCard);
}

export function directoryInitialProps(
  markets: Market[],
  vendors: Vendor[],
  schedulesByMarket: Record<string, MarketSchedule[]>,
  halls: Map<string, VendorHall[]>,
) {
  const marketSlice = markets.slice(0, DIRECTORY_MARKET_PAGE).map(toDirectoryMarketCard);
  return {
    markets: marketSlice,
    vendors: directoryVendorCards(vendors, halls),
    schedulesByMarket: schedulesForMarketIds(
      schedulesByMarket,
      marketSlice.map((market) => market.id),
    ),
    marketTotal: markets.length,
    vendorTotal: vendors.length,
    mapMarkets: markets.map(toMapMarket),
  };
}

export function toDirectoryMarketCard(market: Market): DirectoryMarketCard {
  return {
    id: market.id,
    slug: market.slug,
    name: market.name,
    about: market.about,
    address: market.address,
    city: market.city,
    province: market.province,
    lat: market.lat,
    lng: market.lng,
    logo_url: market.logo_url,
    rating_avg: market.rating_avg,
    review_count: market.review_count,
    tags: market.tags,
  };
}

export function toDirectoryVendorCard(vendor: Vendor & { halls: VendorHall[] }): DirectoryVendorCard {
  return {
    id: vendor.id,
    slug: vendor.slug,
    name: vendor.name,
    about: vendor.about,
    logo_url: vendor.logo_url,
    rating_avg: vendor.rating_avg,
    review_count: vendor.review_count,
    tags: vendor.tags,
    halls: vendor.halls,
  };
}

export function toMapMarket(market: Market): MapMarket {
  return {
    id: market.id,
    name: market.name,
    slug: market.slug,
    lat: market.lat,
    lng: market.lng,
    city: market.city,
    address: market.address,
  };
}

export function schedulesForMarketIds(
  schedulesByMarket: Record<string, MarketSchedule[]>,
  ids: string[],
): Record<string, DirectorySchedule[]> {
  const out: Record<string, DirectorySchedule[]> = {};
  for (const id of ids) {
    const rows = schedulesByMarket[id];
    if (!rows?.length) continue;
    out[id] = rows.map((row) => ({
      id: row.id,
      market_id: row.market_id,
      weekday: row.weekday,
      opens_at: row.opens_at,
      closes_at: row.closes_at,
      season_start: row.season_start,
      season_end: row.season_end,
    }));
  }
  return out;
}
