import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SaveButton } from "@/components/save-button";
import { TagList } from "@/components/tag-list";
import { WEEKDAYS } from "@/lib/constants";
import type { Vendor } from "@/types/database";

export function VendorCard({
  vendor,
  stall,
  days = [],
}: {
  vendor: Vendor;
  stall?: string | null;
  days?: number[];
}) {
  const dayLabel = days
    .map((d) => WEEKDAYS[d]?.slice(0, 3))
    .filter(Boolean)
    .join(", ");

  return (
    <div className="relative h-full">
      <Link href={`/vendors/${vendor.slug}`} className="block h-full">
        <Card className="h-full overflow-visible transition-shadow hover:shadow-md">
          <CardHeader className="pr-16">
            <p className="type-kicker text-muted-foreground">Stall</p>
            <CardTitle className="type-column">{vendor.name}</CardTitle>
            {stall || dayLabel ? (
              <p className="mt-1 grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 text-sm text-muted-foreground">
                {stall ? (
                  <span className="min-w-0 font-mono tabular-nums">{stall}</span>
                ) : (
                  <span />
                )}
                {dayLabel ? (
                  <span className="shrink-0 whitespace-nowrap">{dayLabel}</span>
                ) : null}
              </p>
            ) : null}
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {vendor.about ? (
              <p className="text-sm leading-relaxed text-muted-foreground">{vendor.about}</p>
            ) : null}
            <TagList tags={vendor.tags} />
          </CardContent>
        </Card>
      </Link>
      <span className="absolute top-4 right-4">
        <SaveButton kind="vendor" slug={vendor.slug} name={vendor.name} />
      </span>
    </div>
  );
}
