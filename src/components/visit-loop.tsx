import Link from "next/link";
import { HomeEngage } from "@/components/home-engage";
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

function Section({
  title,
  how,
  children,
  action,
}: {
  title: string;
  how: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div className="min-w-0">
          <h2 className="font-heading text-2xl leading-tight">{title}</h2>
          <p className="mt-1 text-base text-muted-foreground">{how}</p>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

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
            className="inline-flex min-h-10 items-center rounded-md border border-border bg-card px-3 py-2 text-base font-medium hover:bg-secondary"
          >
            {stall.name}
            {stall.stall ? (
              <span className="ml-2 text-sm font-normal text-muted-foreground">Stall {stall.stall}</span>
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
      <header className="mb-8 max-w-2xl">
        <h1 className="font-heading text-3xl leading-tight sm:text-4xl">Canadian farmers&apos; markets</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Look up a market, see which vendors will be there, and read notes from people shopping today.
          Use any part of the page — nothing has to be done in order.
        </p>
      </header>

      <Section
        title="Find a market"
        how="Type a city, market name, or food, then press Search. Or tap a shortcut."
      >
        <QuickFind cities={cities} provinces={provinces} tags={tags} />
      </Section>

      <div className="mt-10 grid items-start gap-x-10 gap-y-10 xl:grid-cols-2">
        <Section
          title="Open right now"
          how="These markets are open this minute. Tap a name to see hours, vendors, and a map."
          action={
            <Link href="/search?openNow=1" className="text-base text-primary hover:underline">
              Show all open markets
            </Link>
          }
        >
          {openNow.length ? (
            openNow.slice(0, 6).map((market) => (
              <MarketRow
                key={market.id}
                market={market}
                schedules={scheduleMap.get(market.id)}
                open
              />
            ))
          ) : (
            <p className="text-base text-muted-foreground">
              Nothing is open this minute. Try{" "}
              <Link href="/search?weekday=6" className="text-primary hover:underline">
                Saturday markets
              </Link>
              — that is when most of them run.
            </p>
          )}
        </Section>

        <Section
          title={`Vendors at ${showcase.name}`}
          how="Tap a vendor to see what they sell, prices, and reviews."
          action={
            <Link href={`/markets/${showcase.slug}`} className="text-base text-primary hover:underline">
              Open this market
            </Link>
          }
        >
          <p className="mb-3 text-base text-muted-foreground">
            {showcase.city}. A sample of who sets up here.
          </p>
          <StallNames stalls={attending} />
        </Section>

        <Section
          title="Menus and reviews"
          how="A few things for sale, plus what shoppers said. Tap the vendor name for the full page."
        >
          {tablePeek.length ? (
            <ul className="divide-y divide-border border-y border-border">
              {tablePeek.map((line) => (
                <li key={line.vendorSlug + line.item} className="py-3">
                  <Link
                    href={`/vendors/${line.vendorSlug}`}
                    className="text-base font-medium hover:underline"
                  >
                    {line.vendorName}
                  </Link>
                  <p className="text-base">
                    {line.item}
                    {formatPrice(line.priceCents) ? (
                      <span className="ml-2 font-mono text-sm text-ticket">
                        {formatPrice(line.priceCents)}
                      </span>
                    ) : null}
                  </p>
                  {line.note ? (
                    <p className="mt-1 text-base text-muted-foreground">
                      Review: “{line.note}”
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
        </Section>

        <Section
          title="If you are at a market now"
          how="Share your location so we can tell you are really there. Then you can post a note or review."
        >
          <HomeEngage markets={markets} signedIn={signedIn} />
        </Section>

        <section className="xl:col-span-2">
          <h2 className="font-heading text-2xl leading-tight">Map of markets</h2>
          <p className="mt-1 mb-3 text-base text-muted-foreground">
            Tap a pin, then tap the market name in the popup to open its page.
          </p>
          <MarketMapLazy
            markets={markets}
            className="h-56 w-full overflow-hidden rounded-md ring-1 ring-border xl:h-72"
          />
        </section>

        <Section
          title="When vendors are back"
          how="Tap a vendor to see their page, or the market name to see that market."
        >
          {returning.length ? (
            <ul className="divide-y divide-border border-y border-border text-base">
              {returning.map((row) => (
                <li
                  key={row.vendorSlug + row.marketSlug}
                  className="flex flex-wrap items-baseline justify-between gap-2 py-3"
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
                  <span className="text-sm font-medium text-ticket">{row.when}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-base text-muted-foreground">Open a market page to see its hours.</p>
          )}
        </Section>

        <Section
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
                      className="inline-flex min-h-10 items-center rounded-md border border-border bg-card px-3 py-2 text-base hover:bg-secondary"
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
          <p className="mt-4 text-base">
            Most markets are busiest on Saturday.{" "}
            <Link href="/search?weekday=6" className="font-medium text-primary hover:underline">
              Show Saturday markets
            </Link>
          </p>
        </Section>
      </div>
    </div>
  );
}
