import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ListingMark } from "@/components/listing-mark";
import { ListingScore } from "@/components/listing-score";
import { SaveButton } from "@/components/save-button";
import { TagList } from "@/components/tag-list";
import { VendorHallsKicker } from "@/components/vendor-halls-kicker";
import { WEEKDAYS } from "@/lib/constants";
import { sortTagsForDisplay } from "@/lib/find-paths";
import type { Vendor, VendorHall } from "@/types/database";

const NO_HALLS: VendorHall[] = [];

export function VendorCard({
  vendor,
  stall,
  days = [],
  halls = NO_HALLS,
}: {
  vendor: Pick<
    Vendor,
    "id" | "slug" | "name" | "about" | "logo_url" | "rating_avg" | "review_count" | "tags"
  >;
  stall?: string | null;
  days?: number[];
  halls?: VendorHall[];
}) {
  const dayLabel = days
    .map((d) => WEEKDAYS[d]?.slice(0, 3))
    .filter(Boolean)
    .join(", ");

  return (
    <div className="h-full">
      <Card className="h-full overflow-visible transition-shadow hover:shadow-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <SaveButton kind="vendor" slug={vendor.slug} name={vendor.name} />
            <VendorHallsKicker halls={halls} />
            <ListingMark src={vendor.logo_url} />
          </div>
        </CardHeader>
        <Link href={`/vendors/${vendor.slug}`} className="flex flex-col gap-(--card-spacing)">
          <div className="px-(--card-spacing)">
            <CardTitle className="type-column">{vendor.name}</CardTitle>
            {stall || dayLabel ? (
              <p className="mt-1 grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 text-sm text-muted-foreground">
                {stall ? (
                  <span className="type-nums min-w-0">{stall}</span>
                ) : (
                  <span />
                )}
                {dayLabel ? (
                  <span className="shrink-0 whitespace-nowrap">{dayLabel}</span>
                ) : null}
              </p>
            ) : null}
          </div>
          <CardContent className="flex flex-col gap-3">
            <ListingScore ratingAvg={vendor.rating_avg} reviewCount={vendor.review_count} />
            {vendor.about ? (
              <p className="text-sm leading-relaxed text-muted-foreground">{vendor.about}</p>
            ) : null}
            <TagList tags={sortTagsForDisplay(vendor.tags)} />
          </CardContent>
        </Link>
      </Card>
    </div>
  );
}
