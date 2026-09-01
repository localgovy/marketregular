import type { Metadata } from "next";
import { EventsCalendar } from "@/components/events-calendar";
import { EventsWeekList } from "@/components/events-week-list";
import { listMarkets, listSchedules } from "@/lib/data/catalog";
import { LAUNCH_CITY } from "@/lib/launch";
import { pageMeta } from "@/lib/seo";
import { upcomingByDay } from "@/lib/upcoming";
import type { MarketSchedule } from "@/types/database";

export const metadata: Metadata = pageMeta({
  title: `${LAUNCH_CITY} market events`,
  path: "/events",
  description: "Click on a day, find your market, and start planning your trip.",
});

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string; d?: string }>;
}) {
  const [{ m, d }, markets, schedules] = await Promise.all([
    searchParams,
    listMarkets(),
    listSchedules(),
  ]);

  const scheduleMap = new Map<string, MarketSchedule[]>();
  for (const row of schedules) {
    const list = scheduleMap.get(row.market_id) ?? [];
    list.push(row);
    scheduleMap.set(row.market_id, list);
  }
  const week = upcomingByDay(markets, scheduleMap);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <h1>Events</h1>
      <p className="type-lede mt-2 mb-8 max-w-2xl text-muted-foreground">
        Click on a day, find your market, and start planning your trip.
      </p>
      <EventsWeekList groups={week} />
      <EventsCalendar
        markets={markets.map((market) => ({
          id: market.id,
          slug: market.slug,
          name: market.name,
          city: market.city,
          address: market.address,
          lat: market.lat,
          lng: market.lng,
        }))}
        schedules={schedules}
        initialMonth={m}
        initialDay={d}
      />
    </div>
  );
}
