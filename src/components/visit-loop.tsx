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
import { FIND_PRODUCTS, FIND_SETUP, areasForMarkets, tagsPresent } from "@/lib/find-paths";
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
  const areas = areasForMarkets(markets).map(({ label, q }) => ({ label, q }));
  const sellOptions = tagsPresent([...markets, ...vendors], FIND_PRODUCTS);
  const setup = [...tagsPresent(markets, FIND_SETUP)];
  const nearMarkets = markets.map((market) => ({
    name: market.name,
    lat: market.lat,
    lng: market.lng,
  }));
  const mapMarkets = markets.map((market) => ({
    id: market.id,
    name: market.name,
    slug: market.slug,
    lat: market.lat,
    lng: market.lng,
    city: market.city,
    address: market.address,
  }));
  const savedMarkets = markets.map((market) => ({
    id: market.id,
    slug: market.slug,
    name: market.name,
    address: market.address,
    rating_avg: market.rating_avg,
    review_count: market.review_count,
  }));
  const ticker =
    week.find((group) => group.open)?.slots.map((slot) => ({
      id: slot.market.id,
      name: slot.market.name,
      slug: slot.market.slug,
      hours: slot.hours,
    })) ??
    openNow.map((market) => ({
      id: market.id,
      name: market.name,
      slug: market.slug,
      hours: "",
    }));

  return (
    <div>
      <HomeCensus markets={census.markets} vendors={census.vendors} menus={census.menus} />

      <header className="mb-4 max-w-2xl">
        <h1>
          {LAUNCH_CITY} farmers&apos; markets
        </h1>
        <p className="type-lede mt-2 text-muted-foreground">
          Find out everything you want to know about markets near or in Toronto.
        </p>
      </header>

      <FloorStrip openNow={ticker} />

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
            <QuickFind
              markets={nearMarkets}
              areas={areas}
              sellOptions={sellOptions}
              setup={setup}
            />
          </HomePanel>

          <TorontoWeek groups={week} />

          <HomePanel
            id="map"
            tone="map"
            icon={BlocksMark}
            kicker="Around the city"
            title="Map of Toronto markets"
            how="Show the map, then click a pin for the name and address. Every market is also in the list below."
            className="order-last xl:order-none xl:flex xl:min-h-0 xl:flex-1 xl:flex-col"
            flush
          >
            <MarketMapLazy
              markets={mapMarkets}
              load="click"
              className="h-56 w-full min-h-56 overflow-hidden xl:h-auto xl:min-h-72 xl:flex-1"
            />
          </HomePanel>
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <SavedRail markets={savedMarkets} />
          <VendorsTodayPanel rows={sellingToday} />
          <VendorsWeekPanel picks={weekVendors} />
        </div>
      </div>
    </div>
  );
}
