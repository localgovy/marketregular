import Link from "next/link";
import {
  CalendarClock,
  Map,
  MapPin,
  Receipt,
  Search,
  Store,
  Ticket,
  Waypoints,
} from "lucide-react";
import { HomeEngage } from "@/components/home-engage";
import { HomePanel, JumpChip } from "@/components/home-panel";
import { MarketMapLazy } from "@/components/market-map-lazy";
import { MarketRow } from "@/components/market-row";
import { QuickFind } from "@/components/quick-find";
import { formatPrice } from "@/lib/format";
import type { TablePeek } from "@/lib/data/catalog";
import type { Market, MarketSchedule, StallRef } from "@/types/database";

export type ReturningRow = {
  vendorName: string;
  vendorSlug: string;
  marketName: string;
  marketSlug: string;
  when: string;
};

export type HallLink = {
  name: string;
  slug: string;
  city: string;
};

function StallNames({ stalls }: { stalls: StallRef[] }) {
  if (!stalls.length) {
    return (
      <p className="text-base text-muted-foreground">
        We do not have vendors listed for this market yet. Open the market page for hours and the map.
      </p>
    );
  }
  return (
    <ul className="flex flex-wrap gap-2">
      {stalls.map((stall) => (
        <li key={`${stall.market_id}-${stall.id}`}>
          <Link
            href={`/vendors/${stall.slug}`}
            className="inline-flex min-h-11 items-center rounded-md bg-foreground px-3 py-2 text-base font-medium text-[#f4f1ea] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] hover:bg-foreground/90"
          >
            {stall.name}
            {stall.stall ? (
              <span className="ml-2 font-mono text-sm font-normal text-ticket">{stall.stall}</span>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function HomeMosaic({
  cities,
  provinces,
  tags,
  openNow,
  scheduleMap,
  showcase,
  attending,
  tablePeek,
  markets,
  signedIn,
  returning,
  spotlightName,
  spotlightSlug,
  otherHalls,
}: {
  cities: string[];
  provinces: string[];
  tags: string[];
  openNow: Market[];
  scheduleMap: Map<string, MarketSchedule[]>;
  showcase: Market;
  attending: StallRef[];
  tablePeek: TablePeek[];
  markets: Market[];
  signedIn: boolean;
  returning: ReturningRow[];
  spotlightName: string | null;
  spotlightSlug: string | null;
  otherHalls: HallLink[];
}) {
  return (
    <div>
      <header className="mb-6 max-w-2xl">
        <h1 className="font-heading text-3xl leading-tight sm:text-4xl">Canadian farmers&apos; markets</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Look up a market, see which vendors will be there, and read notes from people shopping today.
          Use any part of the page — nothing has to be done in order.
        </p>
      </header>

      <nav aria-label="Jump to a part of this page" className="mb-6 flex flex-wrap gap-2">
        <JumpChip href="#find" tone="find" label="Find a market" hint="Type a name or tap a city" />
        <JumpChip href="#open" tone="open" label="Who is open" hint="Gold means open right now" />
        <JumpChip href="#here" tone="here" label="I am shopping" hint="Share location, then post" />
        <JumpChip href="#tape" tone="notes" label="Today's notes" hint="What shoppers posted today" />
      </nav>

      <HomePanel
        id="find"
        tone="find"
        icon={Search}
        kicker="Look it up"
        title="Find a market"
        how="Type a city, market name, or food, then press Search. Or tap a shortcut."
      >
        <QuickFind cities={cities} provinces={provinces} tags={tags} />
      </HomePanel>

      <div className="mt-5 grid items-start gap-5 xl:grid-cols-2">
        <HomePanel
          id="open"
          tone="open"
          icon={Ticket}
          kicker="Lights are on"
          title="Open right now"
          how="These markets are open this minute. Tap a name to see hours, vendors, and a map."
          action={
            <Link href="/search?openNow=1" className="text-inherit">
              Show all open markets
            </Link>
          }
        >
          {openNow.length ? (
            <div className="divide-y divide-ticket/20 overflow-hidden rounded-md bg-[#fbf8ef] ring-1 ring-ticket/20">
              {openNow.slice(0, 6).map((market) => (
                <MarketRow
                  key={market.id}
                  market={market}
                  schedules={scheduleMap.get(market.id)}
                  open
                  inset
                />
              ))}
            </div>
          ) : (
            <p className="text-base text-muted-foreground">
              Nothing is open this minute. Try{" "}
              <Link href="/search?weekday=6" className="text-primary hover:underline">
                Saturday markets
              </Link>
              — that is when most of them run.
            </p>
          )}
        </HomePanel>

        <HomePanel
          tone="vendors"
          icon={Store}
          kicker="Who is selling"
          title={`Vendors at ${showcase.name}`}
          how="Tap a vendor to see what they sell, prices, and reviews."
          action={
            <Link href={`/markets/${showcase.slug}`} className="text-inherit">
              Open this market
            </Link>
          }
        >
          <p className="mb-3 text-base text-muted-foreground">
            {showcase.city}. A sample of who sets up here.
          </p>
          <StallNames stalls={attending} />
        </HomePanel>

        <HomePanel
          tone="menus"
          icon={Receipt}
          kicker="What it costs"
          title="Menus and reviews"
          how="A few things for sale, plus what shoppers said. Tap the vendor name for the full page."
        >
          {tablePeek.length ? (
            <ul className="overflow-hidden rounded-md ring-1 ring-ticket/20">
              {tablePeek.map((line) => (
                <li
                  key={line.vendorSlug + line.item}
                  className="border-b border-dashed border-ticket/25 bg-[#fbf8ef] px-3 py-3 last:border-b-0"
                >
                  <Link
                    href={`/vendors/${line.vendorSlug}`}
                    className="text-base font-medium hover:underline"
                  >
                    {line.vendorName}
                  </Link>
                  <p className="mt-0.5 flex flex-wrap items-baseline gap-2 text-base">
                    {line.item}
                    {formatPrice(line.priceCents) ? (
                      <span className="inline-flex rounded-sm bg-ticket px-1.5 py-0.5 font-mono text-sm text-[#fbf8ef]">
                        {formatPrice(line.priceCents)}
                      </span>
                    ) : null}
                  </p>
                  {line.note ? (
                    <p className="mt-1 border-l-2 border-stamp/70 pl-2 text-base text-muted-foreground">
                      “{line.note}”
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-base text-muted-foreground">
              Open a vendor above to read their menu and reviews.
            </p>
          )}
        </HomePanel>

        <HomePanel
          id="here"
          tone="here"
          icon={MapPin}
          kicker="You are at the market"
          title="If you are at a market now"
          how="Share your location so we can tell you are really there. Then you can post a note or review."
        >
          <HomeEngage markets={markets} signedIn={signedIn} />
        </HomePanel>

        <HomePanel
          tone="map"
          icon={Map}
          kicker="See the pins"
          title="Map of markets"
          how="Tap a pin, then tap the market name in the popup to open its page."
          className="xl:col-span-2"
          flush
        >
          <MarketMapLazy
            markets={markets}
            className="h-56 w-full overflow-hidden xl:h-72"
          />
        </HomePanel>

        <HomePanel
          tone="back"
          icon={CalendarClock}
          kicker="Coming up"
          title="When vendors are back"
          how="Tap a vendor to see their page, or the market name to see that market."
        >
          {returning.length ? (
            <ul className="overflow-hidden rounded-md bg-card ring-1 ring-border">
              {returning.map((row) => (
                <li
                  key={row.vendorSlug + row.marketSlug}
                  className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-3 text-base last:border-b-0"
                >
                  <span>
                    <Link href={`/vendors/${row.vendorSlug}`} className="font-medium hover:underline">
                      {row.vendorName}
                    </Link>
                    <span className="text-muted-foreground"> at </span>
                    <Link href={`/markets/${row.marketSlug}`} className="hover:underline">
                      {row.marketName}
                    </Link>
                  </span>
                  <span className="inline-flex rounded-sm bg-ticket px-2 py-0.5 text-sm font-medium text-[#fbf8ef]">
                    {row.when}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-base text-muted-foreground">Open a market page to see its hours.</p>
          )}
        </HomePanel>

        <HomePanel
          tone="more"
          icon={Waypoints}
          kicker="Same tables, other days"
          title="Other markets they visit"
          how="The same vendor often sells at more than one market. Tap a market to open it."
        >
          {spotlightName && otherHalls.length ? (
            <div>
              <p className="mb-3 text-base">
                {spotlightSlug ? (
                  <Link href={`/vendors/${spotlightSlug}`} className="font-medium hover:underline">
                    {spotlightName}
                  </Link>
                ) : (
                  <span className="font-medium">{spotlightName}</span>
                )}{" "}
                also sells at:
              </p>
              <ul className="flex flex-wrap gap-2">
                {otherHalls.map((hall) => (
                  <li key={hall.slug}>
                    <Link
                      href={`/markets/${hall.slug}`}
                      className="inline-flex min-h-11 items-center rounded-md border border-primary/30 bg-card px-3 py-2 text-base hover:bg-panel-find"
                    >
                      {hall.name}
                      <span className="ml-2 text-sm text-muted-foreground">{hall.city}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-base text-muted-foreground">
              Open any vendor page to see every market they attend.
            </p>
          )}
          <p className="mt-4 rounded-md bg-panel-open px-3 py-2 text-base">
            Most markets are busiest on Saturday.{" "}
            <Link href="/search?weekday=6" className="font-medium text-primary hover:underline">
              Show Saturday markets
            </Link>
          </p>
        </HomePanel>
      </div>
    </div>
  );
}
