import type { Metadata } from "next";
import Link from "next/link";
import { EventsCalendar } from "@/components/events-calendar";
import { listMarkets, listSchedules } from "@/lib/data/catalog";
import { LAUNCH_CITY } from "@/lib/launch";

export const metadata: Metadata = { title: `${LAUNCH_CITY} market events` };

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
      <p className="mb-4">
        <Link
          href="/"
          className="text-base font-medium text-primary underline-offset-4 hover:underline"
        >
          ← {LAUNCH_CITY} farmers&apos; markets
        </Link>
      </p>
      <h1>Events</h1>
      <p className="type-lede mt-2 mb-8 max-w-2xl text-muted-foreground">
        Every {LAUNCH_CITY} market day, month by month. Tap a day for names and hours. Gold is a
        market; a pulse is open now.
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
