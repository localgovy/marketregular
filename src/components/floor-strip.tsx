"use client";

import Link from "next/link";
import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import { useSaves } from "@/components/save-button";
import { cn } from "@/lib/utils";
import type { Market } from "@/types/database";

function subscribeReducedMotion(onStoreChange: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", onStoreChange);
  return () => mq.removeEventListener("change", onStoreChange);
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

function MarketName({
  market,
  inert,
}: {
  market: Market;
  inert?: boolean;
}) {
  return (
    <Link
      href={`/markets/${market.slug}`}
      tabIndex={inert ? -1 : undefined}
      className="whitespace-nowrap text-base font-medium hover:text-primary hover:underline hover:underline-offset-4"
    >
      {market.name}
    </Link>
  );
}

function OpenNowTicker({ markets }: { markets: Market[] }) {
  const reduceMotion = usePrefersReducedMotion();
  const viewportRef = useRef<HTMLDivElement>(null);
  const unitRef = useRef<HTMLUListElement>(null);
  const [unitCount, setUnitCount] = useState(1);
  const [duration, setDuration] = useState(24);

  const measure = useCallback(() => {
    const viewport = viewportRef.current;
    const unit = unitRef.current;
    if (!viewport || !unit) return;
    const unitWidth = unit.scrollWidth;
    const viewWidth = viewport.clientWidth;
    if (unitWidth <= 0 || viewWidth <= 0) return;
    const perGroup = Math.max(1, Math.ceil(viewWidth / unitWidth));
    setUnitCount(perGroup);
    setDuration(Math.max(16, Math.round((unitWidth * perGroup) / 40)));
  }, []);

  useLayoutEffect(() => {
    if (reduceMotion) return;
    measure();
    const viewport = viewportRef.current;
    const unit = unitRef.current;
    if (!viewport) return;
    const ro = new ResizeObserver(measure);
    ro.observe(viewport);
    if (unit) ro.observe(unit);
    return () => ro.disconnect();
  }, [measure, markets, reduceMotion]);

  if (reduceMotion) {
    return (
      <ul className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
        {markets.map((market) => (
          <li key={market.id}>
            <MarketName market={market} />
          </li>
        ))}
      </ul>
    );
  }

  const passes = Array.from({ length: unitCount }, (_, pass) => pass);

  return (
    <div
      ref={viewportRef}
      role="group"
      aria-label="Markets open now"
      className="floor-ticker relative min-h-8 min-w-0 flex-1 overflow-hidden py-0.5 [mask-image:linear-gradient(to_right,transparent,black_1.25rem,black_calc(100%-1.25rem),transparent)]"
      style={{ "--floor-ticker-duration": `${duration}s` } as CSSProperties}
    >
      <ul
        ref={unitRef}
        aria-hidden
        className="invisible pointer-events-none absolute flex items-center"
      >
        {markets.map((market) => (
          <li key={market.id} className="flex shrink-0 items-center">
            <span className="px-3 text-base font-medium">{market.name}</span>
            <span className="text-ticket/45">·</span>
          </li>
        ))}
      </ul>
      <div className="floor-ticker-track flex w-max">
        {[0, 1].map((group) => (
          <ul
            key={group}
            aria-hidden={group > 0 ? true : undefined}
            className="flex shrink-0 items-center"
          >
            {passes.flatMap((pass) =>
              markets.map((market) => {
                const inert = group > 0 || pass > 0;
                return (
                  <li
                    key={`${group}-${pass}-${market.id}`}
                    aria-hidden={inert || undefined}
                    className="flex shrink-0 items-center"
                  >
                    <span className="px-3">
                      <MarketName market={market} inert={inert} />
                    </span>
                    <span className="text-ticket/45" aria-hidden>
                      ·
                    </span>
                  </li>
                );
              }),
            )}
          </ul>
        ))}
      </div>
    </div>
  );
}

export function FloorStrip({ openNow }: { openNow: Market[] }) {
  const saves = useSaves();
  const savedCount = saves.markets.length + saves.vendors.length;
  const reduceMotion = usePrefersReducedMotion();
  const moving = openNow.length > 0 && !reduceMotion;

  return (
    <nav aria-label="On the floor" className="mb-5 border-y border-border py-2.5">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div>
          <p className="inline-flex items-center gap-1.5 text-base font-medium text-ticket">
            <span className="live-dot size-1.5 rounded-full bg-ticket" aria-hidden />
            Open now
          </p>
          {moving ? (
            <p className="mt-0.5 text-sm text-muted-foreground">Hover or hold to pause, then tap a name.</p>
          ) : null}
        </div>
        <p className="flex flex-wrap items-baseline gap-x-3 text-sm font-medium">
          <span className="text-muted-foreground">Jump to:</span>
          <a href="#find" className="text-primary hover:underline">
            Find
          </a>
          <a href="#reviews" className="text-primary hover:underline">
            Reviews
          </a>
          <Link href="/events" className="text-primary hover:underline">
            Events
          </Link>
          <Link href="/saved" className="text-primary hover:underline">
            Saved{savedCount ? ` · ${savedCount}` : ""}
          </Link>
        </p>
      </div>
      {openNow.length ? (
        <div className={cn("mt-2 flex min-w-0", moving && "-mx-1")}>
          <OpenNowTicker markets={openNow} />
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">No Toronto market is open this minute.</p>
      )}
    </nav>
  );
}
