import type { ReactNode } from "react";
import Link from "next/link";
import { HomePanel } from "@/components/home-panel";
import { WeekMark } from "@/components/marks";
import { WeekDayCard } from "@/components/week-day-card";
import { WeekSlotRow } from "@/components/week-slot-row";
import { LAUNCH_CITY } from "@/lib/launch";
import { WEEK_DAY_PAGE, type WeekListGroup } from "@/lib/upcoming";

function DayCard({ group }: { group: WeekListGroup }) {
  const first = group.slots.slice(0, WEEK_DAY_PAGE);
  const rest = group.slots.slice(WEEK_DAY_PAGE);

  return (
    <WeekDayCard label={group.label} date={group.date} rest={rest}>
      {first.map((slot) => (
        <li key={slot.market.id}>
          <WeekSlotRow slot={slot} />
        </li>
      ))}
    </WeekDayCard>
  );
}

export function TorontoWeek({
  groups,
  id = "week",
  kicker,
  title = "Upcoming markets",
  how = "A sprout means open right now. Tap a name for vendors and the map.",
  action,
  empty = `No ${LAUNCH_CITY} markets are on the calendar for the next seven days.`,
  className = "xl:shrink-0",
}: {
  groups: WeekListGroup[];
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
