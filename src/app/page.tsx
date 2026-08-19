import { FloorTape } from "@/components/floor-tape";
import { HomeGeo } from "@/components/home-geo";
import { HomePanel } from "@/components/home-panel";
import { HomeMosaic } from "@/components/visit-loop";
import { MarketRow } from "@/components/market-row";
import {
  getCurrentProfile,
  getFloorTape,
  getOpenToday,
  listMarkets,
  listSchedules,
  listStalls,
  listVendors,
} from "@/lib/data/catalog";
import { upcomingByDay } from "@/lib/upcoming";
import { topVendorsThisWeek, vendorsSellingToday } from "@/lib/vendor-week";
import { List, Store } from "lucide-react";
import Link from "next/link";

export default async function HomePage() {
  const [tape, openNow, markets, vendors, stalls, schedules, profile] = await Promise.all([
    getFloorTape(),
    getOpenToday(),
    listMarkets(),
    listVendors(),
    listStalls(),
    listSchedules(),
    getCurrentProfile(),
  ]);

  const scheduleMap = new Map<string, typeof schedules>();
  for (const row of schedules) {
    const list = scheduleMap.get(row.market_id) ?? [];
    list.push(row);
    scheduleMap.set(row.market_id, list);
  }

  const week = upcomingByDay(markets, scheduleMap);
  const sellingToday = vendorsSellingToday(stalls, markets, vendors, scheduleMap);
  const weekVendors = topVendorsThisWeek(stalls, markets, vendors, scheduleMap, tape);

  const openIds = new Set(openNow.map((m) => m.id));
  const signedIn = Boolean(profile);

  return (
    <HomeGeo markets={markets}>
      <div className="flex flex-col lg:grid lg:grid-cols-[minmax(240px,25%)_minmax(0,1fr)]">
        <aside
          id="tape"
          className="order-2 h-[70vh] scroll-mt-20 overflow-hidden border-y border-board lg:order-1 lg:row-span-2 lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:border-y-0 lg:border-r lg:border-board"
        >
          <FloorTape initialItems={tape} signedIn={signedIn} stalls={stalls} markets={markets} />
        </aside>

        <div className="order-1 min-w-0 px-4 py-5 lg:px-6 lg:py-6">
          {markets.length ? (
            <HomeMosaic
              week={week}
              markets={markets}
              sellingToday={sellingToday}
              weekVendors={weekVendors}
            />
          ) : (
            <p className="text-sm text-muted-foreground">Directory is empty.</p>
          )}
        </div>

        <div className="order-3 min-w-0 px-4 pb-8 lg:px-6 lg:pt-6">
          <HomePanel
            id="directory"
            tone="directory"
            icon={List}
            kicker="The full list"
            title="All Toronto markets"
            how="Every market we list in the city. Tap a name to see hours, vendors, and the map."
            action={<span>{markets.length} listed</span>}
          >
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
          </HomePanel>

          <HomePanel
            tone="vendors"
            icon={Store}
            kicker="Name list"
            title="Vendors"
            how="Tap a name to see their stall."
            className="mt-5"
          >
            <ul className="flex flex-wrap gap-2">
              {vendors.slice(0, 16).map((vendor) => (
                <li key={vendor.id}>
                  <Link
                    href={`/vendors/${vendor.slug}`}
                    className="inline-flex min-h-10 items-center rounded-md border border-border bg-background px-3 py-1.5 text-base hover:bg-secondary"
                  >
                    {vendor.name}
                  </Link>
                </li>
              ))}
            </ul>
          </HomePanel>
        </div>
      </div>
    </HomeGeo>
  );
}
