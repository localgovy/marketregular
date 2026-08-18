import Link from "next/link";
import { HomeEngage } from "@/components/home-engage";
import { MarketMapLazy } from "@/components/market-map-lazy";
import { MarketRow } from "@/components/market-row";
import { QuickFind } from "@/components/quick-find";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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

export function VisitWayfind() {
  const links = [
    { href: "#before", n: "1", label: "Before the market" },
    { href: "#at", n: "2", label: "At the market" },
    { href: "#after", n: "3", label: "After" },
  ];
  return (
    <nav
      aria-label="When you use this"
      className="mb-4 flex flex-wrap items-stretch gap-px border border-border bg-border"
    >
      {links.map((link, i) => (
        <a
          key={link.href}
          href={link.href}
          className="flex min-w-0 flex-1 items-baseline gap-2 bg-foreground px-3 py-2.5 text-[#f2f0ea] hover:bg-foreground/90"
        >
          <span className="font-mono text-xs tracking-wide">{link.n}</span>
          <span className="font-heading text-sm sm:text-base">{link.label}</span>
          {i < links.length - 1 ? (
            <span className="ml-auto hidden text-[11px] text-[#f2f0ea]/60 sm:inline">→</span>
          ) : null}
        </a>
      ))}
    </nav>
  );
}

function Plate({
  id,
  n,
  title,
  lede,
  children,
}: {
  id: string;
  n: string;
  title: string;
  lede: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20 border border-border bg-card">
      <header className="flex items-baseline gap-3 bg-foreground px-4 py-2.5 text-[#f2f0ea]">
        <span className="font-mono text-sm tracking-wide">{n}</span>
        <h2 className="font-heading text-xl leading-tight">{title}</h2>
      </header>
      <p className="border-b border-border px-4 py-2 text-sm">{lede}</p>
      {children}
    </section>
  );
}

function Step({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-border px-4 py-3">
      <p className="text-[11px] font-medium tracking-[0.14em] text-primary uppercase">
        {n} · {title}
      </p>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function StallNames({ stalls }: { stalls: StallRef[] }) {
  if (!stalls.length) {
    return <p className="text-sm text-muted-foreground">Vendor list is still filling in.</p>;
  }
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
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

function KeepStub({ signedIn }: { signedIn: boolean }) {
  if (signedIn) {
    return (
      <p className="text-sm text-muted-foreground">
        A saved stall list is next. Until then, open the stall page and keep the tab.
      </p>
    );
  }
  return (
    <p className="text-sm">
      <Link href="/login" className="font-medium text-primary hover:underline">
        Sign in
      </Link>
      <span className="text-muted-foreground">. A saved stall list is next.</span>
    </p>
  );
}

export function VisitBefore({
  cities,
  provinces,
  tags,
  openNow,
  scheduleMap,
  showcase,
  attending,
  tablePeek,
  signedIn,
}: {
  cities: string[];
  provinces: string[];
  tags: string[];
  openNow: Market[];
  scheduleMap: Map<string, MarketSchedule[]>;
  showcase: Market;
  attending: StallRef[];
  tablePeek: TablePeek[];
  signedIn: boolean;
}) {
  return (
    <Plate
      id="before"
      n="1"
      title="Before the market"
      lede="Find a market. See who’s there. Read the tables. Keep a stall."
    >
      <Step n="1" title="Find a market">
        <QuickFind cities={cities} provinces={provinces} tags={tags} />
        <div className="mt-4">
          <div className="mb-1 flex items-baseline justify-between gap-3">
            <p className="text-xs text-muted-foreground">Open now</p>
            <Link href="/search?openNow=1" className="text-xs text-muted-foreground hover:underline">
              See all
            </Link>
          </div>
          {openNow.length ? (
            openNow.slice(0, 5).map((market) => (
              <MarketRow
                key={market.id}
                market={market}
                schedules={scheduleMap.get(market.id)}
                open
              />
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              Nothing open this minute. Try Saturday, or pick a city above.
            </p>
          )}
        </div>
      </Step>
      <Step n="2" title="See who’s there">
        <p className="mb-2 text-sm">
          Right now we’re looking at{" "}
          <Link href={`/markets/${showcase.slug}`} className="font-medium text-primary hover:underline">
            {showcase.name}
          </Link>
          <span className="text-muted-foreground">
            {" "}
            · {showcase.city}
          </span>
          .
        </p>
        <StallNames stalls={attending} />
        <Link
          href={`/markets/${showcase.slug}`}
          className="mt-2 inline-block text-xs text-muted-foreground hover:underline"
        >
          All stalls at this hall →
        </Link>
      </Step>
      <Step n="3" title="Read the tables">
        {tablePeek.length ? (
          <ul className="divide-y divide-border border-y border-border">
            {tablePeek.map((line) => (
              <li key={line.vendorSlug + line.item} className="py-2">
                <Link href={`/vendors/${line.vendorSlug}`} className="text-sm font-medium hover:underline">
                  {line.vendorName}
                </Link>
                <p className="text-sm">
                  {line.item}
                  {formatPrice(line.priceCents) ? (
                    <span className="ml-2 font-mono text-xs text-ticket">{formatPrice(line.priceCents)}</span>
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
          <p className="text-sm text-muted-foreground">Open a stall for menus and reviews.</p>
        )}
      </Step>
      <Step n="4" title="Keep a stall">
        <KeepStub signedIn={signedIn} />
      </Step>
    </Plate>
  );
}

export function VisitAt({
  markets,
  signedIn,
  attending,
}: {
  markets: Market[];
  signedIn: boolean;
  attending: StallRef[];
}) {
  return (
    <Plate
      id="at"
      n="2"
      title="At the market"
      lede="You’re on the floor. Open the stall. Leave a note. Keep what you liked."
    >
      <Step n="1" title="Scan a stall code">
        <p className="text-sm text-muted-foreground">
          QR on the stall is next. Until then, tap the stall name.
        </p>
        <div className="mt-2">
          <StallNames stalls={attending} />
        </div>
      </Step>
      <Step n="2" title="See the stall">
        <p className="text-sm text-muted-foreground">
          Hours, menu, phone, and reviews live on the stall page. Same names as above.
        </p>
      </Step>
      <Step n="3" title="Leave a review or photo">
        <p className="mb-2 text-sm">
          Write it on{" "}
          <a href="#tape" className="font-medium text-primary hover:underline">
            the tape
          </a>
          — left column on a wide screen, below this on a phone.
        </p>
        <HomeEngage markets={markets} signedIn={signedIn} />
      </Step>
      <Step n="4" title="Keep what you liked">
        <KeepStub signedIn={signedIn} />
      </Step>
      <div className="border-t border-border px-4 py-3">
        <p className="mb-2 text-[11px] font-medium tracking-[0.14em] text-primary uppercase">
          Map
        </p>
        <MarketMapLazy
          markets={markets}
          className="h-52 w-full overflow-hidden rounded-sm ring-1 ring-border"
        />
      </div>
    </Plate>
  );
}

export function VisitAfter({
  returning,
  spotlightName,
  spotlightSlug,
  otherHalls,
}: {
  returning: ReturningRow[];
  spotlightName: string | null;
  spotlightSlug: string | null;
  otherHalls: HallLink[];
}) {
  return (
    <Plate
      id="after"
      n="3"
      title="After the market"
      lede="Notes stay on the tape. See when they’re back. Try the next hall. Come Saturday."
    >
      <Step n="1" title="Reviews live on the tape">
        <p className="text-sm">
          That’s{" "}
          <a href="#tape" className="font-medium text-primary hover:underline">
            the left column
          </a>
          . On a phone, scroll to the tape.
        </p>
      </Step>
      <Step n="2" title="Follow a stall">
        <p className="text-sm text-muted-foreground">
          Follow (next hall they set up) isn’t live yet.
          {spotlightSlug ? (
            <>
              {" "}
              Open{" "}
              <Link href={`/vendors/${spotlightSlug}`} className="font-medium text-primary hover:underline">
                {spotlightName}
              </Link>{" "}
              for now.
            </>
          ) : null}
        </p>
      </Step>
      <Step n="3" title="When they’re returning">
        {returning.length ? (
          <ul className="divide-y divide-border border-y border-border text-sm">
            {returning.map((row) => (
              <li key={row.vendorSlug + row.marketSlug} className="flex flex-wrap items-baseline justify-between gap-2 py-2">
                <span>
                  <Link href={`/vendors/${row.vendorSlug}`} className="font-medium hover:underline">
                    {row.vendorName}
                  </Link>
                  <span className="text-muted-foreground"> · </span>
                  <Link href={`/markets/${row.marketSlug}`} className="text-muted-foreground hover:underline">
                    {row.marketName}
                  </Link>
                </span>
                <span className="font-mono text-xs text-ticket">{row.when}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Hours are on each market page.</p>
        )}
      </Step>
      <Step n="4" title="Other halls they work">
        {spotlightName && otherHalls.length ? (
          <div>
            <p className="mb-1 text-sm text-muted-foreground">{spotlightName} also sets up at</p>
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
          <p className="text-sm text-muted-foreground">Open a stall to see every hall they work.</p>
        )}
      </Step>
      <Step n="5" title="Come back next weekend">
        <Link href="/search?weekday=6" className={cn(buttonVariants(), "inline-flex")}>
          Saturday markets
        </Link>
      </Step>
    </Plate>
  );
}
