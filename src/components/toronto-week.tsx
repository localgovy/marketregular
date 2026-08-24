import type { ReactNode } from "react";
import Link from "next/link";
import { HomePanel } from "@/components/home-panel";
import { Hours } from "@/components/hours";
import { WeekMark } from "@/components/marks";
import { NowLabel } from "@/components/now-label";
import { LAUNCH_CITY } from "@/lib/launch";
import type { UpcomingGroup, UpcomingSlot } from "@/lib/upcoming";

function SlotRow({ slot }: { slot: UpcomingSlot }) {
  return (
    <Link
      href={`/markets/${slot.market.slug}`}
      className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 px-3 py-1.5 hover:bg-primary/[0.045]"
    >
      <span className="min-w-0 text-base font-medium">{slot.market.name}</span>
      <span className="flex shrink-0 flex-wrap items-baseline justify-end gap-x-1.5">
        {slot.open ? (
          <NowLabel>Open</NowLabel>
        ) : null}
        <Hours
          value={slot.hours}
          className={slot.open ? "text-stamp" : "text-muted-foreground"}
        />
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

export function TorontoWeek({
  groups,
  id = "week",
  kicker,
  title = "Upcoming markets",
  how = "A stamp means open right now. Tap a name for vendors and the map.",
  action,
  empty = `No ${LAUNCH_CITY} markets are on the calendar for the next seven days.`,
  className = "xl:shrink-0",
}: {
  groups: UpcomingGroup[];
  id?: string;
  kicker?: string;
  title?: string;
  how?: ReactNode;
  action?: ReactNode;
  empty?: string;
  className?: string;
}) {
  const open = groups.find((g) => g.open);
  const rest = groups.filter((g) => !g.open);
  const weekKicker = kicker ?? `${LAUNCH_CITY} this week`;
  const weekAction = action ?? (
    <Link href="/events" className="hover:underline">
      Month calendar
    </Link>
  );

  return (
    <HomePanel
      id={id}
      tone="open"
      icon={WeekMark}
      kicker={weekKicker}
      title={title}
      how={how}
      className={className}
      action={weekAction}
    >
      {!groups.length ? (
        <p className="text-base text-muted-foreground">{empty}</p>
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
