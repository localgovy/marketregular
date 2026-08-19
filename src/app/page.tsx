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
import { WEEKDAYS } from "@/lib/constants";
import { upcomingByDay } from "@/lib/upcoming";
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

  const tags = [...new Set(markets.flatMap((m) => m.tags))].sort();
  const week = upcomingByDay(markets, scheduleMap);
  const nextUp = week.flatMap((group) => group.slots)[0]?.market;
  const showcase = openNow[0] ?? nextUp ?? markets[0];
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
              tags={tags}
              week={week}
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
