import type { ReactNode } from "react";
import Link from "next/link";
import { Hours } from "@/components/hours";
import { cn } from "@/lib/utils";

export function HoursRow({
  href,
  name,
  hours,
  extra,
  save,
  className,
  hoursClassName,
  nameClassName,
}: {
  href: string;
  name: string;
  hours: string;
  extra?: ReactNode;
  save?: ReactNode;
  className?: string;
  hoursClassName?: string;
  nameClassName?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-2",
        className,
      )}
    >
      <div className="min-w-0">
        <Link
          href={href}
          prefetch={false}
          className={cn("text-base font-medium", nameClassName)}
        >
          {name}
        </Link>
        {extra || hours ? (
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
            {extra}
            {hours ? <Hours value={hours} className={cn("leading-none", hoursClassName)} /> : null}
          </p>
        ) : null}
      </div>
      {save ? <span className="flex shrink-0 items-start gap-1">{save}</span> : null}
    </div>
  );
}
