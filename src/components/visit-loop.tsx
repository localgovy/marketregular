import { FloorStrip } from "@/components/floor-strip";
import { HomeCensus } from "@/components/home-census";
import { BlocksMark, MapleMark, SlatsMark } from "@/components/marks";
import { HomePanel } from "@/components/home-panel";
import { VendorsTodayPanel, VendorsWeekPanel } from "@/components/home-vendors";
import { SavedRail } from "@/components/saved-rail";
import { MarketMapLazy } from "@/components/market-map-lazy";
import { QuickFind } from "@/components/quick-find";
import { TorontoWeek } from "@/components/toronto-week";
import type { DirectoryCensus } from "@/lib/data/catalog";
import { FIND_ORIGINS, FIND_PRODUCTS, FIND_SETUP, homeAreas, tagsPresent } from "@/lib/find-paths";
import { LAUNCH_CITY, LAUNCH_COVERAGE } from "@/lib/launch";
import type { UpcomingGroup } from "@/lib/upcoming";
import type { VendorTodayRow, VendorWeekPick } from "@/lib/vendor-week";
import type { Market, Vendor } from "@/types/database";

export function HomeMosaic({
  week,
  markets,
  vendors,
  sellingToday,
  weekVendors,
  census,
  today,
}: {
  week: UpcomingGroup[];
  markets: Market[];
  vendors: Vendor[];
  sellingToday: VendorTodayRow[];
  weekVendors: VendorWeekPick[];
  census: DirectoryCensus;
  today: number;
}) {
  const areas = homeAreas(markets);
  const sellOptions = tagsPresent([...markets, ...vendors], FIND_PRODUCTS);
  const cuisineOptions = tagsPresent(vendors, FIND_ORIGINS);
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
  const openGroup = week.find((group) => group.open);
  const ticker =
    openGroup?.slots.map((slot) => ({
      id: slot.market.id,
      name: slot.market.name,
      slug: slot.market.slug,
      hours: slot.hours,
      address: slot.market.address,
      city: slot.market.city,
      lat: slot.market.lat,
      lng: slot.market.lng,
      date: openGroup.iso,
    })) ?? [];

  return (
    <div>
      <HomeCensus markets={census.markets} vendors={census.vendors} menus={census.menus} />

      <header className="mb-4 max-w-2xl">
        <h1>
          {LAUNCH_CITY} farmers&apos; markets
        </h1>
        <p className="type-lede mt-2 text-pretty text-muted-foreground">
          Find out everything you want to know about markets in {LAUNCH_COVERAGE}.
        </p>
        <p className="mt-3 flex items-start gap-2 text-base font-medium leading-snug text-board sm:mt-3.5 sm:items-center sm:gap-2.5">
          <MapleMark className="mt-0.5 h-7 w-14 shrink-0 text-stamp shadow-[0_0_0_1px_rgba(0,0,0,0.2)] sm:mt-0" />
          <span className="min-w-0 flex-1">
            <span className="flex flex-col gap-y-1 sm:block sm:text-pretty">
              <span className="sm:after:content-['_']">Made by Canadians,</span>
              <span className="sm:after:content-['_']">for Canadians,</span>
              <span>to shop Canadian. </span>
              <span>Pickup coming soon.</span>
            </span>
          </span>
        </p>
      </header>

      <FloorStrip openNow={ticker} />

      <div className="flex flex-col gap-5 xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)] xl:items-start">
        <div className="contents xl:flex xl:min-w-0 xl:flex-col xl:gap-5">
          <HomePanel
            id="find"
            tone="find"
            icon={SlatsMark}
            kicker="When, where, or what"
            title="Find a market"
            how="Choose when, a neighbourhood or city, what they sell, or a cuisine. Press Search when the list looks right."
          >
            <QuickFind
              markets={nearMarkets}
              areas={areas}
              sellOptions={sellOptions}
              cuisineOptions={cuisineOptions}
              setup={setup}
              today={today}
            />
          </HomePanel>

          <TorontoWeek groups={week} />

          <HomePanel
            id="map"
            tone="map"
            icon={BlocksMark}
            kicker="Around Toronto"
            title="Map of Toronto markets"
            how="Show the map, then click a pin for the name and address. Every market is also in the list below."
            className="order-last xl:order-none"
            flush
          >
            <MarketMapLazy
              markets={mapMarkets}
              load="click"
              className="h-56 w-full overflow-hidden xl:h-72"
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
