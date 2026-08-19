import {
  Map,
  Search,
} from "lucide-react";
import { HomePanel, JumpChip } from "@/components/home-panel";
import { VendorsTodayPanel, VendorsWeekPanel } from "@/components/home-vendors";
import { MarketMapLazy } from "@/components/market-map-lazy";
import { QuickFind } from "@/components/quick-find";
import { TorontoWeek } from "@/components/toronto-week";
import { LAUNCH_CITY } from "@/lib/launch";
import type { UpcomingGroup } from "@/lib/upcoming";
import type { VendorTodayRow, VendorWeekPick } from "@/lib/vendor-week";
import type { Market } from "@/types/database";

export function HomeMosaic({
  week,
  markets,
  sellingToday,
  weekVendors,
}: {
  week: UpcomingGroup[];
  markets: Market[];
  sellingToday: VendorTodayRow[];
  weekVendors: VendorWeekPick[];
}) {
  return (
    <div>
      <header className="mb-6 max-w-2xl">
        <h1 className="font-heading text-3xl leading-tight sm:text-4xl">
          {LAUNCH_CITY} farmers&apos; markets
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">
          See which markets are on this week, who is selling, and what shoppers posted today.
        </p>
      </header>

      <nav aria-label="Jump to a part of this page" className="mb-6 flex flex-wrap gap-2">
        <JumpChip href="#week" tone="open" label="This week" hint="Upcoming markets in Toronto" />
        <JumpChip href="#find" tone="find" label="Search" hint="When, where, or what they sell" />
        <JumpChip href="#vendors-today" tone="vendors" label="Vendors" hint="Selling today, and this week's stalls" />
        <JumpChip href="#tape" tone="notes" label="Today's notes" hint="What shoppers posted today" />
      </nav>

      <TorontoWeek groups={week} />

      <HomePanel
        id="find"
        tone="find"
        icon={Search}
        kicker="When, where, or what"
        title="Find a market"
        how="Choose when, a neighbourhood, or what they sell. Stay here until you press Search at the bottom."
        className="mt-5"
      >
        <QuickFind markets={markets} />
      </HomePanel>

      <div className="mt-5 grid items-start gap-5 xl:grid-cols-2">
        <VendorsTodayPanel rows={sellingToday} />
        <VendorsWeekPanel picks={weekVendors} />

        <HomePanel
          tone="map"
          icon={Map}
          kicker="Around the city"
          title="Map of Toronto markets"
          how="Tap a pin, then tap the market name in the popup to open its page."
          className="xl:col-span-2"
          flush
        >
          <MarketMapLazy
            markets={markets}
            className="h-56 w-full overflow-hidden xl:h-72"
          />
        </HomePanel>
      </div>
    </div>
  );
}
