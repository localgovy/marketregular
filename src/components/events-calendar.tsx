"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CaretLeftMark, CaretRightMark } from "@/components/marks";
import { Hours } from "@/components/hours";
import { NowLabel } from "@/components/now-label";
import { Button } from "@/components/ui/button";
import { WEEKDAYS } from "@/lib/constants";
import {
  findMarketDay,
  isoDate,
  monthGrid,
  monthLabel,
  parseYearMonth,
  shiftDay,
  shiftMonth,
  torontoYmd,
  type CalendarCell,
  type EventMarket,
} from "@/lib/events-month";
import { cn } from "@/lib/utils";
import type { MarketSchedule } from "@/types/database";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function MarketPips({ count, on }: { count: number; on: boolean }) {
  if (!count) return null;
  const shown = Math.min(count, 3);
  return (
    <span className="mt-auto flex items-center gap-1">
      {Array.from({ length: shown }, (_, i) => (
        <span
          key={i}
          className={cn("size-1.5 rounded-full", on ? "bg-ticket" : "bg-ticket/90")}
        />
      ))}
      {count > 3 ? (
        <span className={cn("font-mono text-sm tabular-nums", on ? "text-chalk" : "text-ticket-ink")}>
          {count}
        </span>
      ) : null}
    </span>
  );
}

export function EventsCalendar({
  markets,
  schedules,
  initialMonth,
  initialDay,
}: {
  markets: EventMarket[];
  schedules: MarketSchedule[];
  initialMonth?: string;
  initialDay?: string;
}) {
  const pathname = usePathname();
  const todayIso = torontoYmd();
  const [ty, tm] = todayIso.split("-").map(Number);
  const seed = parseYearMonth(initialMonth);
  const [year, setYear] = useState(seed.year);
  const [month, setMonth] = useState(seed.month);
  const [slide, setSlide] = useState<"in" | "next" | "prev">("in");
  const [selected, setSelected] = useState(() => {
    const day = Number(initialDay);
    if (Number.isFinite(day) && day >= 1 && day <= 31) {
      return isoDate(seed.year, seed.month, day);
    }
    if (seed.year === ty && seed.month === tm) return todayIso;
    return isoDate(seed.year, seed.month, 1);
  });
  const dayPanel = useRef<HTMLElement>(null);
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const skipClick = useRef(false);

  const cells = useMemo(
    () => monthGrid(year, month, markets, schedules),
    [year, month, markets, schedules],
  );
  const selectedCell = cells.find((cell) => cell.iso === selected) ?? cells.find((cell) => cell.inMonth);
  const monthEvents = cells.filter((cell) => cell.inMonth && cell.events.length).length;

  useEffect(() => {
    const day = Number(selected.slice(8, 10));
    const params = new URLSearchParams();
    params.set("m", `${year}-${pad(month)}`);
    if (Number.isFinite(day)) params.set("d", String(day));
    window.history.replaceState(null, "", `${pathname}?${params.toString()}`);
  }, [year, month, selected, pathname]);

  function show(cell: Pick<CalendarCell, "year" | "month" | "iso">, dir: "in" | "next" | "prev" = "in") {
    if (cell.year !== year || cell.month !== month) setSlide(dir);
    setYear(cell.year);
    setMonth(cell.month);
    setSelected(cell.iso);
  }

  function goMonth(delta: number) {
    const next = shiftMonth(year, month, delta);
    const last = new Date(Date.UTC(next.year, next.month, 0)).getUTCDate();
    const day = Math.min(Number(selected.slice(8, 10)) || 1, last);
    setSlide(delta > 0 ? "next" : "prev");
    setYear(next.year);
    setMonth(next.month);
    setSelected(isoDate(next.year, next.month, day));
  }

  function goToday() {
    setSlide("in");
    setYear(ty);
    setMonth(tm);
    setSelected(todayIso);
  }

  function pick(cell: CalendarCell) {
    const dir =
      cell.year > year || (cell.year === year && cell.month > month)
        ? "next"
        : cell.year < year || cell.month < month
          ? "prev"
          : "in";
    show(cell, dir);
    if (typeof window !== "undefined" && !window.matchMedia("(min-width: 1280px)").matches) {
      requestAnimationFrame(() => {
        dayPanel.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    }
  }

  function moveDay(delta: number) {
    if (!selectedCell) return;
    const next = shiftDay(selectedCell.year, selectedCell.month, selectedCell.day, delta);
    const dir = delta > 0 ? "next" : "prev";
    const crossed = next.month !== month || next.year !== year;
    show({ ...next, iso: isoDate(next.year, next.month, next.day) }, crossed ? dir : "in");
  }

  function jumpMarket(direction: 1 | -1) {
    if (!selectedCell) return;
    const hit = findMarketDay(selectedCell, direction, markets, schedules);
    if (!hit) return;
    const dir = direction > 0 ? "next" : "prev";
    show(hit, hit.month !== month || hit.year !== year ? dir : "in");
  }

  const selectedTitle = selectedCell
    ? `${WEEKDAYS[selectedCell.weekday]} ${selectedCell.day} ${monthLabel(selectedCell.year, selectedCell.month)}`
    : "";

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)]">
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Previous month"
              onClick={() => goMonth(-1)}
            >
              <CaretLeftMark />
            </Button>
            <p className="type-column min-w-[12.5rem] text-center">{monthLabel(year, month)}</p>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Next month"
              onClick={() => goMonth(1)}
            >
              <CaretRightMark />
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <p className="type-kicker text-muted-foreground">
              {monthEvents} {monthEvents === 1 ? "day with a market" : "days with a market"}
            </p>
            <Button type="button" variant="outline" onClick={goToday}>
              Today
            </Button>
          </div>
        </div>

        <div
          role="grid"
          aria-label={`${monthLabel(year, month)} market calendar`}
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") {
              event.preventDefault();
              moveDay(-1);
            } else if (event.key === "ArrowRight") {
              event.preventDefault();
              moveDay(1);
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              moveDay(-7);
            } else if (event.key === "ArrowDown") {
              event.preventDefault();
              moveDay(7);
            } else if (event.key === "PageUp") {
              event.preventDefault();
              goMonth(-1);
            } else if (event.key === "PageDown") {
              event.preventDefault();
              goMonth(1);
            } else if (event.key === "Home") {
              event.preventDefault();
              goToday();
            }
          }}
          onPointerDown={(event) => {
            if (event.pointerType !== "touch") return;
            swipe.current = { x: event.clientX, y: event.clientY };
          }}
          onPointerUp={(event) => {
            if (!swipe.current) return;
            const dx = event.clientX - swipe.current.x;
            const dy = event.clientY - swipe.current.y;
            swipe.current = null;
            if (Math.abs(dx) < 56 || Math.abs(dx) < Math.abs(dy)) return;
            skipClick.current = true;
            goMonth(dx < 0 ? 1 : -1);
          }}
          onPointerCancel={() => {
            swipe.current = null;
          }}
          className="touch-pan-y bg-card/45 ring-1 ring-border/80 shadow-[0_0_0_1px_color-mix(in_srgb,var(--chalk)_55%,transparent)] backdrop-blur-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div role="row" className="grid grid-cols-7 border-b border-border/70 bg-card/50">
            {WEEKDAYS.map((name) => (
              <div
                key={name}
                role="columnheader"
                className="type-kicker px-2 py-2 text-muted-foreground"
              >
                {name.slice(0, 3)}
              </div>
            ))}
          </div>
          <div
            key={`${year}-${month}`}
            className={cn(
              "grid grid-cols-7 gap-px bg-border/50",
              slide === "next" && "cal-next",
              slide === "prev" && "cal-prev",
              slide === "in" && "cal-in",
            )}
          >
            {cells.map((cell) => {
              const on = cell.iso === selected;
              const count = cell.events.length;
              return (
                <button
                  key={cell.iso}
                  type="button"
                  role="gridcell"
                  aria-selected={on}
                  aria-current={cell.isToday ? "date" : undefined}
                  aria-label={`${WEEKDAYS[cell.weekday]} ${cell.day}${count ? `, ${count} ${count === 1 ? "market" : "markets"}` : ""}`}
                  onClick={() => {
                    if (skipClick.current) {
                      skipClick.current = false;
                      return;
                    }
                    pick(cell);
                  }}
                  className={cn(
                    "flex min-h-[4.75rem] flex-col items-start gap-1 px-2 py-2 text-left transition-[background-color,color,transform,box-shadow] duration-200 ease-out motion-safe:hover:-translate-y-px sm:min-h-[5.5rem]",
                    on
                      ? "bg-board text-chalk shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--ticket)_75%,white)]"
                      : cell.isToday
                        ? "bg-ticket/14 text-foreground"
                        : count
                          ? "bg-ticket/[0.07] text-foreground hover:bg-ticket/14"
                          : "bg-background/35 text-foreground hover:bg-card/80",
                    !cell.inMonth && !on && "text-muted-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "font-mono text-sm tabular-nums",
                      on && "text-chalk",
                      cell.isToday && !on && "font-medium text-ticket-ink",
                    )}
                  >
                    {cell.day}
                  </span>
                  <MarketPips count={count} on={on} />
                </button>
              );
            })}
          </div>
        </div>
        <p className="type-kicker mt-3 text-muted-foreground">
          Gold marks a market day. Swipe or use arrows; Page Up and Page Down change month.
        </p>
      </div>

      <aside
        ref={dayPanel}
        className="cal-in bg-card/55 p-5 ring-1 ring-border/80 shadow-[0_0_0_1px_color-mix(in_srgb,var(--chalk)_45%,transparent)] backdrop-blur-xl xl:sticky xl:top-20"
        aria-live="polite"
      >
        <p className="type-kicker text-muted-foreground">That day</p>
        <h3 className="mt-1">{selectedTitle}</h3>
        {selectedCell?.events.length ? (
          <p className="mt-1 text-base text-muted-foreground">
            {selectedCell.events.length}{" "}
            {selectedCell.events.length === 1 ? "market" : "markets"}
          </p>
        ) : (
          <p className="mt-2 text-base text-muted-foreground">No market that day.</p>
        )}
        {selectedCell?.events.length ? (
          <ul className="cal-in mt-4" key={selected}>
            {selectedCell.events.map((event) => (
              <li
                key={`${selectedCell.iso}-${event.marketId}`}
                className="border-b border-border/70 py-3 last:border-b-0"
              >
                <Link
                  href={`/markets/${event.marketSlug}`}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3"
                >
                  <span className="min-w-0">
                    <span className="block text-base font-medium text-ticket-ink underline-offset-2 hover:underline">
                      {event.marketName}
                    </span>
                    <span className="block text-sm text-muted-foreground">{event.address}</span>
                    {event.notes ? (
                      <span className="mt-0.5 block text-sm text-muted-foreground">{event.notes}</span>
                    ) : null}
                  </span>
                  <span className="flex shrink-0 flex-wrap items-baseline justify-end gap-x-1.5">
                    {event.open ? (
                      <NowLabel>Open</NowLabel>
                    ) : null}
                    <Hours value={event.hours} className="text-muted-foreground" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => jumpMarket(-1)}>
              Previous market day
            </Button>
            <Button type="button" onClick={() => jumpMarket(1)}>
              Next market day
            </Button>
          </div>
        )}
      </aside>
    </div>
  );
}
