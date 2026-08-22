"use client";

import { useEffect, useState } from "react";
import { MarketCard } from "@/components/market-card";
import { VendorCard } from "@/components/vendor-card";
import { CaretUpMark } from "@/components/marks";
import { cn } from "@/lib/utils";
import type { DirectoryVendor } from "@/lib/vendor-halls";
import type { Market } from "@/types/database";

const PAGE = 15;

export function DirectoryResults({
  markets,
  vendors,
}: {
  markets: Market[];
  vendors: DirectoryVendor[];
}) {
  const [pages, setPages] = useState(1);
  const shownMarkets = markets.slice(0, pages * PAGE);
  const shownVendors = vendors.slice(0, pages * PAGE);
  const more =
    shownMarkets.length < markets.length || shownVendors.length < vendors.length;

  return (
    <>
      <div className="mt-6 grid items-start gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-x-8">
        <section id="directory-markets" className="scroll-mt-24">
          <h2 className="mb-4">Markets</h2>
          {markets.length ? (
            <div className="grid gap-4">
              {shownMarkets.map((market) => (
                <MarketCard key={market.id} market={market} />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No markets match those filters.</p>
          )}
        </section>
        <section id="directory-vendors" className="scroll-mt-24">
          <h2 className="mb-4">Vendors</h2>
          {vendors.length ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {shownVendors.map((vendor) => (
                <VendorCard key={vendor.id} vendor={vendor} halls={vendor.halls} />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No vendors match those filters.</p>
          )}
        </section>
      </div>
      {more ? (
        <div className="mt-10 flex flex-col items-start gap-2">
          <button
            type="button"
            onClick={() => setPages((n) => n + 1)}
            className="stall-chip inline-flex h-11 min-w-[10rem] cursor-pointer items-center justify-center bg-primary px-5 text-sm font-medium text-primary-foreground outline-none hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-foreground"
          >
            Show more
          </button>
          <p className="text-sm text-muted-foreground">
            {shownMarkets.length} of {markets.length} markets · {shownVendors.length} of{" "}
            {vendors.length} vendors
          </p>
        </div>
      ) : null}
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
