"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { HoursRow } from "@/components/hours-row";
import { HomePanel } from "@/components/home-panel";
import { WeekMark } from "@/components/marks";
import { NowLabel } from "@/components/now-label";
import { SaveButton } from "@/components/save-button";
import { LAUNCH_CITY } from "@/lib/launch";
import { marketListName } from "@/lib/listing-copy";
import type { UpcomingGroup, UpcomingSlot } from "@/lib/upcoming";

const DAY_PAGE = 7;

function SlotRow({ slot }: { slot: UpcomingSlot }) {
  return (
    <HoursRow
      href={`/markets/${slot.market.slug}`}
      name={marketListName(slot.market.name, slot.market.city)}
      hours={slot.hours}
      extra={slot.open ? <NowLabel>Open</NowLabel> : null}
      hoursClassName={slot.open ? "text-stamp" : "text-muted-foreground"}
      className="px-3 py-1.5 hover:bg-primary/[0.045]"
      save={<SaveButton kind="market" slug={slot.market.slug} name={slot.market.name} />}
    />
  );
}

function DayCard({ group }: { group: UpcomingGroup }) {
  const [pages, setPages] = useState(1);
  const total = group.slots.length;
  const shown = Math.min(pages * DAY_PAGE, total);
  const hidden = total - shown;

  return (
    <div className="rounded-md bg-[color-mix(in_srgb,var(--foreground)_3%,var(--card))] ring-1 ring-border/70">
      <div className="flex items-baseline justify-between gap-2 border-b border-border/60 bg-card px-3 py-1.5">
        <h3>{group.label}</h3>
        <p className="type-kicker shrink-0 font-medium text-primary">{group.date}</p>
      </div>
      <ul className="divide-y divide-border/50">
        {group.slots.slice(0, shown).map((slot) => (
          <li key={slot.market.id}>
            <SlotRow slot={slot} />
          </li>
        ))}
      </ul>
      {hidden > 0 ? (
        <div className="border-t border-border/50 p-3">
          <button
            type="button"
            onClick={() => setPages((n) => n + 1)}
            className="stall-chip inline-flex h-11 w-full cursor-pointer items-center justify-center bg-primary px-5 text-sm font-medium text-primary-foreground outline-none hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-foreground"
          >
            Show more ({hidden})
          </button>
        </div>
      ) : null}
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
