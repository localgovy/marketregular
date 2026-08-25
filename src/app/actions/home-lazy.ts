"use server";

import { listMarkets, listStalls } from "@/lib/data/catalog";
import { toGeoMarket } from "@/lib/geo";

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
