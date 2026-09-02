"use client";

import { useState, type ReactNode } from "react";
import { WeekSlotRow } from "@/components/week-slot-row";
import { WEEK_DAY_PAGE, type WeekListSlot } from "@/lib/upcoming";

export function WeekDayCard({
  label,
  date,
  rest,
  children,
}: {
  label: string;
  date: string;
  rest: WeekListSlot[];
  children: ReactNode;
}) {
  const [pages, setPages] = useState(0);
  const shown = rest.slice(0, pages * WEEK_DAY_PAGE);
  const hidden = rest.length - shown.length;

  return (
    <div className="rounded-md bg-[color-mix(in_srgb,var(--foreground)_3%,var(--card))] ring-1 ring-border/70">
      <div className="flex items-baseline justify-between gap-2 border-b border-border/60 bg-card px-3 py-1.5">
        <h3>{label}</h3>
        <p className="type-kicker shrink-0 font-medium text-primary">{date}</p>
      </div>
      <ul className="divide-y divide-border/50">
        {children}
        {shown.map((slot) => (
          <li key={slot.market.id}>
            <WeekSlotRow slot={slot} />
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
