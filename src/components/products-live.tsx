"use client";

import Link from "next/link";
import { useMemo } from "react";
import { CaretRightMark, WeekMark } from "@/components/marks";
import { NowLabel } from "@/components/now-label";
import { weekdayInToronto } from "@/lib/find-paths";
import type { ProductMarketClock } from "@/lib/products-atlas-data";
import { provinceTz } from "@/lib/constants";
import { inSeason, isMarketOpen, parseHm, zonedParts, type ScheduleRow } from "@/lib/schedule";
import { useNow } from "@/lib/use-now";

function sessionNotOver(schedules: ScheduleRow[], province: string, now: Date) {
  const tz = provinceTz(province);
  const { weekday, minutes } = zonedParts(now, tz);
  return schedules.some(
    (row) =>
      Number(row.weekday) === weekday &&
      inSeason(now, row.season_start, row.season_end, tz) &&
      minutes <= parseHm(row.closes_at),
  );
}

export function liveStallBadge(
  sellDays: readonly number[],
  marketSlug: string | null,
  clocks: readonly ProductMarketClock[],
  now: Date,
  fallback: string,
) {
  const clock = marketSlug ? clocks.find((item) => item.slug === marketSlug) : undefined;
  if (!clock) return fallback;
  const today = weekdayInToronto(now);
  const sellsToday = sellDays.includes(today);
  const open = sellsToday && isMarketOpen(clock.schedules, clock.province, now);
  const later = sellsToday && !open && sessionNotOver(clock.schedules, clock.province, now);
  if (open) return "Selling now";
  if (later) return "Later today";
  if (sellDays.includes(0) || sellDays.includes(6) || sellDays.includes(today)) return "Selling this weekend";
  return "On the schedule";
}

export function ProductsLiveStatus({
  renderedAt,
  marketClocks,
}: {
  renderedAt: number;
  marketClocks: ProductMarketClock[];
}) {
  const nowMs = useNow(renderedAt);
  const counts = useMemo(() => {
    const now = new Date(nowMs);
    const today = weekdayInToronto(now);
    let openNow = 0;
    let selling = 0;
    for (const market of marketClocks) {
      if (isMarketOpen(market.schedules, market.province, now)) openNow += 1;
      if (sessionNotOver(market.schedules, market.province, now)) {
        selling += market.stallsByWeekday[today] ?? 0;
      }
    }
    return { openNow, selling };
  }, [marketClocks, nowMs]);

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {counts.openNow > 0 ? (
        <Link href="/markets/open-today" className="inline-flex items-center hover:underline">
          <NowLabel>
            <span>
              <span className="type-nums">{counts.openNow}</span>{" "}
              {counts.openNow === 1 ? "market open now" : "markets open now"}
            </span>
          </NowLabel>
        </Link>
      ) : counts.selling > 0 ? (
        <Link
          href="/markets/open-today"
          className="stall-chip-sm inline-flex items-center gap-1.5 bg-card px-3 py-1 text-sm font-medium text-foreground ring-1 ring-border hover:bg-secondary"
        >
          <WeekMark className="size-3.5 text-primary" />
          <span>{counts.selling} stalls active today</span>
        </Link>
      ) : null}
      <Link
        href="/markets"
        className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
      >
        <span>See this week&apos;s markets</span>
        <CaretRightMark className="size-3.5" />
      </Link>
    </div>
  );
}

export function LiveStallBadge({
  renderedAt,
  marketClocks,
  sellDays,
  marketSlug,
  fallback,
}: {
  renderedAt: number;
  marketClocks: ProductMarketClock[];
  sellDays: number[];
  marketSlug: string | null;
  fallback: string;
}) {
  const nowMs = useNow(renderedAt);
  const label = liveStallBadge(sellDays, marketSlug, marketClocks, new Date(nowMs), fallback);
  return <p className="mt-0.5 text-sm text-muted-foreground">{label}</p>;
}
