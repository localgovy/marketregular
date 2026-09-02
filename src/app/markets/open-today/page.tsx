import type { Metadata } from "next";
import Link from "next/link";
import { BackButton } from "@/components/back-button";
import { BrowseLinks } from "@/components/browse-links";
import { JsonLd } from "@/components/json-ld";
import { MarketDayList } from "@/components/market-day-list";
import { listMarkets, listSchedules, listStalls } from "@/lib/data/catalog";
import {
  dayName,
  daySlug,
  marketsOnWeekday,
  scheduleMapFrom,
} from "@/lib/landing";
import { LAUNCH_CITY, LAUNCH_REGION, LAUNCH_TZ } from "@/lib/launch";
import { zonedParts } from "@/lib/schedule";
import { breadcrumbJsonLd, itemListJsonLd, MARKETS_CRUMB, pageMeta } from "@/lib/seo";

/** The answer changes at midnight and as halls close, so this page stays fresh. */
export const revalidate = 900;

export const metadata: Metadata = pageMeta({
  title: `Farmers' markets open today in ${LAUNCH_CITY}`,
  path: "/markets/open-today",
  description: `Which ${LAUNCH_REGION} farmers' markets are open today and which are still to come, with hours, addresses and how many stalls are working.`,
});

export default async function OpenTodayPage() {
  const now = new Date();
  const { weekday, minutes } = zonedParts(now, LAUNCH_TZ);
  const [markets, schedules, stalls] = await Promise.all([
    listMarkets(),
    listSchedules(),
    listStalls(),
  ]);
  const scheduleMap = scheduleMapFrom(schedules);
  const today = marketsOnWeekday({ weekday, markets, scheduleMap, stalls, now });

  const openNow = today.filter((row) => row.openNow);
  const laterToday = today.filter((row) => !row.openNow && row.opensMinutes > minutes);
  const closed = today.filter((row) => !row.openNow && row.opensMinutes <= minutes);
  const tomorrow = marketsOnWeekday({
    weekday: (weekday + 1) % 7,
    markets,
    scheduleMap,
    stalls,
    now,
  });

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10">
      <JsonLd
        data={breadcrumbJsonLd([
          MARKETS_CRUMB,
          { name: "Open today", path: "/markets/open-today" },
        ])}
      />
      <JsonLd
        data={itemListJsonLd({
          name: `${LAUNCH_CITY} farmers' markets open today`,
          path: "/markets/open-today",
          items: today.map((row) => ({
            name: row.market.name,
            path: `/markets/${row.market.slug}`,
          })),
        })}
      />
      <BackButton href="/markets" />
      <h1>Farmers&apos; markets open today in {LAUNCH_CITY}</h1>
      <p className="type-lede mt-2 max-w-2xl text-muted-foreground">
        {today.length
          ? `${today.length} ${LAUNCH_REGION} ${today.length === 1 ? "market runs" : "markets run"} on ${dayName(weekday)}. ${openNow.length ? `${openNow.length} ${openNow.length === 1 ? "is" : "are"} open right now.` : "None are open at this hour."}`
          : `No ${LAUNCH_REGION} market in the directory runs on ${dayName(weekday)}.`}
      </p>

      {openNow.length ? (
        <section className="mt-8">
          <h2>Open right now</h2>
          <MarketDayList rows={openNow} />
        </section>
      ) : null}

      {laterToday.length ? (
        <section className="mt-8">
          <h2>Opening later today</h2>
          <MarketDayList rows={laterToday} />
        </section>
      ) : null}

      {closed.length ? (
        <section className="mt-8">
          <h2>Already closed today</h2>
          <MarketDayList rows={closed} />
        </section>
      ) : null}

      {tomorrow.length ? (
        <section className="mt-8">
          <h2>Tomorrow</h2>
          <p className="mt-1 text-base text-muted-foreground">
            {tomorrow.length} {tomorrow.length === 1 ? "market" : "markets"} on{" "}
            <Link
              href={`/markets/day/${daySlug(weekday + 1)}`}
              className="font-medium text-foreground hover:underline"
            >
              {dayName(weekday + 1)}
            </Link>
            .
          </p>
          <MarketDayList rows={tomorrow.slice(0, 6)} />
          {tomorrow.length > 6 ? (
            <p className="mt-2 text-sm">
              <Link
                href={`/markets/day/${daySlug(weekday + 1)}`}
                className="font-medium text-primary hover:underline"
              >
                All {tomorrow.length} {dayName(weekday + 1)} markets
              </Link>
            </p>
          ) : null}
        </section>
      ) : null}

      <BrowseLinks className="mt-10" />
    </div>
  );
}
