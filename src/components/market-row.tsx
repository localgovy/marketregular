import Link from "next/link";
import { nextOpenLabel } from "@/lib/schedule";
import { cn } from "@/lib/utils";
import type { Market, MarketSchedule } from "@/types/database";

export function MarketRow({
  market,
  schedules,
  open,
  inset,
}: {
  market: Market;
  schedules?: MarketSchedule[];
  open?: boolean;
  inset?: boolean;
}) {
  const when = schedules?.length
    ? nextOpenLabel(schedules, market.province)
    : open
      ? "Open now"
      : null;
  return (
    <Link
      href={`/markets/${market.slug}`}
      className={cn(
        "flex items-baseline justify-between gap-3 py-3 hover:bg-secondary/50",
        inset ? "px-3" : "border-b border-border"
      )}
    >
      <span className="min-w-0">
        <span className="block truncate text-base font-medium">{market.name}</span>
        <span className="text-sm text-muted-foreground">{market.address}</span>
      </span>
      <span className="shrink-0 text-right text-sm">
        {open ? (
          <span className="inline-flex items-center gap-1.5 rounded-sm bg-ticket px-2 py-1 text-xs font-semibold tracking-wide text-receipt uppercase">
            <span className="live-dot size-1.5 rounded-full bg-receipt" />
            Open now
          </span>
        ) : (
          <span className="text-muted-foreground">{when ?? "Hours"}</span>
        )}
      </span>
    </Link>
  );
}
