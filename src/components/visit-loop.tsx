import { FloorStrip } from "@/components/floor-strip";
import { HomeCensus } from "@/components/home-census";
import { BlocksMark, SlatsMark } from "@/components/marks";
import { HomePanel } from "@/components/home-panel";
import { VendorsTodayPanel, VendorsWeekPanel } from "@/components/home-vendors";
import { SavedRail } from "@/components/saved-rail";
import { MarketMapLazy } from "@/components/market-map-lazy";
import { QuickFind } from "@/components/quick-find";
import { TorontoWeek } from "@/components/toronto-week";
import type { DirectoryCensus } from "@/lib/data/catalog";
import { LAUNCH_CITY } from "@/lib/launch";
import type { UpcomingGroup } from "@/lib/upcoming";
import type { VendorTodayRow, VendorWeekPick } from "@/lib/vendor-week";
import type { Market, Vendor } from "@/types/database";

export function HomeMosaic({
  week,
  markets,
  vendors,
  openNow,
  sellingToday,
  weekVendors,
  census,
}: {
  week: UpcomingGroup[];
  markets: Market[];
  vendors: Vendor[];
  openNow: Market[];
  sellingToday: VendorTodayRow[];
  weekVendors: VendorWeekPick[];
  census: DirectoryCensus;
}) {
  return (
    <div>
      <HomeCensus markets={census.markets} vendors={census.vendors} />

      <header className="mb-4 max-w-2xl">
        <h1>
          {LAUNCH_CITY} farmers&apos; markets
        </h1>
        <p className="type-lede mt-2 text-muted-foreground">
          Find a hall, save the stalls you actually buy from, then read what people wrote.
        </p>
      </header>

      <FloorStrip openNow={openNow} />

      <div className="flex flex-col gap-5 xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)]">
        <div className="contents xl:flex xl:min-h-0 xl:min-w-0 xl:flex-col xl:gap-5">
          <HomePanel
            id="find"
            tone="find"
            icon={SlatsMark}
            kicker="When, where, or what"
            title="Find a market"
            how="Choose when, a neighbourhood, or what they sell. Press Search when the list looks right."
            className="xl:shrink-0"
          >
            <QuickFind markets={markets} vendors={vendors} />
          </HomePanel>

          <TorontoWeek groups={week} />

          <HomePanel
            id="map"
            tone="map"
            icon={BlocksMark}
            kicker="Around the city"
            title="Map of Toronto markets"
            how="Click a pin for the name and address. Every market is also in the list below."
            className="order-last xl:order-none xl:flex xl:min-h-0 xl:flex-1 xl:flex-col"
            flush
          >
            <MarketMapLazy
              markets={markets}
              className="h-56 w-full min-h-56 overflow-hidden xl:h-auto xl:min-h-72 xl:flex-1"
            />
          </HomePanel>
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <SavedRail markets={markets} vendors={vendors} />
          <VendorsTodayPanel rows={sellingToday} />
          <VendorsWeekPanel picks={weekVendors} />
        </div>
      </div>
    </div>
  );
}
