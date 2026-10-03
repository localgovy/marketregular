"use server";

import {
  getOpenToday,
  listMarkets,
  listSchedules,
  listStalls,
  listVendors,
} from "@/lib/data/catalog";
import { toGeoMarket } from "@/lib/geo";
import { vendorsSellingToday } from "@/lib/vendor-week";
import type { Market, MarketSchedule } from "@/types/database";
import { z } from "zod";

function schedulesByMarket(schedules: MarketSchedule[]) {
  const map = new Map<string, MarketSchedule[]>();
  for (const row of schedules) {
    const list = map.get(row.market_id) ?? [];
    list.push(row);
    map.set(row.market_id, list);
  }
  return map;
}

export async function getComposerDirectory() {
  const [markets, stalls, openNow] = await Promise.all([
    listMarkets(),
    listStalls(),
    getOpenToday(),
  ]);
  return {
    markets: markets.map(toGeoMarket),
    stalls: stalls.map((stall) => ({
      id: stall.id,
      name: stall.name,
      slug: stall.slug,
      market_id: stall.market_id,
      stall: stall.stall,
    })),
    initialMarketId: openNow[0]?.id,
  };
}

export async function getHomeMapMarkets() {
  const markets = await listMarkets();
  return markets.map((market) => ({
    id: market.id,
    name: market.name,
    slug: market.slug,
    lat: market.lat,
    lng: market.lng,
    city: market.city,
    address: market.address,
  }));
}

export type SavedRailMarket = Pick<
  Market,
  "id" | "slug" | "name" | "address" | "city" | "lat" | "lng" | "rating_avg" | "review_count"
>;

export async function getSavedRailMarkets(slugs: string[]): Promise<SavedRailMarket[]> {
  const parsed = z.array(z.string().max(160)).safeParse(slugs);
  const wanted = new Set(
    (parsed.success ? parsed.data : [])
      .filter((slug) => slug.length > 0)
      .slice(0, 80),
  );
  if (!wanted.size) return [];
  const markets = await listMarkets();
  return markets
    .filter((market) => wanted.has(market.slug))
    .map((market) => ({
      id: market.id,
      slug: market.slug,
      name: market.name,
      address: market.address,
      city: market.city,
      lat: market.lat,
      lng: market.lng,
      rating_avg: market.rating_avg,
      review_count: market.review_count,
    }));
}

export async function getVendorsTodaySlice(offset: number, limit: number, nowIso: string) {
  const start = Math.max(0, Math.floor(offset));
  const take = Math.min(20, Math.max(0, Math.floor(limit)));
  if (!take) return [];
  const clock = new Date(nowIso);
  const now = Number.isNaN(clock.getTime()) ? new Date() : clock;
  const [markets, vendors, stalls, schedules] = await Promise.all([
    listMarkets(),
    listVendors(),
    listStalls(),
    listSchedules(),
  ]);
  return vendorsSellingToday(stalls, markets, vendors, schedulesByMarket(schedules), now)
    .slice(start, start + take)
    .map((row) => ({ ...row, tags: row.tags.slice(0, 2) }));
}
