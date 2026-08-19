import Link from "next/link";
import { SaveButton } from "@/components/save-button";
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
    <div
      className={cn(
        "flex items-center gap-2 hover:bg-secondary/50",
        inset ? "px-1" : "border-b border-border",
      )}
    >
      <Link
        href={`/markets/${market.slug}`}
        className={cn("flex min-w-0 flex-1 items-baseline justify-between gap-3 py-3", inset && "px-2")}
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
      <span className={inset ? "pr-2" : "pr-1"}>
        <SaveButton kind="market" slug={market.slug} name={market.name} />
      </span>
    </div>
  );
}
