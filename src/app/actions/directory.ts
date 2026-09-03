"use server";

import { searchDirectory } from "@/lib/data/catalog";
import {
  DIRECTORY_MARKET_PAGE,
  DIRECTORY_VENDOR_PAGE,
  filtersFromSearch,
  schedulesForMarketIds,
  toDirectoryMarketCard,
  toDirectoryVendorCard,
  type DirectoryMarketCard,
  type DirectorySchedule,
  type DirectoryVendorCard,
} from "@/lib/directory-page";
import { parseDirectorySort, type MarketsSearch } from "@/lib/find-paths";

function clampOffset(offset: number) {
  if (!Number.isFinite(offset)) return 0;
  return Math.max(0, Math.min(4_000, Math.floor(offset)));
}

function sanitizeSearch(raw: MarketsSearch): MarketsSearch {
  const weekdays = (raw.weekdays ?? []).filter(
    (day) => Number.isInteger(day) && day >= 0 && day <= 6,
  );
  const lat = typeof raw.lat === "string" ? raw.lat.trim() : "";
  const lng = typeof raw.lng === "string" ? raw.lng.trim() : "";
  const hasNear =
    Number.isFinite(lat === "" ? Number.NaN : Number(lat)) &&
    Number.isFinite(lng === "" ? Number.NaN : Number(lng));
  return {
    q: raw.q?.trim() || undefined,
    weekdays: weekdays.length ? weekdays : undefined,
    tags: raw.tags?.filter((tag) => typeof tag === "string" && tag.length > 0 && tag.length < 80),
    areas: raw.areas?.filter(
      (area) => typeof area === "string" && area.length > 0 && area.length < 80,
    ),
    setup: raw.setup?.trim() || undefined,
    openNow: Boolean(raw.openNow),
    lat: lat || undefined,
    lng: lng || undefined,
    sort: parseDirectorySort(raw.sort, hasNear),
  };
}

export async function getDirectorySlice(input: {
  search: MarketsSearch;
  kind: "markets" | "vendors";
  offset: number;
  now?: string;
}): Promise<{
  markets: DirectoryMarketCard[];
  vendors: DirectoryVendorCard[];
  schedulesByMarket: Record<string, DirectorySchedule[]>;
}> {
  const kind = input.kind === "vendors" ? "vendors" : "markets";
  const offset = clampOffset(input.offset);
  const take = kind === "markets" ? DIRECTORY_MARKET_PAGE : DIRECTORY_VENDOR_PAGE;
  const clock = input.now ? new Date(input.now) : new Date();
  const now = Number.isNaN(clock.getTime()) ? new Date() : clock;
  const { markets, vendors, schedulesByMarket } = await searchDirectory(
    filtersFromSearch(sanitizeSearch(input.search)),
    now,
  );
  if (kind === "markets") {
    const slice = markets.slice(offset, offset + take).map(toDirectoryMarketCard);
    return {
      markets: slice,
      vendors: [],
      schedulesByMarket: schedulesForMarketIds(
        schedulesByMarket,
        slice.map((market) => market.id),
      ),
    };
  }
  return {
    markets: [],
    vendors: vendors.slice(offset, offset + take).map(toDirectoryVendorCard),
    schedulesByMarket: {},
  };
}
