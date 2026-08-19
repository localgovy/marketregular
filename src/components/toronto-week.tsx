import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { HomePanel } from "@/components/home-panel";
import { cn } from "@/lib/utils";
import { LAUNCH_CITY } from "@/lib/launch";
import type { UpcomingGroup, UpcomingSlot } from "@/lib/upcoming";

function SlotRow({ slot }: { slot: UpcomingSlot }) {
  return (
    <Link
      href={`/markets/${slot.market.slug}`}
      className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 px-3 py-1.5 hover:bg-primary/[0.045]"
    >
      <span className="min-w-0 text-base font-medium">{slot.market.name}</span>
      <span
        className={cn(
          "shrink-0 whitespace-nowrap font-mono text-sm tabular-nums",
          slot.open ? "text-ticket" : "text-muted-foreground",
        )}
      >
        {slot.open ? (
          <span className="mr-1.5 inline-flex items-center gap-1 bg-ticket px-1.5 py-0.5 font-sans text-sm text-receipt">
            <span className="live-dot size-1.5 rounded-full bg-receipt" aria-hidden />
            Open
          </span>
        ) : null}
        {slot.hours}
      </span>
    </Link>
  );
}

function DayCard({ group }: { group: UpcomingGroup }) {
  return (
    <div className="rounded-md bg-[color-mix(in_srgb,var(--foreground)_3%,var(--card))] ring-1 ring-border/70">
      <div className="flex items-baseline justify-between gap-2 border-b border-border/60 bg-card px-3 py-1.5">
        <h3>{group.label}</h3>
        <p className="type-kicker shrink-0 font-medium text-primary">{group.date}</p>
      </div>
      <ul className="divide-y divide-border/50">
        {group.slots.map((slot) => (
          <li key={slot.market.id}>
            <SlotRow slot={slot} />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TorontoWeek({ groups }: { groups: UpcomingGroup[] }) {
  const open = groups.find((g) => g.open);
  const rest = groups.filter((g) => !g.open);

  return (
    <HomePanel
      id="week"
      tone="open"
      icon={CalendarClock}
      kicker={`${LAUNCH_CITY} this week`}
      title="Upcoming markets"
      how="Gold means open right now. Tap a name for vendors and the map."
      className="xl:shrink-0"
    >
      {!groups.length ? (
        <p className="text-base text-muted-foreground">
          No Toronto markets are on the calendar for the next seven days.
        </p>
      ) : (
        <div className="grid gap-3">
          {open ? <DayCard group={open} /> : null}

          {rest.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {rest.map((group) => (
                <DayCard key={group.id} group={group} />
              ))}
            </div>
          ) : null}
        </div>
      )}
    </HomePanel>
  );
}
