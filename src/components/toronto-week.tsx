import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { HomePanel } from "@/components/home-panel";
import { LAUNCH_CITY } from "@/lib/launch";
import type { UpcomingGroup, UpcomingSlot } from "@/lib/upcoming";

function SlotRow({ slot }: { slot: UpcomingSlot }) {
  return (
    <Link
      href={`/markets/${slot.market.slug}`}
      className="grid grid-cols-1 items-baseline gap-x-4 py-2.5 hover:bg-primary/[0.045] sm:grid-cols-[minmax(0,1fr)_auto]"
    >
      <span className="min-w-0">
        <span className="block text-base font-medium">{slot.market.name}</span>
        <span className="block text-sm text-muted-foreground">{slot.market.address}</span>
        {slot.notes ? (
          <span className="mt-0.5 block text-sm text-muted-foreground">{slot.notes}</span>
        ) : null}
      </span>
      <span className="shrink-0 pt-1 font-mono text-sm whitespace-nowrap tabular-nums text-muted-foreground sm:pt-0 sm:text-right">
        {slot.open ? (
          <span className="inline-flex items-center gap-1.5 bg-ticket px-2 py-1 text-sm text-receipt">
            <span className="live-dot size-1.5 rounded-full bg-receipt" />
            Open · until {slot.until}
          </span>
        ) : (
          slot.hours
        )}
      </span>
    </Link>
  );
}

function DayBlock({ group }: { group: UpcomingGroup }) {
  return (
    <section>
      <header className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-border pb-1">
        <h3 className="font-heading text-lg leading-tight">{group.label}</h3>
        <p className="text-sm text-muted-foreground">
          {group.date}
          {group.hint ? ` · ${group.hint}` : null}
        </p>
      </header>
      <ul className="divide-y divide-border/60">
        {group.slots.map((slot) => (
          <li key={slot.market.id}>
            <SlotRow slot={slot} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function TorontoWeek({ groups }: { groups: UpcomingGroup[] }) {
  return (
    <HomePanel
      id="week"
      tone="open"
      icon={CalendarClock}
      kicker={`${LAUNCH_CITY} this week`}
      title="Upcoming markets"
      how="The next seven days. Gold means open right now. Hours sit on the right — tap a name for vendors and the map."
    >
      {!groups.length ? (
        <p className="text-base text-muted-foreground">
          No Toronto markets are on the calendar for the next seven days.
        </p>
      ) : (
        <div className="grid gap-6">
          {groups.map((group) => (
            <DayBlock key={group.id} group={group} />
          ))}
        </div>
      )}
    </HomePanel>
  );
}
