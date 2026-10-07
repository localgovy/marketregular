"use client";

import { useEffect, useRef, useState } from "react";
import { getDirectorySlice } from "@/app/actions/directory";
import { MarketCard } from "@/components/market-card";
import { VendorCard } from "@/components/vendor-card";
import { CaretUpMark } from "@/components/marks";
import { ShowMore } from "@/components/show-more";
import type {
  DirectoryMarketCard,
  DirectorySchedule,
  DirectoryVendorCard,
} from "@/lib/directory-page";
import type { MarketsSearch } from "@/lib/find-paths";
import { cn } from "@/lib/utils";

export function DirectoryResults({
  markets: initialMarkets,
  vendors: initialVendors,
  schedulesByMarket: initialSchedules,
  marketTotal,
  vendorTotal,
  search,
  weekdays,
  now,
  sortedAt,
}: {
  markets: DirectoryMarketCard[];
  vendors: DirectoryVendorCard[];
  schedulesByMarket?: Record<string, DirectorySchedule[]>;
  marketTotal: number;
  vendorTotal: number;
  search: MarketsSearch;
  weekdays?: number[];
  /** Fresh clock for open badges on each card. */
  now: string;
  /** Clock the list was ordered with. Later pages keep this order. */
  sortedAt: string;
}) {
  const [markets, setMarkets] = useState(initialMarkets);
  const [vendors, setVendors] = useState(initialVendors);
  const [schedulesByMarket, setSchedulesByMarket] = useState(initialSchedules ?? {});
  const [marketsDone, setMarketsDone] = useState(initialMarkets.length >= marketTotal);
  const [vendorsDone, setVendorsDone] = useState(initialVendors.length >= vendorTotal);
  const [marketsBusy, setMarketsBusy] = useState(false);
  const [vendorsBusy, setVendorsBusy] = useState(false);
  const marketsLock = useRef(false);
  const vendorsLock = useRef(false);
  const [marketError, setMarketError] = useState<string | null>(null);
  const [vendorError, setVendorError] = useState<string | null>(null);

  async function moreMarkets() {
    if (marketsLock.current || marketsDone) return;
    marketsLock.current = true;
    setMarketsBusy(true);
    try {
      const next = await getDirectorySlice({
        search,
        kind: "markets",
        seen: markets.map((market) => market.id),
        now: sortedAt,
      });
      setMarkets((prev) => {
        const seen = new Set(prev.map((market) => market.id));
        const extra = next.markets.filter((market) => !seen.has(market.id));
        return extra.length ? [...prev, ...extra] : prev;
      });
      setSchedulesByMarket((prev) => ({ ...prev, ...next.schedulesByMarket }));
      if (next.done || next.markets.length === 0) setMarketsDone(true);
      setMarketError(null);
    } catch {
      setMarketError("Couldn't load more markets. Try again.");
    } finally {
      marketsLock.current = false;
      setMarketsBusy(false);
    }
  }

  async function moreVendors() {
    if (vendorsLock.current || vendorsDone) return;
    vendorsLock.current = true;
    setVendorsBusy(true);
    try {
      const next = await getDirectorySlice({
        search,
        kind: "vendors",
        seen: vendors.map((vendor) => vendor.id),
        now: sortedAt,
      });
      setVendors((prev) => {
        const seen = new Set(prev.map((vendor) => vendor.id));
        const extra = next.vendors.filter((vendor) => !seen.has(vendor.id));
        return extra.length ? [...prev, ...extra] : prev;
      });
      if (next.done || next.vendors.length === 0) setVendorsDone(true);
      setVendorError(null);
    } catch {
      setVendorError("Couldn't load more vendors. Try again.");
    } finally {
      vendorsLock.current = false;
      setVendorsBusy(false);
    }
  }

  return (
    <>
      <div className="mt-6 grid items-start gap-10 lg:grid-cols-[minmax(0,2fr)_auto_minmax(0,3fr)] lg:gap-x-4">
        <section id="directory-markets" className="scroll-mt-header">
          <h2 className="mb-4">Markets</h2>
          {marketTotal ? (
            <div className="grid gap-4">
              {markets.map((market) => (
                <MarketCard
                  key={market.id}
                  market={market}
                  schedules={schedulesByMarket[market.id]}
                  weekdays={weekdays}
                  now={now}
                />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No markets match those filters.</p>
          )}
          <ShowMore
            shown={markets.length}
            total={marketsDone ? markets.length : marketTotal}
            noun="markets"
            nounOne="market"
            busy={marketsBusy}
            onMore={() => {
              void moreMarkets();
            }}
          />
          {marketError ? <p className="mt-2 text-sm text-muted-foreground">{marketError}</p> : null}
        </section>
        <div aria-hidden data-directory-rule className="hidden w-0.5 self-stretch bg-board lg:block" />
        <section id="directory-vendors" className="scroll-mt-header">
          <h2 className="mb-4">Vendors</h2>
          {vendorTotal ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {vendors.map((vendor) => (
                <VendorCard key={vendor.id} vendor={vendor} halls={vendor.halls} />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No vendors match those filters.</p>
          )}
          <ShowMore
            shown={vendors.length}
            total={vendorsDone ? vendors.length : vendorTotal}
            noun="vendors"
            nounOne="vendor"
            busy={vendorsBusy}
            onMore={() => {
              void moreVendors();
            }}
          />
          {vendorError ? <p className="mt-2 text-sm text-muted-foreground">{vendorError}</p> : null}
        </section>
      </div>
      <BackToTop />
    </>
  );
}

function BackToTop() {
  const [away, setAway] = useState(false);

  useEffect(() => {
    function onScroll() {
      setAway(window.scrollY > 360);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function go() {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  }

  return (
    <button
      type="button"
      aria-label="Back to top"
      tabIndex={away ? 0 : -1}
      aria-hidden={!away}
      onClick={go}
      className={cn(
        "fixed right-4 bottom-5 z-40 inline-flex items-center gap-1.5 stall-chip-sm bg-board px-3 py-2 text-sm font-medium text-chalk shadow-[0_1px_0_rgb(28_25_22/0.2)] outline-none transition duration-200 hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-foreground motion-reduce:transition-none",
        away
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-2 opacity-0",
      )}
    >
      <CaretUpMark className="size-4" />
      Top
    </button>
  );
}
