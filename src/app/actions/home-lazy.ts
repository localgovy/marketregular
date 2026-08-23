"use server";

import {
  listMarkets,
  listSchedules,
  listStalls,
  listVendors,
} from "@/lib/data/catalog";
import { toGeoMarket } from "@/lib/geo";
import { TODAY_STALL_CAP, vendorsSellingToday } from "@/lib/vendor-week";

function scheduleMap(
  schedules: Awaited<ReturnType<typeof listSchedules>>,
) {
  const map = new Map<string, typeof schedules>();
  for (const row of schedules) {
    const list = map.get(row.market_id) ?? [];
    list.push(row);
    map.set(row.market_id, list);
  }
  return map;
}

export async function getComposerDirectory() {
  const [markets, stalls] = await Promise.all([listMarkets(), listStalls()]);
  return {
    markets: markets.map(toGeoMarket),
    stalls: stalls.map((stall) => ({
      id: stall.id,
      name: stall.name,
      slug: stall.slug,
      market_id: stall.market_id,
      stall: stall.stall,
    })),
  };
}

export async function getVendorsTodayRest() {
  const [markets, vendors, stalls, schedules] = await Promise.all([
    listMarkets(),
    listVendors(),
    listStalls(),
    listSchedules(),
  ]);
  return vendorsSellingToday(stalls, markets, vendors, scheduleMap(schedules)).slice(
    TODAY_STALL_CAP,
  );
}
