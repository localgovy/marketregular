import Link from "next/link";
import { provinceName } from "@/lib/constants";
import { nextOpenLabel } from "@/lib/schedule";
import type { Market, MarketSchedule } from "@/types/database";

export function MarketRow({
  market,
  schedules,
  open,
}: {
  market: Market;
  schedules?: MarketSchedule[];
  open?: boolean;
}) {
  const when = schedules?.length
    ? nextOpenLabel(schedules, market.province)
    : open
      ? "Open now"
      : null;
  return (
    <Link
      href={`/markets/${market.slug}`}
      className="flex items-baseline justify-between gap-3 border-b border-border py-3 hover:bg-secondary/50"
    >
      <span className="min-w-0">
        <span className="block truncate text-base font-medium">{market.name}</span>
        <span className="text-sm text-muted-foreground">
          {market.city}, {provinceName(market.province)}
        </span>
      </span>
      <span className="shrink-0 text-right text-sm">
        {open ? (
          <span className="font-medium text-ticket">Open now</span>
        ) : (
          <span className="text-muted-foreground">{when ?? "Hours"}</span>
        )}
      </span>
    </Link>
  );
}
