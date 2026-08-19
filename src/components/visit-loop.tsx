import { LocateFixed, Map, Search } from "lucide-react";
import { CheckInPanel } from "@/components/check-in-panel";
import { FloorStrip } from "@/components/floor-strip";
import { HomePanel } from "@/components/home-panel";
import { VendorsTodayPanel, VendorsWeekPanel } from "@/components/home-vendors";
import { KeptRail } from "@/components/kept-rail";
import { MarketMapLazy } from "@/components/market-map-lazy";
import { QuickFind } from "@/components/quick-find";
import { TorontoWeek } from "@/components/toronto-week";
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
  signedIn,
}: {
  week: UpcomingGroup[];
  markets: Market[];
  vendors: Vendor[];
  openNow: Market[];
  sellingToday: VendorTodayRow[];
  weekVendors: VendorWeekPick[];
  signedIn: boolean;
}) {
  return (
    <div>
      <header className="mb-4 max-w-2xl">
        <h1 className="font-heading text-3xl leading-tight sm:text-4xl">
          {LAUNCH_CITY} farmers&apos; markets
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Find a hall, keep the stalls you actually buy from, then check the tape once you&apos;re
          on the floor.
        </p>
      </header>

      <FloorStrip openNow={openNow} />

      <div className="flex flex-col gap-5 xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(16rem,20vw)] xl:items-start">
        <div className="contents xl:flex xl:min-w-0 xl:flex-col xl:gap-5">
          <HomePanel
            id="find"
            tone="find"
            icon={Search}
            kicker="When, where, or what"
            title="Find a market"
            how="Choose when, a neighbourhood, or what they sell. Press Search when the list looks right."
          >
            <QuickFind markets={markets} />
          </HomePanel>

          <TorontoWeek groups={week} />

          <HomePanel
            id="map"
            tone="map"
            icon={Map}
            kicker="Around the city"
            title="Map of Toronto markets"
            how="Tap a pin, then tap the market name in the popup to open its page."
            className="order-last xl:order-none"
            flush
          >
            <MarketMapLazy
              markets={markets}
              className="h-56 w-full overflow-hidden xl:h-72"
            />
          </HomePanel>
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <KeptRail markets={markets} vendors={vendors} />
          <HomePanel
            tone="here"
            icon={LocateFixed}
            kicker="On the floor"
            title="Stamp in"
            how="Posts and reviews only count inside a market fence. We keep a yes/no, not your pin."
          >
            <CheckInPanel signedIn={signedIn} compact />
          </HomePanel>
          <VendorsTodayPanel rows={sellingToday} />
          <VendorsWeekPanel picks={weekVendors} />
        </div>
      </div>
    </div>
  );
}
