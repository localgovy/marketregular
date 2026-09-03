import { parseDirectorySort, type MarketsSearch } from "@/lib/find-paths";
import type { DirectoryVendor } from "@/lib/vendor-halls";
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

export function directoryInitialProps(
  markets: Market[],
  vendors: DirectoryVendor[],
  schedulesByMarket: Record<string, MarketSchedule[]>,
) {
  const marketSlice = markets.slice(0, DIRECTORY_MARKET_PAGE).map(toDirectoryMarketCard);
  return {
    markets: marketSlice,
    vendors: vendors.slice(0, DIRECTORY_VENDOR_PAGE).map(toDirectoryVendorCard),
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
    logo_url: market.logo_url,
    rating_avg: market.rating_avg,
    review_count: market.review_count,
    tags: market.tags,
  };
}

export function toDirectoryVendorCard(vendor: DirectoryVendor): DirectoryVendorCard {
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
