import type { Metadata } from "next";
import { EventsCalendar } from "@/components/events-calendar";
import { listMarkets, listSchedules } from "@/lib/data/catalog";
import { LAUNCH_CITY } from "@/lib/launch";
import { pageMeta } from "@/lib/seo";

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

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <h1>Events</h1>
      <p className="type-lede mt-2 mb-8 max-w-2xl text-muted-foreground">
        Click on a day, find your market, and start planning your trip.
      </p>
      <EventsCalendar
        markets={markets.map((market) => ({
          id: market.id,
          slug: market.slug,
          name: market.name,
          address: market.address,
        }))}
        schedules={schedules}
        initialMonth={m}
        initialDay={d}
      />
    </div>
  );
}
