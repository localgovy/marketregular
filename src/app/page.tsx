import { CrateMark, RulesMark } from "@/components/marks";
import { FloorTape } from "@/components/floor-tape";
import { HomeGeo } from "@/components/home-geo";
import { HomePanel } from "@/components/home-panel";
import { HomeMosaic } from "@/components/visit-loop";
import { MarketRow } from "@/components/market-row";
import { VendorRow } from "@/components/vendor-row";
import {
  getCurrentProfile,
  getDirectoryCensus,
  getFloorTape,
  getOpenToday,
  listMarkets,
  listSchedules,
  listStalls,
  listVendors,
} from "@/lib/data/catalog";
import { upcomingByDay } from "@/lib/upcoming";
import { topVendorsThisWeek, vendorsSellingToday } from "@/lib/vendor-week";
import { connection } from "next/server";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HomePage() {
  await connection();
  const [tape, openNow, markets, vendors, stalls, schedules, profile, census] = await Promise.all([
    getFloorTape(),
    getOpenToday(),
    listMarkets(),
    listVendors(),
    listStalls(),
    listSchedules(),
    getCurrentProfile(),
    getDirectoryCensus(),
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

  const marketIds = new Set(markets.map((market) => market.id));
  const vendorIds = new Set(
    stalls.filter((stall) => marketIds.has(stall.market_id)).map((stall) => stall.id),
  );
  const torontoVendors = vendors.filter((vendor) => vendorIds.has(vendor.id));
  const openIds = new Set(openNow.map((m) => m.id));
  const signedIn = Boolean(profile);
  const DIRECTORY_CAP = 10;
  const directory = [...openNow, ...markets.filter((market) => !openIds.has(market.id))].slice(
    0,
    DIRECTORY_CAP,
  );
  const vendorPreview = torontoVendors.slice(0, DIRECTORY_CAP);

  return (
    <HomeGeo markets={markets}>
      <div className="flex flex-col lg:grid lg:grid-cols-[minmax(240px,25%)_minmax(0,1fr)]">
        <aside
          id="reviews"
          className="order-2 h-[70vh] scroll-mt-20 overflow-hidden border-y border-board lg:order-1 lg:row-span-2 lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:border-y-0 lg:border-r lg:border-board"
        >
          <FloorTape initialItems={tape} signedIn={signedIn} stalls={stalls} markets={markets} />
        </aside>

        <div className="order-1 min-w-0 px-4 py-5 lg:px-6 lg:py-6">
          {markets.length ? (
            <HomeMosaic
              week={week}
              markets={markets}
              vendors={torontoVendors}
              openNow={openNow}
              sellingToday={sellingToday}
              weekVendors={weekVendors}
              census={census}
            />
          ) : (
            <p className="text-base text-muted-foreground">Directory is empty.</p>
          )}
        </div>

        <div className="order-3 min-w-0 px-4 pb-8 lg:px-6 lg:pt-6">
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
                />
              ))}
            </div>
          </HomePanel>

          <HomePanel
            tone="vendors"
            icon={CrateMark}
            kicker="Name list"
            title="Vendors"
            how="A short list. Save the ones you buy from."
            className="mt-5"
            action={
              <Link href="/vendors" className="hover:underline">
                All {census.vendors}
              </Link>
            }
          >
            <div className="rounded-md bg-card ring-1 ring-border">
              {vendorPreview.map((vendor) => (
                <VendorRow key={vendor.id} vendor={vendor} />
              ))}
            </div>
          </HomePanel>
        </div>
      </div>
    </HomeGeo>
  );
}
