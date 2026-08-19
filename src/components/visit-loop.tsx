import { Map, Search } from "lucide-react";
import { FloorStrip } from "@/components/floor-strip";
import { HomePanel } from "@/components/home-panel";
import { VendorsTodayPanel, VendorsWeekPanel } from "@/components/home-vendors";
import { SavedRail } from "@/components/saved-rail";
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
}: {
  week: UpcomingGroup[];
  markets: Market[];
  vendors: Vendor[];
  openNow: Market[];
  sellingToday: VendorTodayRow[];
  weekVendors: VendorWeekPick[];
}) {
  return (
    <div>
      <header className="mb-4 max-w-2xl">
        <h1 className="font-heading text-3xl leading-tight sm:text-4xl">
          {LAUNCH_CITY} farmers&apos; markets
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Find a hall, save the stalls you actually buy from, then check the tape once you&apos;re
          on the floor.
        </p>
      </header>

      <FloorStrip openNow={openNow} />

      <HomePanel
        id="find"
        tone="find"
        icon={Search}
        kicker="When, where, or what"
        title="Find a market"
        how="Choose when, a neighbourhood, or what they sell. Press Search when the list looks right."
        className="mb-5"
      >
        <QuickFind markets={markets} />
      </HomePanel>

      <TorontoWeek groups={week} />

      <div className="mt-5 flex flex-col gap-5 xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)] xl:items-start">
        <HomePanel
          id="map"
          tone="map"
          icon={Map}
          kicker="Around the city"
          title="Map of Toronto markets"
          how="Tap a pin, then tap the market name in the popup to open its page."
          flush
        >
          <MarketMapLazy
            markets={markets}
            className="h-56 w-full overflow-hidden xl:h-72"
          />
        </HomePanel>

        <div className="flex min-w-0 flex-col gap-5">
          <SavedRail markets={markets} vendors={vendors} />
          <VendorsTodayPanel rows={sellingToday} />
          <VendorsWeekPanel picks={weekVendors} />
        </div>
      </div>
    </div>
  );
}
