"use client";

import { TicketMark } from "@/components/marks";
import { useDayPlan } from "@/components/day-plan-provider";
import { hallFirstName } from "@/lib/day-plan";

export function DayPlanChip() {
  const { plan, open, show } = useDayPlan();
  if (!plan || open) return null;
  const label = hallFirstName(plan.hall.name);

  return (
    <button
      type="button"
      onClick={show}
      aria-label={`Open today’s slip for ${plan.hall.name}`}
      className="stall-chip-sm inline-flex h-8 shrink-0 items-center gap-1.5 bg-ticket px-2.5 text-sm font-medium text-foreground outline-none hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
    >
      <TicketMark className="size-3.5 shrink-0" />
      <span className="min-w-0">{label}</span>
    </button>
  );
}
