"use client";

import Link from "next/link";
import { useMemo } from "react";
import { BlocksMark, CaretRightMark, WeekMark } from "@/components/marks";
import { NowLabel } from "@/components/now-label";
import { StallEmblem } from "@/components/stall-emblem";
import { SaveButton } from "@/components/save-button";
import { VerifiedName } from "@/components/verified-stamp";
import { formatPrice } from "@/lib/format";
import type { ProductMarketClock, ProductsAtlasStallPreview } from "@/lib/products-atlas-data";
import { LAUNCH_TZ } from "@/lib/launch";
import { inSeason, isMarketOpen, parseHm, zonedParts } from "@/lib/schedule";
import { useNow } from "@/lib/use-now";

/** Same clock as the directory's "selling today" list: Toronto weekday and Toronto minutes. */
function sellingState(
  halls: readonly { slug: string; days: readonly number[] }[],
  clocks: readonly ProductMarketClock[],
  now: Date,
) {
  const { weekday, minutes } = zonedParts(now, LAUNCH_TZ);
  let later = false;
  const weekend = halls.some(
    (hall) => hall.days.includes(0) || hall.days.includes(6) || hall.days.includes(weekday),
  );
  for (const hall of halls) {
    if (!hall.days.includes(weekday)) continue;
    const clock = clocks.find((item) => item.slug === hall.slug);
    if (!clock) continue;
    const row = clock.schedules.find(
      (schedule) =>
        Number(schedule.weekday) === weekday &&
        inSeason(now, schedule.season_start, schedule.season_end, LAUNCH_TZ),
    );
    if (!row || minutes > parseHm(row.closes_at)) continue;
    if (minutes >= parseHm(row.opens_at)) return "now" as const;
    later = true;
  }
  if (later) return "later" as const;
  if (weekend) return "weekend" as const;
  return "schedule" as const;
}

export function liveStallBadge(
  halls: readonly { slug: string; days: readonly number[] }[],
  clocks: readonly ProductMarketClock[],
  now: Date,
  fallback: string,
) {
  if (!halls.length) return fallback;
  const state = sellingState(halls, clocks, now);
  if (state === "now") return "Selling now";
  if (state === "later") return "Later today";
  if (state === "weekend") return "Selling this weekend";
  return "On the schedule";
}

export function featuredStallRank(
  halls: readonly { slug: string; days: readonly number[] }[],
  clocks: readonly ProductMarketClock[],
  now: Date,
  fallback: string,
) {
  const label = liveStallBadge(halls, clocks, now, fallback);
  if (label === "Selling now") return 0;
  if (label === "Later today") return 1;
  if (label === "Selling this weekend") return 2;
  return 3;
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
    const { weekday, minutes } = zonedParts(now, LAUNCH_TZ);
    let openNow = 0;
    let selling = 0;
    for (const market of marketClocks) {
      if (isMarketOpen(market.schedules, market.province, now)) openNow += 1;
      const row = market.schedules.find(
        (schedule) =>
          Number(schedule.weekday) === weekday &&
          inSeason(now, schedule.season_start, schedule.season_end, LAUNCH_TZ),
      );
      if (row && minutes <= parseHm(row.closes_at)) {
        selling += market.stallsByWeekday[weekday] ?? 0;
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
  halls,
  fallback,
}: {
  renderedAt: number;
  marketClocks: ProductMarketClock[];
  halls: Array<{ slug: string; days: number[] }>;
  fallback: string;
}) {
  const nowMs = useNow(renderedAt);
  const label = liveStallBadge(halls, marketClocks, new Date(nowMs), fallback);
  return <p className="mt-0.5 text-sm text-muted-foreground">{label}</p>;
}

export function FeaturedStallList({
  stalls,
  renderedAt,
  marketClocks,
}: {
  stalls: ProductsAtlasStallPreview[];
  renderedAt: number;
  marketClocks: ProductMarketClock[];
}) {
  const nowMs = useNow(renderedAt);
  const visible = useMemo(() => {
    const now = new Date(nowMs);
    return [...stalls]
      .sort(
        (a, b) =>
          featuredStallRank(a.halls, marketClocks, now, a.badge) -
            featuredStallRank(b.halls, marketClocks, now, b.badge) ||
          Number(Boolean(b.logoUrl)) - Number(Boolean(a.logoUrl)) ||
          (b.reviewCount ?? 0) - (a.reviewCount ?? 0) ||
          a.name.localeCompare(b.name, "en-CA"),
      )
      .slice(0, 6);
  }, [stalls, marketClocks, nowMs]);

  return (
    <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {visible.map((stall) => {
        const price = formatPrice(stall.priceCents);
        return (
          <li
            key={stall.slug}
            className="flex flex-col justify-between bg-receipt p-4 ring-1 ring-board shadow-[inset_3px_0_0_var(--primary)]"
          >
            <div>
              <div className="flex items-start justify-between gap-2.5">
                <div className="flex min-w-0 items-start gap-3">
                  <StallEmblem src={stall.logoUrl} name={stall.name} kind="vendor" size="md" tone="paper" />
                  <div className="min-w-0">
                    <Link
                      href={`/vendors/${stall.slug}`}
                      className="block text-base font-medium text-foreground hover:text-primary hover:underline"
                    >
                      <VerifiedName slug={stall.slug} name={stall.name} />
                    </Link>
                    <LiveStallBadge
                      renderedAt={renderedAt}
                      marketClocks={marketClocks}
                      halls={stall.halls}
                      fallback={stall.badge}
                    />
                  </div>
                </div>
                <SaveButton kind="vendor" slug={stall.slug} name={stall.name} size="sm" />
              </div>
              <div className="mt-3 flex items-center justify-between gap-2 border-t border-dashed border-border pt-3">
                <Link
                  href={stall.itemHref}
                  className="text-sm font-medium text-foreground hover:text-primary hover:underline"
                >
                  {stall.itemName}
                </Link>
                {price ? (
                  <span className="stall-chip-sm type-nums bg-stamp px-2.5 py-0.5 text-sm font-medium text-chalk">
                    {price}
                  </span>
                ) : null}
              </div>
            </div>
            {stall.marketName && stall.marketSlug ? (
              <div className="mt-3 flex items-center justify-between border-t border-border pt-2.5 text-sm">
                <Link
                  href={`/markets/${stall.marketSlug}`}
                  className="inline-flex items-center gap-1.5 font-medium text-muted-foreground hover:text-primary hover:underline"
                >
                  <BlocksMark className="size-3.5 text-primary" />
                  <span>{stall.marketName}</span>
                </Link>
                <Link href={`/vendors/${stall.slug}#menu`} className="font-medium text-primary hover:underline">
                  Stall menu →
                </Link>
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
