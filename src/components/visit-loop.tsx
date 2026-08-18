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

function StallNames({ stalls }: { stalls: StallRef[] }) {
  if (!stalls.length) {
    return <p className="text-sm text-muted-foreground">Vendor list is still filling in.</p>;
  }
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1.5 text-sm">
      {stalls.map((stall) => (
        <li key={`${stall.market_id}-${stall.id}`}>
          <Link href={`/vendors/${stall.slug}`} className="font-medium hover:text-primary hover:underline">
            {stall.name}
          </Link>
          {stall.stall ? (
            <span className="ml-1 font-mono text-[11px] text-muted-foreground">{stall.stall}</span>
          ) : null}
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
      <QuickFind cities={cities} provinces={provinces} tags={tags} />

      <div className="mt-8 grid items-start gap-x-10 gap-y-10 xl:grid-cols-2">
        <section>
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <h2 className="font-heading text-lg">Open now</h2>
            <Link href="/search?openNow=1" className="text-xs text-muted-foreground hover:underline">
              See all
            </Link>
          </div>
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
            <p className="text-sm text-muted-foreground">
              Quiet this minute.{" "}
              <Link href="/search?weekday=6" className="text-primary hover:underline">
                Saturday
              </Link>{" "}
              is usually the rush.
            </p>
          )}
        </section>

        <section>
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <h2 className="font-heading text-lg">
              <Link href={`/markets/${showcase.slug}`} className="hover:underline">
                {showcase.name}
              </Link>
            </h2>
            <span className="text-xs text-muted-foreground">{showcase.city}</span>
          </div>
          <p className="mb-2 text-sm text-muted-foreground">Who’s at this hall</p>
          <StallNames stalls={attending} />
          <Link
            href={`/markets/${showcase.slug}`}
            className="mt-2 inline-block text-xs text-muted-foreground hover:underline"
          >
            Whole stall list
          </Link>
        </section>

        <section>
          <h2 className="mb-2 font-heading text-lg">On the tables</h2>
          {tablePeek.length ? (
            <ul className="divide-y divide-border border-y border-border">
              {tablePeek.map((line) => (
                <li key={line.vendorSlug + line.item} className="py-2.5">
                  <Link href={`/vendors/${line.vendorSlug}`} className="text-sm font-medium hover:underline">
                    {line.vendorName}
                  </Link>
                  <p className="text-sm">
                    {line.item}
                    {formatPrice(line.priceCents) ? (
                      <span className="ml-2 font-mono text-xs text-ticket">
                        {formatPrice(line.priceCents)}
                      </span>
                    ) : null}
                  </p>
                  {line.note ? (
                    <p className="mt-0.5 font-heading text-[13px] text-muted-foreground italic">
                      “{line.note}”
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Tap a stall for menus and reviews.</p>
          )}
        </section>

        <section>
          <h2 className="mb-2 font-heading text-lg">On the floor</h2>
          <p className="mb-3 text-sm text-muted-foreground">
            Already there? Stamp in. Leave the note on the tape.
          </p>
          <HomeEngage markets={markets} signedIn={signedIn} />
        </section>

        <section className="xl:col-span-2">
          <h2 className="mb-2 font-heading text-lg">Map</h2>
          <MarketMapLazy
            markets={markets}
            className="h-56 w-full overflow-hidden rounded-sm ring-1 ring-border xl:h-72"
          />
        </section>

        <section>
          <h2 className="mb-2 font-heading text-lg">Back soon</h2>
          {returning.length ? (
            <ul className="divide-y divide-border border-y border-border text-sm">
              {returning.map((row) => (
                <li
                  key={row.vendorSlug + row.marketSlug}
                  className="flex flex-wrap items-baseline justify-between gap-2 py-2"
                >
                  <span>
                    <Link href={`/vendors/${row.vendorSlug}`} className="font-medium hover:underline">
                      {row.vendorName}
                    </Link>
                    <span className="text-muted-foreground"> · </span>
                    <Link
                      href={`/markets/${row.marketSlug}`}
                      className="text-muted-foreground hover:underline"
                    >
                      {row.marketName}
                    </Link>
                  </span>
                  <span className="font-mono text-xs text-ticket">{row.when}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Hours live on each market page.</p>
          )}
        </section>

        <section>
          <h2 className="mb-2 font-heading text-lg">Also around</h2>
          {spotlightName && otherHalls.length ? (
            <div>
              <p className="mb-2 text-sm text-muted-foreground">
                {spotlightSlug ? (
                  <Link href={`/vendors/${spotlightSlug}`} className="font-medium text-foreground hover:underline">
                    {spotlightName}
                  </Link>
                ) : (
                  spotlightName
                )}{" "}
                also sets up at
              </p>
              <ul className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
                {otherHalls.map((hall) => (
                  <li key={hall.slug}>
                    <Link href={`/markets/${hall.slug}`} className="hover:text-primary hover:underline">
                      {hall.name}
                    </Link>
                    <span className="ml-1 text-xs text-muted-foreground">{hall.city}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Stall pages list every hall they work.
            </p>
          )}
          <p className="mt-4 text-sm">
            <Link href="/search?weekday=6" className="text-primary hover:underline">
              Saturday markets
            </Link>
            <span className="text-muted-foreground"> — the usual rush.</span>
          </p>
        </section>
      </div>
    </div>
  );
}
