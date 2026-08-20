"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import { CaretDownMark } from "@/components/marks";
import { cn } from "@/lib/utils";
import type { Market } from "@/types/database";

const SPEEDS = [
  { id: "slow", label: "Slow", px: 28 },
  { id: "regular", label: "Regular", px: 48 },
  { id: "fast", label: "Fast", px: 96 },
] as const;

type SpeedId = (typeof SPEEDS)[number]["id"];

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

function OpenNowTicker({
  markets,
  pxPerSecond,
}: {
  markets: Market[];
  pxPerSecond: number;
}) {
  const reduceMotion = usePrefersReducedMotion();
  const viewportRef = useRef<HTMLDivElement>(null);
  const unitRef = useRef<HTMLUListElement>(null);
  const [unitCount, setUnitCount] = useState(1);
  const [groupWidth, setGroupWidth] = useState(960);

  const measure = useCallback(() => {
    const viewport = viewportRef.current;
    const unit = unitRef.current;
    if (!viewport || !unit) return;
    const unitWidth = unit.scrollWidth;
    const viewWidth = viewport.clientWidth;
    if (unitWidth <= 0 || viewWidth <= 0) return;
    const perGroup = Math.max(1, Math.ceil(viewWidth / unitWidth));
    setUnitCount(perGroup);
    setGroupWidth(unitWidth * perGroup);
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

  const duration = Math.max(8, groupWidth / pxPerSecond);
  const passes = Array.from({ length: unitCount }, (_, pass) => pass);

  return (
    <div
      ref={viewportRef}
      role="group"
      aria-label="Markets open now"
      className="floor-ticker relative min-h-9 min-w-0 flex-1 overflow-hidden py-1 [mask-image:linear-gradient(to_right,transparent,black_1.5rem,black_calc(100%-1.5rem),transparent)]"
      style={{ "--floor-ticker-duration": `${duration}s` } as CSSProperties}
    >
      <ul
        ref={unitRef}
        aria-hidden
        className="invisible pointer-events-none absolute flex items-center"
      >
        {markets.map((market) => (
          <li key={market.id} className="flex shrink-0 items-center">
            <span className="px-3.5 text-base font-medium">{market.name}</span>
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
                    <span className="px-3.5">
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

function SpeedControls({
  value,
  onChange,
}: {
  value: SpeedId;
  onChange: (id: SpeedId) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const current = SPEEDS.find((speed) => speed.id === value) ?? SPEEDS[1];

  useEffect(() => {
    if (!open) return;
    function close(event: PointerEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls="floor-speed-menu"
        aria-label={`How fast the names move, ${current.label}`}
        onClick={() => setOpen((was) => !was)}
        className={cn(
          "stall-chip-sm inline-flex h-8 items-center gap-1 px-2.5 text-sm font-medium",
          open
            ? "bg-ticket text-receipt"
            : "bg-secondary text-foreground hover:bg-muted",
        )}
      >
        {current.label}
        <CaretDownMark
          className={cn("size-3.5 transition-transform duration-150 ease-out", open && "rotate-180")}
        />
      </button>
      {open ? (
        <div
          id="floor-speed-menu"
          role="menu"
          aria-label="How fast the names move"
          className="speed-menu absolute top-[calc(100%+0.35rem)] right-0 z-30 min-w-28 rounded-md bg-card p-1 shadow-md ring-1 ring-border"
        >
          {SPEEDS.map((speed) => {
            const on = speed.id === value;
            return (
              <button
                key={speed.id}
                type="button"
                role="menuitemradio"
                aria-checked={on}
                onClick={() => {
                  onChange(speed.id);
                  setOpen(false);
                }}
                className={cn(
                  "stall-chip-sm flex h-8 w-full items-center px-2.5 text-sm font-medium",
                  on
                    ? "bg-ticket text-receipt"
                    : "text-foreground hover:bg-muted",
                )}
              >
                {speed.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function FloorStrip({ openNow }: { openNow: Market[] }) {
  const reduceMotion = usePrefersReducedMotion();
  const [speed, setSpeed] = useState<SpeedId>("regular");
  const moving = openNow.length > 0 && !reduceMotion;
  const pxPerSecond = SPEEDS.find((item) => item.id === speed)?.px ?? 48;
  const countLabel = openNow.length === 1 ? "market" : "markets";

  return (
    <nav
      aria-label="On the floor"
      className="mb-5 bg-card shadow-[inset_4px_0_0_var(--ticket)] ring-1 ring-border"
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2.5 sm:px-4">
        <p className="min-w-0 text-base font-medium text-ticket">
          <span className="font-mono tabular-nums">{openNow.length}</span>
          {` ${countLabel} open now`}
        </p>
        {moving ? (
          <div className="ml-auto">
            <SpeedControls value={speed} onChange={setSpeed} />
          </div>
        ) : null}
      </div>
      {openNow.length ? (
        <div className="border-t border-border bg-[color-mix(in_srgb,var(--ticket)_7%,var(--card))] px-2 py-2 sm:px-3">
          <OpenNowTicker markets={openNow} pxPerSecond={pxPerSecond} />
          {moving ? (
            <p className="mt-1.5 px-1 text-sm text-muted-foreground">
              Hover or hold the names to pause, then tap one.
            </p>
          ) : null}
        </div>
      ) : (
        <p className="border-t border-border px-4 py-3 text-sm text-muted-foreground">
          No Toronto market is open this minute.
        </p>
      )}
    </nav>
  );
}
