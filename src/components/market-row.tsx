import Link from "next/link";
import { DayPlanPlus } from "@/components/day-plan-plus";
import { ListingScore } from "@/components/listing-score";
import { NowLabel } from "@/components/now-label";
import { SaveButton } from "@/components/save-button";
import { hallFromMarket } from "@/lib/day-plan";
import { marketPlaceLine } from "@/lib/listing-copy";
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
  const hall = hallFromMarket(market, schedules ?? []);
  return (
    <div
      className={cn(
        "grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-2 hover:bg-secondary/50",
        inset ? "px-1" : "border-b border-border",
      )}
    >
      <div className={cn("min-w-0 py-3", inset && "px-2")}>
        <Link href={`/markets/${market.slug}`} className="text-base font-medium">
          {market.name}
        </Link>
        <p className="mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          {open ? (
            <NowLabel>Open now</NowLabel>
          ) : (
            <span className="whitespace-nowrap text-sm text-muted-foreground">
              {when ?? "Hours"}
            </span>
          )}
        </p>
        <span className="flex flex-wrap items-baseline gap-x-2 text-sm text-muted-foreground">
          <span>{marketPlaceLine(market.address, market.city)}</span>
          <ListingScore
            ratingAvg={market.rating_avg}
            reviewCount={market.review_count}
            compact
            className="text-foreground"
          />
        </span>
      </div>
      <span className={cn("flex shrink-0 items-start gap-1 py-3", inset ? "pr-2" : "pr-1")}>
        <DayPlanPlus hall={hall} />
        <SaveButton kind="market" slug={market.slug} name={market.name} />
      </span>
    </div>
  );
}
