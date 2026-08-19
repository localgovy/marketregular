import type { Metadata } from "next";
import Link from "next/link";
import { MarketMapLazy } from "@/components/market-map-lazy";
import { MarketRow } from "@/components/market-row";
import { getOpenToday, listMarkets, listSchedules } from "@/lib/data/catalog";
import { LAUNCH_CITY } from "@/lib/launch";

export const metadata: Metadata = { title: `All ${LAUNCH_CITY} markets` };

export default async function MarketsIndexPage() {
  const [markets, schedules, openNow] = await Promise.all([
    listMarkets(),
    listSchedules(),
    getOpenToday(),
  ]);
  const scheduleMap = new Map<string, typeof schedules>();
  for (const row of schedules) {
    const list = scheduleMap.get(row.market_id) ?? [];
    list.push(row);
    scheduleMap.set(row.market_id, list);
  }
  const openIds = new Set(openNow.map((market) => market.id));

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <h1>Markets</h1>
      <p className="type-lede mt-2 mb-6 text-muted-foreground">
        Every {LAUNCH_CITY} hall we list. Tap a name for hours, vendors, and the map. Save the ones
        you actually go to.
      </p>
      <p className="mb-6 text-sm">
        <Link href="/search" className="font-medium text-primary hover:underline">
          Filter by day or what they sell
        </Link>
      </p>
      <MarketMapLazy markets={markets} className="mb-8 h-64 w-full overflow-hidden rounded-md" />
      <p className="mb-3 text-sm text-muted-foreground">{markets.length} listed</p>
      <div className="overflow-hidden rounded-md bg-card ring-1 ring-border">
        {markets.map((market) => (
          <MarketRow
            key={market.id}
            market={market}
            schedules={scheduleMap.get(market.id)}
            open={openIds.has(market.id)}
            inset
          />
        ))}
      </div>
    </div>
  );
}
