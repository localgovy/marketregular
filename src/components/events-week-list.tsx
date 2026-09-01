import Link from "next/link";
import { Hours } from "@/components/hours";
import { marketListName } from "@/lib/listing-copy";
import type { UpcomingGroup } from "@/lib/upcoming";

/**
 * Server-rendered twin of the calendar. The calendar itself is a client island,
 * so without this the first crawl of /events sees an empty page. Held to the
 * next two market days so the calendar still opens near the top.
 */
export function EventsWeekList({ groups }: { groups: UpcomingGroup[] }) {
  if (!groups.length) return null;
  const days = [...new Set(groups.map((group) => group.iso))].slice(0, 2);
  const soon = groups.filter((group) => days.includes(group.iso));

  return (
    <section aria-labelledby="next-two-days" className="mb-8">
      <h2 id="next-two-days">Next two market days</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {soon.map((group) => (
          <div key={group.id} className="bg-card ring-1 ring-border/70">
            <div className="flex items-baseline justify-between gap-2 border-b border-border/60 px-3 py-1.5">
              <h3>{group.label}</h3>
              <p className="type-kicker shrink-0 font-medium text-primary">{group.date}</p>
            </div>
            <ul className="divide-y divide-border/50">
              {group.slots.map((slot) => (
                <li
                  key={slot.market.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 px-3 py-1.5"
                >
                  <Link
                    href={`/markets/${slot.market.slug}`}
                    className="text-base font-medium hover:underline"
                  >
                    {marketListName(slot.market.name, slot.market.city)}
                  </Link>
                  <Hours
                    value={slot.hours}
                    className={slot.open ? "text-stamp" : "text-muted-foreground"}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="mt-3 text-base text-muted-foreground">
        <Link href="/#week" className="font-medium text-foreground hover:underline">
          The whole week
        </Link>{" "}
        is on the home page, or pick any day below.
      </p>
    </section>
  );
}
