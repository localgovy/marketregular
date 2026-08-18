import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TagList } from "@/components/tag-list";
import { provinceName } from "@/lib/constants";
import { nextOpenLabel } from "@/lib/schedule";
import type { Market, MarketSchedule } from "@/types/database";

export function MarketCard({
  market,
  schedules,
}: {
  market: Market;
  schedules?: MarketSchedule[];
}) {
  return (
    <Link href={`/markets/${market.slug}`} className="block h-full">
      <Card className="h-full transition-shadow hover:shadow-md">
        <CardHeader>
          <p className="text-xs tracking-wide text-muted-foreground uppercase">
            {market.city}, {provinceName(market.province)}
          </p>
          <CardTitle className="font-heading text-xl leading-snug">
            {market.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="line-clamp-3 text-sm text-muted-foreground">
            {market.about}
          </p>
          {schedules?.length ? (
            <p className="text-sm font-medium text-primary">
              {nextOpenLabel(schedules, market.province)}
            </p>
          ) : null}
          <TagList tags={market.tags.slice(0, 4)} />
        </CardContent>
      </Card>
    </Link>
  );
}
