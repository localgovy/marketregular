import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BackButton } from "@/components/back-button";
import { BrowseLinks } from "@/components/browse-links";
import { JsonLd } from "@/components/json-ld";
import { MarketDayList } from "@/components/market-day-list";
import { listMarkets, listSchedules, listStalls } from "@/lib/data/catalog";
import {
  DAY_SLUGS,
  dayName,
  daySlug,
  marketsOnWeekday,
  offsetToWeekday,
  scheduleMapFrom,
  weekdayFromSlug,
  whenWord,
} from "@/lib/landing";
import { LAUNCH_CITY, LAUNCH_REGION } from "@/lib/launch";
import { breadcrumbJsonLd, itemListJsonLd, MARKETS_CRUMB, pageMeta } from "@/lib/seo";

export const revalidate = 900;

export function generateStaticParams() {
  return DAY_SLUGS.map((day) => ({ day }));
}

const DAY_CRUMB = { name: "By day", path: "/markets/day" };

function copy(weekday: number, count: number, stalls: number) {
  const day = dayName(weekday);
  return {
    title: `${day} farmers' markets in ${LAUNCH_CITY}`,
    description:
      count > 0
        ? `${count} ${LAUNCH_REGION} farmers' ${count === 1 ? "market" : "markets"} open on ${day}, with hours, addresses and the ${stalls.toLocaleString("en-CA")} ${stalls === 1 ? "stall" : "stalls"} working that day.`
        : `Which ${LAUNCH_REGION} farmers' markets open on ${day}, with hours and addresses.`,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ day: string }>;
}): Promise<Metadata> {
  const { day } = await params;
  const weekday = weekdayFromSlug(day);
  if (weekday == null) return { title: "Day" };
  const [markets, schedules, stalls] = await Promise.all([
    listMarkets(),
    listSchedules(),
    listStalls(),
  ]);
  const rows = marketsOnWeekday({
    weekday,
    markets,
    scheduleMap: scheduleMapFrom(schedules),
    stalls,
  });
  const stallCount = rows.reduce((sum, row) => sum + row.stallCount, 0);
  const { title, description } = copy(weekday, rows.length, stallCount);
  return pageMeta({ title, description, path: `/markets/day/${day}` });
}

export default async function MarketDayPage({
  params,
}: {
  params: Promise<{ day: string }>;
}) {
  const { day } = await params;
  const weekday = weekdayFromSlug(day);
  if (weekday == null) notFound();

  const [markets, schedules, stalls] = await Promise.all([
    listMarkets(),
    listSchedules(),
    listStalls(),
  ]);
  const scheduleMap = scheduleMapFrom(schedules);
  const rows = marketsOnWeekday({ weekday, markets, scheduleMap, stalls });
  const stallCount = rows.reduce((sum, row) => sum + row.stallCount, 0);
  const name = dayName(weekday);
  const offset = offsetToWeekday(weekday);
  const previous = daySlug(weekday - 1);
  const next = daySlug(weekday + 1);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10">
      <JsonLd
        data={breadcrumbJsonLd([
          MARKETS_CRUMB,
          DAY_CRUMB,
          { name: `${name} markets`, path: `/markets/day/${day}` },
        ])}
      />
      <JsonLd
        data={itemListJsonLd({
          name: `${LAUNCH_CITY} farmers' markets open on ${name}`,
          path: `/markets/day/${day}`,
          items: rows.map((row) => ({
            name: row.market.name,
            path: `/markets/${row.market.slug}`,
          })),
        })}
      />
      <BackButton href="/markets/day" />
      <h1>
        {LAUNCH_CITY} farmers&apos; markets open on {name}
      </h1>
      {rows.length ? (
        <p className="type-lede mt-2 max-w-2xl text-muted-foreground">
          {rows.length} {rows.length === 1 ? "market" : "markets"} {whenWord(weekday)}, sorted
          by opening time, with {stallCount.toLocaleString("en-CA")}{" "}
          {stallCount === 1 ? "stall" : "stalls"} between them. Hours are the{" "}
          {name} session.
        </p>
      ) : (
        <p className="type-lede mt-2 max-w-2xl text-muted-foreground">
          No {LAUNCH_REGION} market in the directory runs on {name} right now. Seasonal halls
          come back, so try {dayName(weekday + 1)} or {dayName(weekday - 1)}.
        </p>
      )}

      <MarketDayList rows={rows} />

      <nav aria-label="Other days" className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2">
        <Link href={`/markets/day/${previous}`} className="text-base font-medium hover:underline">
          {dayName(weekday - 1)} markets
        </Link>
        <Link href={`/markets/day/${next}`} className="text-base font-medium hover:underline">
          {dayName(weekday + 1)} markets
        </Link>
        {offset === 0 ? null : (
          <Link href="/markets/open-today" className="text-base font-medium hover:underline">
            Open today
          </Link>
        )}
      </nav>

      <BrowseLinks className="mt-10" exceptDay={weekday} />
    </div>
  );
}
