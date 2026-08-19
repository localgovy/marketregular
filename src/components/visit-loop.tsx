import Link from "next/link";
import {
  CalendarClock,
  Map,
  MapPin,
  Receipt,
  Search,
  Store,
  Waypoints,
} from "lucide-react";
import { HomeEngage } from "@/components/home-engage";
import { HomePanel, JumpChip } from "@/components/home-panel";
import { MarketMapLazy } from "@/components/market-map-lazy";
import { QuickFind } from "@/components/quick-find";
import { TorontoWeek } from "@/components/toronto-week";
import { formatPrice } from "@/lib/format";
import { LAUNCH_CITY } from "@/lib/launch";
import type { TablePeek } from "@/lib/data/catalog";
import type { UpcomingGroup } from "@/lib/upcoming";
import type { Market, StallRef } from "@/types/database";

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
            className="inline-flex min-h-11 items-center rounded-md border border-border bg-background px-3 py-2 text-base font-medium hover:bg-secondary"
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
  week,
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
  week: UpcomingGroup[];
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
        <JumpChip href="#here" tone="here" label="I am shopping" hint="Share location, then post" />
        <JumpChip href="#tape" tone="notes" label="Today's notes" hint="What shoppers posted today" />
      </nav>

      <TorontoWeek groups={week} />

      <HomePanel
        id="find"
        tone="find"
        icon={Search}
        kicker="When, where, or what"
        title="Find a market"
        how="If you know the name, type it. If not, start with when you can go, then a neighbourhood."
        className="mt-5"
      >
        <QuickFind markets={markets} />
      </HomePanel>

      <div className="mt-5 grid items-start gap-5 xl:grid-cols-2">
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
            {showcase.address}. A sample of who sets up here.
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
            <ul className="overflow-hidden rounded-md ring-1 ring-border">
              {tablePeek.map((line) => (
                <li
                  key={line.vendorSlug + line.item}
                  className="border-b border-border px-3 py-3 last:border-b-0"
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
                      <span className="font-mono text-sm text-ticket">
                        {formatPrice(line.priceCents)}
                      </span>
                    ) : null}
                  </p>
                  {line.note ? (
                    <p className="mt-1 text-base text-muted-foreground">
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
                  <span className="text-sm text-muted-foreground">{row.when}</span>
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
          how="The same vendor often sells at more than one Toronto market. Tap a market to open it."
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
                      className="inline-flex min-h-11 items-center rounded-md border border-border bg-background px-3 py-2 text-base hover:bg-secondary"
                    >
                      {hall.name}
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
        </HomePanel>
      </div>
    </div>
  );
}
