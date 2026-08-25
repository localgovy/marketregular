import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DayPlanPlus } from "@/components/day-plan-plus";
import { ListingMark } from "@/components/listing-mark";
import { ListingScore } from "@/components/listing-score";
import { NowLabel } from "@/components/now-label";
import { SaveButton } from "@/components/save-button";
import { TagList } from "@/components/tag-list";
import { hallFromMarket } from "@/lib/day-plan";
import { nextOpenLabel } from "@/lib/schedule";
import { sortTagsForDisplay } from "@/lib/find-paths";
import type { Market, MarketSchedule } from "@/types/database";

export function MarketCard({
  market,
  schedules,
}: {
  market: Market;
  schedules?: MarketSchedule[];
}) {
  const when = schedules?.length
    ? nextOpenLabel(schedules, market.province)
    : null;
  const hall = hallFromMarket(market, schedules ?? []);
  return (
    <div className="h-full">
      <Card className="h-full overflow-visible transition-shadow hover:shadow-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <DayPlanPlus hall={hall} />
            <SaveButton kind="market" slug={market.slug} name={market.name} />
            <p className="type-kicker min-w-0 flex-1 text-muted-foreground">
              {market.address}
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
            {when === "Open now" ? (
              <NowLabel>{when}</NowLabel>
            ) : when ? (
              <p className="text-sm font-medium text-primary">{when}</p>
            ) : null}
            <TagList tags={sortTagsForDisplay(market.tags).slice(0, 4)} />
          </CardContent>
        </Link>
      </Card>
    </div>
  );
}
