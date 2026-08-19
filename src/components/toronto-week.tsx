import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { HomePanel } from "@/components/home-panel";
import { LAUNCH_CITY } from "@/lib/launch";
import type { UpcomingGroup } from "@/lib/upcoming";

function SlotRow({
  slot,
}: {
  slot: UpcomingGroup["slots"][number];
}) {
  return (
    <Link
      href={`/markets/${slot.market.slug}`}
      className="flex items-start justify-between gap-3 px-3 py-3 hover:bg-primary/[0.045]"
    >
      <span className="min-w-0">
        <span className="block truncate text-base font-medium">{slot.market.name}</span>
        <span className="text-sm text-muted-foreground">{slot.market.address}</span>
        {slot.notes ? (
          <span className="mt-0.5 block text-sm text-muted-foreground">{slot.notes}</span>
        ) : null}
      </span>
      <span className="shrink-0 text-right">
        {slot.open ? (
          <span className="inline-flex items-center gap-1.5 rounded-sm bg-ticket px-2 py-1 text-xs font-semibold tracking-wide text-receipt uppercase">
            <span className="live-dot size-1.5 rounded-full bg-receipt" />
            Open · until {slot.until}
          </span>
        ) : (
          <span className="font-mono text-sm text-muted-foreground">{slot.hours}</span>
        )}
      </span>
    </Link>
  );
}

function DayCard({
  group,
  titleClass,
}: {
  group: UpcomingGroup;
  titleClass: string;
}) {
  return (
    <div className="overflow-hidden rounded-md bg-[color-mix(in_srgb,var(--foreground)_3%,var(--card))] ring-1 ring-border/70">
      <div className="flex items-baseline justify-between gap-2 border-b border-border/60 bg-card px-3 py-2">
        <h3 className={titleClass}>{group.label}</h3>
        <p className="text-sm font-medium text-primary">{group.date}</p>
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
      how="Start here. Gold means open right now. Then the rest of the week, day by day. Tap a name for hours, vendors, and a map."
    >
      {!groups.length ? (
        <p className="text-base text-muted-foreground">
          No Toronto markets are on the calendar for the next seven days.
        </p>
      ) : (
        <div className="grid gap-4">
          {open ? (
            <DayCard group={open} titleClass="font-heading text-xl leading-tight" />
          ) : null}

          {rest.length ? (
            <div className="columns-1 gap-3 sm:columns-2">
              {rest.map((group) => (
                <div
                  key={group.id}
                  className="mb-3 inline-block w-full break-inside-avoid"
                >
                  <DayCard
                    group={group}
                    titleClass="font-heading text-lg leading-tight"
                  />
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </HomePanel>
  );
}
