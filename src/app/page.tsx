import { FloorTape } from "@/components/floor-tape";
import { HomeGeo } from "@/components/home-geo";
import { HomePanel } from "@/components/home-panel";
import { HomeMosaic } from "@/components/visit-loop";
import { MarketRow } from "@/components/market-row";
import {
  getCurrentProfile,
  getFloorTape,
  getOpenToday,
  getTablePeek,
  listMarkets,
  listSchedules,
  listStalls,
  listVendors,
} from "@/lib/data/catalog";
import { PROVINCES, WEEKDAYS } from "@/lib/constants";
import type { Market, StallRef } from "@/types/database";
import { List, Store } from "lucide-react";
import Link from "next/link";

function weekdayInToronto() {
  const name = new Intl.DateTimeFormat("en-CA", {
    weekday: "long",
    timeZone: "America/Toronto",
  }).format(new Date());
  return WEEKDAYS.findIndex((d) => d === name);
}

function nextWhen(days: number[]) {
  if (!days.length) return null;
  const today = weekdayInToronto();
  if (today < 0) return WEEKDAYS[days[0]]?.slice(0, 3) ?? null;
  for (let i = 0; i < 7; i += 1) {
    const day = (today + i) % 7;
    if (days.includes(day)) {
      if (i === 0) return "Today";
      if (i === 1) return "Tomorrow";
      return WEEKDAYS[day].slice(0, 3);
    }
  }
  return null;
}

function nextRank(days: number[]) {
  const today = weekdayInToronto();
  if (today < 0 || !days.length) return 9;
  let best = 8;
  for (const day of days) {
    const delta = (day - today + 7) % 7;
    if (delta < best) best = delta;
  }
  return best;
}

function returningRows(stalls: StallRef[], markets: Market[]) {
  const seen = new Set<string>();
  const ranked = [...stalls].sort((a, b) => nextRank(a.days) - nextRank(b.days));
  const rows = [];
  for (const stall of ranked) {
    if (seen.has(stall.id)) continue;
    const market = markets.find((m) => m.id === stall.market_id);
    const when = nextWhen(stall.days);
    if (!market || !when) continue;
    seen.add(stall.id);
    rows.push({
      vendorName: stall.name,
      vendorSlug: stall.slug,
      marketName: market.name,
      marketSlug: market.slug,
      when,
    });
    if (rows.length >= 3) break;
  }
  return rows;
}

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

  const showcase = openNow[0] ?? markets[0];
  const attending = showcase
    ? stalls.filter((s) => s.market_id === showcase.id).slice(0, 6)
    : [];
  const tablePeek = await getTablePeek(attending.map((s) => s.id));
  const returning = returningRows(stalls, markets);
  const spotlight = returning[0] ?? null;
  const otherHalls = spotlight
    ? stalls
        .filter((s) => s.slug === spotlight.vendorSlug && s.market_id !== (
          markets.find((m) => m.slug === spotlight.marketSlug)?.id
        ))
        .flatMap((s) => {
          const market = markets.find((m) => m.id === s.market_id);
          if (!market) return [];
          return [{ name: market.name, slug: market.slug, city: market.city }];
        })
        .filter((hall, i, all) => all.findIndex((h) => h.slug === hall.slug) === i)
        .slice(0, 5)
    : [];

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
  const signedIn = Boolean(profile);

  return (
    <HomeGeo markets={markets}>
      <div className="flex flex-col lg:grid lg:grid-cols-[minmax(240px,25%)_minmax(0,1fr)]">
        <aside
          id="tape"
          className="order-2 h-[70vh] scroll-mt-20 overflow-hidden border-y border-board lg:order-1 lg:row-span-2 lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:border-y-0 lg:border-r lg:border-board"
        >
          <FloorTape initialItems={tape} signedIn={signedIn} stalls={stalls} />
        </aside>

        <div className="order-1 min-w-0 px-4 py-5 lg:px-6 lg:py-6">
          {showcase ? (
            <HomeMosaic
              cities={cities}
              provinces={provinces}
              tags={tags}
              openNow={openNow}
              scheduleMap={scheduleMap}
              showcase={showcase}
              attending={attending}
              tablePeek={tablePeek}
              markets={markets}
              signedIn={signedIn}
              returning={returning}
              spotlightName={spotlight?.vendorName ?? null}
              spotlightSlug={spotlight?.vendorSlug ?? null}
              otherHalls={otherHalls}
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
            title="All markets"
            how="Browse by province. Tap a name to see hours, vendors, and the map."
            action={<span>{markets.length} listed</span>}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              {byProvince.map((group) => (
                <div key={group.code} className="overflow-hidden rounded-md bg-card ring-1 ring-border">
                  <h3 className="bg-primary px-3 py-1.5 text-base font-medium text-primary-foreground">
                    {group.name}
                  </h3>
                  {group.markets.map((market) => (
                    <MarketRow
                      key={market.id}
                      market={market}
                      schedules={scheduleMap.get(market.id)}
                      open={openIds.has(market.id)}
                      inset
                    />
                  ))}
                </div>
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
                    className="inline-flex min-h-10 items-center rounded-md bg-foreground px-3 py-1.5 text-base text-[#f4f1ea] hover:bg-foreground/90"
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
