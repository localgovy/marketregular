"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { CheckMark, PlusMark } from "@/components/marks";
import { Hours } from "@/components/hours";
import { useDayPlan } from "@/components/day-plan-provider";
import { DAY_PLAN_NAME } from "@/lib/constants";
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
      aria-label={
        on
          ? `${hall.name} is on today’s ${DAY_PLAN_NAME}`
          : `Add ${hall.name} to today’s ${DAY_PLAN_NAME}`
      }
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        putHall(hall);
      }}
      className={cn(
        hit,
        "group relative hover:z-20 focus-visible:z-20",
        on
          ? "stall-chip-sm bg-foreground text-receipt"
          : "rounded-full text-foreground hover:bg-foreground/[0.06] active:bg-foreground/[0.1]",
        className,
      )}
    >
      {on ? <CheckMark className="size-4" /> : <PlusMark className="size-4" />}
      {on ? null : (
        <span
          aria-hidden
          className="pointer-events-none absolute bottom-[calc(100%+4px)] left-1/2 z-20 w-max -translate-x-1/2 bg-ticket px-2 py-0.5 text-sm font-medium whitespace-nowrap text-foreground opacity-0 shadow-[0_1px_0_rgb(28_25_22/0.2)] transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none"
        >
          Add to {DAY_PLAN_NAME}
        </span>
      )}
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
      aria-label={
        on
          ? `${vendorName} is punched on today’s ${DAY_PLAN_NAME}`
          : `Punch ${vendorName} on today’s ${DAY_PLAN_NAME}`
      }
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
  save,
  className,
  hoursClassName,
  nameClassName,
}: {
  href: string;
  name: string;
  hours: string;
  hall: DayPlanHall;
  extra?: ReactNode;
  save?: ReactNode;
  className?: string;
  hoursClassName?: string;
  nameClassName?: string;
}) {
  return (
    <div
      className={cn(
        "grid items-center gap-x-1.5",
        save
          ? "grid-cols-[minmax(0,1fr)_auto_auto_auto]"
          : "grid-cols-[minmax(0,1fr)_auto_auto]",
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
      {save ? <span className="shrink-0">{save}</span> : null}
    </div>
  );
}
