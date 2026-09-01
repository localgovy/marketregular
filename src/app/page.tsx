import { RulesMark } from "@/components/marks";
import { FloorTape } from "@/components/floor-tape";
import { HomePanel } from "@/components/home-panel";
import { HomeWalkthrough } from "@/components/home-walkthrough";
import { HomeMosaic } from "@/components/visit-loop";
import { MarketRow } from "@/components/market-row";
import {
  getDirectoryCensus,
  getFloorTape,
  listMarkets,
  listSchedules,
  listStalls,
  listVendors,
} from "@/lib/data/catalog";
import { LAUNCH_CITY } from "@/lib/launch";
import { weekdayInToronto } from "@/lib/find-paths";
import { upcomingByDay } from "@/lib/upcoming";
import { topVendorsThisWeek, vendorsSellingToday } from "@/lib/vendor-week";
import { pageMeta, SITE_DESCRIPTION } from "@/lib/seo";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = pageMeta({
  title: `What's open today at ${LAUNCH_CITY} farmers' markets`,
  path: "/",
  description: SITE_DESCRIPTION,
});

export const revalidate = 120;

export default async function HomePage() {
  const [tape, markets, vendors, stalls, schedules, census] = await Promise.all([
    getFloorTape(),
    listMarkets(),
    listVendors(),
    listStalls(),
    listSchedules(),
    getDirectoryCensus(),
  ]);

  const scheduleMap = new Map<string, typeof schedules>();
  for (const row of schedules) {
    const list = scheduleMap.get(row.market_id) ?? [];
    list.push(row);
    scheduleMap.set(row.market_id, list);
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const week = upcomingByDay(markets, scheduleMap, now);
  const sellingToday = vendorsSellingToday(stalls, markets, vendors, scheduleMap, now);
  const weekVendors = topVendorsThisWeek(stalls, markets, vendors, scheduleMap, tape, now);

  const marketIds = new Set(markets.map((market) => market.id));
  const vendorIds = new Set(
    stalls.filter((stall) => marketIds.has(stall.market_id)).map((stall) => stall.id),
  );
  const torontoVendors = vendors.filter((vendor) => vendorIds.has(vendor.id));
  const openIds = new Set(
    (week.find((group) => group.open)?.slots ?? []).map((slot) => slot.market.id),
  );
  const DIRECTORY_CAP = 10;
  const directory = [
    ...markets.filter((market) => openIds.has(market.id)),
    ...markets.filter((market) => !openIds.has(market.id)),
  ].slice(0, DIRECTORY_CAP);

  return (
    <>
      <HomeWalkthrough />
      <div className="flex flex-col lg:grid lg:site-rail">
        <div className="min-w-0 px-4 py-5 lg:col-start-2 lg:row-start-1 lg:px-6 lg:py-6">
          {markets.length ? (
            <HomeMosaic
              week={week}
              markets={markets}
              vendors={torontoVendors}
              sellingToday={sellingToday}
              weekVendors={weekVendors}
              census={census}
              today={weekdayInToronto(now)}
            />
          ) : (
            <p className="text-base text-muted-foreground">Directory is empty.</p>
          )}
        </div>

        <aside
          id="reviews"
          className="scroll-mt-28 border-t border-board lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:sticky lg:top-header-lg lg:h-below-header-lg lg:overflow-hidden lg:scroll-mt-24 lg:border-t-0 lg:border-r lg:border-board"
        >
          <FloorTape initialItems={tape} />
        </aside>

        <div className="min-w-0 border-t border-board px-4 pt-5 pb-8 lg:col-start-2 lg:row-start-2 lg:border-t-0 lg:px-6 lg:pt-6">
          <HomePanel
            id="directory"
            tone="directory"
            icon={RulesMark}
            kicker="A short list"
            title="Toronto markets"
            how="Open ones first. Tap a name, then save the ones you actually go to."
            action={
              <Link href="/markets" className="hover:underline">
                All {census.markets}
              </Link>
            }
          >
            <div className="rounded-md bg-card ring-1 ring-border">
              {directory.map((market) => (
                <MarketRow
                  key={market.id}
                  market={market}
                  schedules={scheduleMap.get(market.id)}
                  open={openIds.has(market.id)}
                  inset
                  now={nowIso}
                />
              ))}
            </div>
          </HomePanel>
        </div>
      </div>
    </>
  );
}
