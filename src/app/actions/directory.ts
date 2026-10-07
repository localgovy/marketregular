"use server";

import { searchDirectory } from "@/lib/data/catalog";
import { takeCatalogSlot } from "@/lib/mail-limit";
import {
  DIRECTORY_MARKET_PAGE,
  DIRECTORY_VENDOR_PAGE,
  directoryVendorCards,
  filtersFromSearch,
  nextDirectoryPage,
  schedulesForMarketIds,
  toDirectoryMarketCard,
  type DirectoryMarketCard,
  type DirectorySchedule,
  type DirectoryVendorCard,
} from "@/lib/directory-page";
import { parseDirectorySort, type MarketsSearch } from "@/lib/find-paths";
import { z } from "zod";

const seenSchema = z.array(z.string().trim().min(1).max(80)).max(4_000);

const searchSchema = z.object({
  q: z.string().max(200).optional(),
  weekdays: z.array(z.number()).max(7).optional(),
  tags: z.array(z.string().max(80)).max(24).optional(),
  areas: z.array(z.string().max(80)).max(24).optional(),
  setup: z.string().max(40).optional(),
  openNow: z.boolean().optional(),
  lat: z.string().max(32).optional(),
  lng: z.string().max(32).optional(),
  sort: z.string().max(20).optional(),
});

function sanitizeSearch(raw: unknown): MarketsSearch {
  const parsed = searchSchema.safeParse(raw);
  if (!parsed.success) return {};
  const search = parsed.data;
  const weekdays = (search.weekdays ?? []).filter(
    (day) => Number.isInteger(day) && day >= 0 && day <= 6,
  );
  const lat = search.lat?.trim() ?? "";
  const lng = search.lng?.trim() ?? "";
  const hasNear = Number.isFinite(Number(lat)) && Number.isFinite(Number(lng)) && lat !== "" && lng !== "";
  return {
    q: search.q?.trim().slice(0, 80) || undefined,
    weekdays: weekdays.length ? weekdays : undefined,
    tags: search.tags?.filter((tag) => tag.length > 0),
    areas: search.areas?.filter((area) => area.length > 0),
    setup: search.setup?.trim() || undefined,
    openNow: Boolean(search.openNow),
    lat: lat || undefined,
    lng: lng || undefined,
    sort: parseDirectorySort(search.sort, hasNear),
  };
}

export async function getDirectorySlice(input: {
  search: MarketsSearch;
  kind: "markets" | "vendors";
  seen: string[];
  now?: string;
}): Promise<{
  markets: DirectoryMarketCard[];
  vendors: DirectoryVendorCard[];
  schedulesByMarket: Record<string, DirectorySchedule[]>;
  done: boolean;
}> {
  const parsed = z
    .object({
      search: z.unknown().optional(),
      kind: z.enum(["markets", "vendors"]).optional(),
      seen: seenSchema.optional(),
      now: z.string().max(40).optional(),
    })
    .safeParse(input);
  if (!parsed.success) {
    throw new Error("Couldn't load more.");
  }
  if (!(await takeCatalogSlot())) {
    throw new Error("Couldn't load more.");
  }
  const kind = parsed.data.kind === "vendors" ? "vendors" : "markets";
  const seen = new Set(parsed.data.seen ?? []);
  const take = kind === "markets" ? DIRECTORY_MARKET_PAGE : DIRECTORY_VENDOR_PAGE;
  const clock = parsed.data.now ? new Date(parsed.data.now) : new Date();
  const now = Number.isNaN(clock.getTime()) ? new Date() : clock;
  const { markets, vendors, schedulesByMarket, halls } = await searchDirectory(
    filtersFromSearch(sanitizeSearch(parsed.data.search)),
    now,
  );
  if (kind === "markets") {
    const { page, done } = nextDirectoryPage(markets, seen, take);
    const slice = page.map(toDirectoryMarketCard);
    return {
      markets: slice,
      vendors: [],
      schedulesByMarket: schedulesForMarketIds(
        schedulesByMarket,
        slice.map((market) => market.id),
      ),
      done,
    };
  }
  const { page, done } = nextDirectoryPage(vendors, seen, take);
  return {
    markets: [],
    vendors: directoryVendorCards(page, halls, 0, page.length),
    schedulesByMarket: {},
    done,
  };
}

export async function suggestListings(q: string) {
  const query = q.trim().slice(0, 80);
  if (query.length < 2) return { markets: [] as { href: string; name: string }[], vendors: [] as { href: string; name: string }[] };
  if (!(await takeCatalogSlot())) {
    return { markets: [], vendors: [] };
  }
  const { markets, vendors } = await searchDirectory({ q: query }, new Date());
  const needle = query.toLowerCase();
  const named = vendors.filter((vendor) => vendor.name.toLowerCase().includes(needle));
  return {
    markets: markets.slice(0, 6).map((market) => ({
      href: `/markets/${market.slug}`,
      name: market.name,
    })),
    vendors: named.slice(0, 6).map((vendor) => ({
      href: `/vendors/${vendor.slug}`,
      name: vendor.name,
    })),
  };
}
