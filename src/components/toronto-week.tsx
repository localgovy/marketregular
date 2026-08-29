import type { ReactNode } from "react";
import Link from "next/link";
import { DayPlanHoursRow } from "@/components/day-plan-plus";
import { HomePanel } from "@/components/home-panel";
import { WeekMark } from "@/components/marks";
import { NowLabel } from "@/components/now-label";
import { LAUNCH_REGION } from "@/lib/launch";
import { marketListName } from "@/lib/listing-copy";
import type { UpcomingGroup, UpcomingSlot } from "@/lib/upcoming";

function SlotRow({ slot, iso }: { slot: UpcomingSlot; iso: string }) {
  return (
    <DayPlanHoursRow
      href={`/markets/${slot.market.slug}`}
      name={marketListName(slot.market.name, slot.market.city)}
      hours={slot.hours}
      hall={{
        slug: slot.market.slug,
        name: slot.market.name,
        address: slot.market.address,
        lat: slot.market.lat,
        lng: slot.market.lng,
        hours: slot.hours,
        date: iso,
      }}
      extra={slot.open ? <NowLabel>Open</NowLabel> : null}
      hoursClassName={slot.open ? "text-stamp" : "text-muted-foreground"}
      className="px-3 py-1.5 hover:bg-primary/[0.045]"
    />
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
            <SlotRow slot={slot} iso={group.iso} />
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
  how = "A sprout means open right now. Tap a name for vendors and the map.",
  action,
  empty = `No ${LAUNCH_REGION} markets are on the calendar for the next seven days.`,
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
  const weekKicker = kicker ?? `${LAUNCH_REGION} this week`;
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
