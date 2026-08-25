"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { CheckMark, PlusMark } from "@/components/marks";
import { Hours } from "@/components/hours";
import { useDayPlan } from "@/components/day-plan-provider";
import { cn } from "@/lib/utils";
import type { DayPlanHall } from "@/lib/day-plan";

const hit =
  "inline-flex size-9 shrink-0 items-center justify-center outline-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";

export function DayPlanPlus({ hall, className }: { hall: DayPlanHall; className?: string }) {
  const { plan, putHall } = useDayPlan();
  const on = plan?.hall.slug === hall.slug;

  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? `${hall.name} is on today's slip` : `Put ${hall.name} on today's slip`}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        putHall(hall);
      }}
      className={cn(
        hit,
        on
          ? "stall-chip-sm bg-foreground text-receipt"
          : "rounded-full text-foreground hover:bg-foreground/[0.06] active:bg-foreground/[0.1]",
        className,
      )}
    >
      {on ? <CheckMark className="size-4" /> : <PlusMark className="size-4" />}
    </button>
  );
}

export function DayPlanPunch({
  hall,
  vendorSlug,
  vendorName,
  className,
}: {
  hall: DayPlanHall;
  vendorSlug: string;
  vendorName: string;
  className?: string;
}) {
  const { plan, punchVendor } = useDayPlan();
  const on =
    plan?.hall.slug === hall.slug && plan.vendorSlugs.includes(vendorSlug);

  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? `${vendorName} is punched on today's slip` : `Punch ${vendorName} on today's slip`}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        punchVendor(vendorSlug, hall);
      }}
      className={cn(
        hit,
        on
          ? "stall-chip-sm bg-foreground text-receipt"
          : "rounded-full text-foreground hover:bg-foreground/[0.06] active:bg-foreground/[0.1]",
        className,
      )}
    >
      {on ? <CheckMark className="size-4" /> : <PlusMark className="size-4" />}
    </button>
  );
}

export function DayPlanHoursRow({
  href,
  name,
  hours,
  hall,
  extra,
  className,
  hoursClassName,
  nameClassName,
}: {
  href: string;
  name: string;
  hours: string;
  hall: DayPlanHall;
  extra?: ReactNode;
  className?: string;
  hoursClassName?: string;
  nameClassName?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-1.5",
        className,
      )}
    >
      <Link
        href={href}
        prefetch={false}
        className={cn("min-w-0 text-base font-medium", nameClassName)}
      >
        {name}
      </Link>
      <DayPlanPlus hall={hall} />
      <span className="flex shrink-0 items-baseline justify-end gap-x-1.5">
        {extra}
        {hours ? <Hours value={hours} className={hoursClassName} /> : null}
      </span>
    </div>
  );
}
