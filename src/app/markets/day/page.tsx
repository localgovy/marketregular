import type { Metadata } from "next";
import Link from "next/link";
import { BackButton } from "@/components/back-button";
import { BrowseLinks } from "@/components/browse-links";
import { Hours } from "@/components/hours";
import { JsonLd } from "@/components/json-ld";
import { DayOpenMark } from "@/components/live-open";
import { listMarkets, listSchedules, listStalls } from "@/lib/data/catalog";
import {
  DAY_SLUGS,
  dayName,
  marketsOnWeekday,
  offsetToWeekday,
  scheduleMapFrom,
} from "@/lib/landing";
import { serverNowMs } from "@/lib/clock";
import { copyText, siteCopy } from "@/content/site-copy";
import { breadcrumbJsonLd, MARKETS_CRUMB, pageMeta } from "@/lib/seo";

export const revalidate = 900;

export const metadata: Metadata = pageMeta({
  title: copyText(siteCopy["/markets/day"].title),
  path: "/markets/day",
  description: copyText(siteCopy["/markets/day"].description),
});

export default async function MarketDayHubPage() {
  const nowMs = serverNowMs();
  const [markets, schedules, stalls] = await Promise.all([
    listMarkets(),
    listSchedules(),
    listStalls(),
  ]);
  const scheduleMap = scheduleMapFrom(schedules);

  const days = DAY_SLUGS.map((slug, weekday) => {
    const rows = marketsOnWeekday({ weekday, markets, scheduleMap, stalls });
    return {
      slug,
      weekday,
      name: dayName(weekday),
      rows,
      isToday: offsetToWeekday(weekday) === 0,
      openNow: rows.some((row) => row.openNow),
    };
  });

  const busiest = [...days].sort((a, b) => b.rows.length - a.rows.length)[0];

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10">
      <JsonLd data={breadcrumbJsonLd([MARKETS_CRUMB, { name: siteCopy["/markets/day"].crumb, path: "/markets/day" }])} />
      <BackButton href="/markets" />
      <h1>{copyText(siteCopy["/markets/day"].h1)}</h1>
      <p className="type-lede mt-2 max-w-2xl text-muted-foreground">
        {siteCopy["/markets/day"].lede}
        {busiest && busiest.rows.length
          ? ` ${busiest.name} is the busiest with ${busiest.rows.length} markets.`
          : ""}
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {days.map((day) => (
          <section key={day.slug} className="rounded-md bg-card p-4 ring-1 ring-border">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <h2 className="type-column">
                <Link href={`/markets/day/${day.slug}`} className="hover:underline">
                  {day.name}
                </Link>
              </h2>
              <DayOpenMark
                rows={day.rows}
                nowMs={nowMs}
                count={day.rows.length}
                isToday={day.isToday}
              />
            </div>
            {day.rows.length ? (
              <ul className="mt-3 grid gap-1.5">
                {day.rows.slice(0, 4).map((row) => (
                  <li
                    key={row.market.id}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3"
                  >
                    <Link
                      href={`/markets/${row.market.slug}`}
                      className="text-base hover:underline"
                    >
                      {row.market.name}
                    </Link>
                    <Hours value={row.hours} className="text-muted-foreground" />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">{siteCopy["/markets/day"].nothingScheduled}</p>
            )}
            {day.rows.length > 4 ? (
              <p className="mt-2 text-sm">
                <Link
                  href={`/markets/day/${day.slug}`}
                  className="font-medium text-primary hover:underline"
                >
                  {copyText(siteCopy["/markets/day"].allDayMarkets, {
                    count: day.rows.length,
                    day: day.name,
                  })}
                </Link>
              </p>
            ) : null}
          </section>
        ))}
      </div>

      <BrowseLinks className="mt-10" />
    </div>
  );
}
