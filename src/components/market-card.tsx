import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SaveButton } from "@/components/save-button";
import { TagList } from "@/components/tag-list";
import { nextOpenLabel } from "@/lib/schedule";
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
  return (
    <div className="relative h-full">
      <Link href={`/markets/${market.slug}`} className="block h-full">
        <Card className="h-full transition-shadow hover:shadow-md">
          <CardHeader className="pr-16">
            <p className="text-sm text-muted-foreground">
              {market.address}
            </p>
            <CardTitle className="font-heading text-xl leading-snug">
              {market.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="line-clamp-3 text-sm text-muted-foreground">
              {market.about}
            </p>
            {when ? (
              <p
                className={`text-sm font-medium ${when === "Open now" ? "text-ticket" : "text-primary"}`}
              >
                {when}
              </p>
            ) : null}
            <TagList tags={market.tags.slice(0, 4)} />
          </CardContent>
        </Card>
      </Link>
      <span className="absolute top-4 right-4">
        <SaveButton kind="market" slug={market.slug} name={market.name} />
      </span>
    </div>
  );
}
