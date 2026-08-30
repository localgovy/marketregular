import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DayPlanPlus } from "@/components/day-plan-plus";
import { ListingMark } from "@/components/listing-mark";
import { ListingScore } from "@/components/listing-score";
import { NowLabel } from "@/components/now-label";
import { SaveButton } from "@/components/save-button";
import { TagList } from "@/components/tag-list";
import { Hours } from "@/components/hours";
import { hallFromMarket, hoursOnIso } from "@/lib/day-plan";
import { sortTagsForDisplay } from "@/lib/find-paths";
import { isoForWeekday } from "@/lib/landing";
import { marketPlaceLine } from "@/lib/listing-copy";
import { nextOpenLabel, nextOpenSlot } from "@/lib/schedule";
import type { Market, MarketSchedule } from "@/types/database";

export function MarketCard({
  market,
  schedules,
  weekdays,
  now,
}: {
  market: Market;
  schedules?: MarketSchedule[];
  /** When the directory is filtered to one weekday, show that session, not the next one. */
  weekdays?: number[];
  /** Frozen from the server so open-now and the plus stamp match first paint. */
  now: string;
}) {
  const clock = new Date(now);
  const rows = schedules ?? [];
  const weekday = weekdays?.length === 1 ? weekdays[0] : null;
  const iso = weekday == null ? undefined : isoForWeekday(weekday, clock);
  const sessionHours = iso ? hoursOnIso(rows, market.province, iso) : "";
  const slot = rows.length ? nextOpenSlot(rows, market.province, clock) : null;
  const openNow =
    weekday == null
      ? slot?.waitMinutes === 0
      : slot?.waitMinutes === 0 && slot.weekday === weekday;
  const when =
    weekday != null
      ? sessionHours || (rows.length ? nextOpenLabel(rows, market.province, clock) : null)
      : rows.length
        ? nextOpenLabel(rows, market.province, clock)
        : null;
  const hall = hallFromMarket(market, rows, iso, clock);
  const hours = sessionHours || hall.hours;
  return (
    <div className="h-full">
      <Card className="h-full overflow-visible transition-shadow hover:shadow-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <DayPlanPlus hall={hall} />
            <SaveButton kind="market" slug={market.slug} name={market.name} />
            <p className="type-kicker min-w-0 flex-1 text-muted-foreground">
              {marketPlaceLine(market.address, market.city)}
            </p>
            <ListingMark src={market.logo_url} />
          </div>
        </CardHeader>
        <Link href={`/markets/${market.slug}`} className="flex flex-col gap-(--card-spacing)">
          <CardTitle className="type-column px-(--card-spacing)">
            {market.name}
          </CardTitle>
          <CardContent className="flex flex-col gap-3">
            <ListingScore ratingAvg={market.rating_avg} reviewCount={market.review_count} />
            <p className="line-clamp-3 text-sm text-muted-foreground">
              {market.about}
            </p>
            {(openNow || (when && when !== "Open now") || hours) ? (
            <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm font-medium text-primary">
              {openNow ? <NowLabel>Open now</NowLabel> : null}
              {openNow && hours ? <Hours value={hours} className="text-primary" /> : null}
              {!openNow && when && when !== "Open now" ? <span>{when}</span> : null}
            </p>
            ) : null}
            <TagList tags={sortTagsForDisplay(market.tags).slice(0, 4)} />
          </CardContent>
        </Link>
      </Card>
    </div>
  );
}
