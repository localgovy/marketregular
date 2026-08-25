import Link from "next/link";
import { DayPlanPlus } from "@/components/day-plan-plus";
import { ListingScore } from "@/components/listing-score";
import { NowLabel } from "@/components/now-label";
import { SaveButton } from "@/components/save-button";
import { hallFromMarket } from "@/lib/day-plan";
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
        "flex items-center gap-1 hover:bg-secondary/50",
        inset ? "px-1" : "border-b border-border",
      )}
    >
      <div
        className={cn(
          "grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-1.5 py-3",
          inset && "px-2",
        )}
      >
        <Link href={`/markets/${market.slug}`} className="min-w-0">
          <span className="block text-base font-medium">{market.name}</span>
          <span className="flex flex-wrap items-baseline gap-x-2 text-sm text-muted-foreground">
            <span>{market.address}</span>
            <ListingScore
              ratingAvg={market.rating_avg}
              reviewCount={market.review_count}
              compact
              className="text-foreground"
            />
          </span>
        </Link>
        <DayPlanPlus hall={hall} />
        <span className="shrink-0 whitespace-nowrap text-right text-sm">
          {open ? (
            <NowLabel>Open now</NowLabel>
          ) : (
            <span className="text-muted-foreground">{when ?? "Hours"}</span>
          )}
        </span>
      </div>
      <span className={inset ? "pr-2" : "pr-1"}>
        <SaveButton kind="market" slug={market.slug} name={market.name} />
      </span>
    </div>
  );
}
