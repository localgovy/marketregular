import { FloorTape } from "@/components/floor-tape";
import { HomeEngage } from "@/components/home-engage";
import { HomeGeo } from "@/components/home-geo";
import { MarketMapLazy } from "@/components/market-map-lazy";
import { MarketRow } from "@/components/market-row";
import { QuickFind } from "@/components/quick-find";
import {
  getCurrentProfile,
  getFloorTape,
  getOpenToday,
  listMarkets,
  listSchedules,
  listStalls,
  listVendors,
} from "@/lib/data/catalog";
import { PROVINCES } from "@/lib/constants";
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

  const openIds = new Set(openNow.map((m) => m.id));
  const cities = [...new Set(markets.map((m) => m.city))].sort();
  const provinces = PROVINCES.map((p) => p.code).filter((code) =>
    markets.some((m) => m.province === code),
  );
  const tags = [...new Set(markets.flatMap((m) => m.tags))].sort();
  const byProvince = PROVINCES.filter((p) => markets.some((m) => m.province === p.code)).map(
    (p) => ({
      ...p,
      markets: markets.filter((m) => m.province === p.code),
    }),
  );

  return (
    <HomeGeo markets={markets}>
    <div className="lg:grid lg:grid-cols-[minmax(240px,25%)_minmax(0,1fr)]">
      <aside className="order-2 h-[70vh] overflow-hidden border-y border-border lg:order-1 lg:row-span-2 lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:border-y-0 lg:border-r">
        <FloorTape initialItems={tape} signedIn={Boolean(profile)} stalls={stalls} />
      </aside>

      <div className="order-1 min-w-0 px-4 py-5 lg:px-6 lg:py-6">
        <QuickFind cities={cities} provinces={provinces} tags={tags} />

        <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(260px,0.85fr)]">
          <div className="min-w-0">
            <section>
              <div className="mb-2 flex items-baseline justify-between gap-3">
                <h2 className="text-sm font-medium tracking-wide text-primary uppercase">
                  Open now
                </h2>
                <Link href="/search?openNow=1" className="text-xs text-muted-foreground hover:underline">
                  See all
                </Link>
              </div>
              {openNow.length ? (
                <div>
                  {openNow.slice(0, 6).map((market) => (
                    <MarketRow
                      key={market.id}
                      market={market}
                      schedules={scheduleMap.get(market.id)}
                      open
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nothing open this minute. Try Saturday, or pick a city above.
                </p>
              )}
            </section>

            <section className="mt-6">
              <h2 className="mb-2 text-sm font-medium tracking-wide text-primary uppercase">
                Near you · stamp in
              </h2>
              <HomeEngage markets={markets} signedIn={Boolean(profile)} />
            </section>
          </div>

          <section className="min-w-0">
            <h2 className="mb-2 text-sm font-medium tracking-wide text-primary uppercase">
              Map
            </h2>
            <MarketMapLazy
              markets={markets}
              className="h-56 w-full overflow-hidden rounded-lg ring-1 ring-border xl:h-[22rem]"
            />
          </section>
        </div>
      </div>

      <div className="order-3 min-w-0 px-4 pb-8 lg:px-6">
        <section>
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <h2 className="text-sm font-medium tracking-wide text-primary uppercase">
              Markets
            </h2>
            <span className="text-xs text-muted-foreground">{markets.length} listed</span>
          </div>
          <div className="grid gap-8 sm:grid-cols-2">
            {byProvince.map((group) => (
              <div key={group.code}>
                <h3 className="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  {group.name}
                </h3>
                {group.markets.map((market) => (
                  <MarketRow
                    key={market.id}
                    market={market}
                    schedules={scheduleMap.get(market.id)}
                    open={openIds.has(market.id)}
                  />
                ))}
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <h2 className="mb-2 text-sm font-medium tracking-wide text-primary uppercase">
            Stalls
          </h2>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {vendors.slice(0, 16).map((vendor) => (
              <li key={vendor.id}>
                <Link href={`/vendors/${vendor.slug}`} className="hover:text-primary hover:underline">
                  {vendor.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
    </HomeGeo>
  );
}
