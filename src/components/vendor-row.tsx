import Link from "next/link";
import { ListingScore } from "@/components/listing-score";
import { SaveButton } from "@/components/save-button";
import { tagLabel, sortTagsForDisplay } from "@/lib/find-paths";
import type { Vendor } from "@/types/database";

function tagLine(tags: string[]) {
  return sortTagsForDisplay(tags).slice(0, 3).map(tagLabel).join(" · ");
}

export function VendorRow({
  vendor,
  where,
}: {
  vendor: Vendor;
  where?: string;
}) {
  const tags = tagLine(vendor.tags);
  return (
    <div className="flex items-center gap-2 border-b border-border last:border-b-0 hover:bg-secondary/50">
      <Link href={`/vendors/${vendor.slug}`} className="min-w-0 flex-1 px-3 py-3">
        <span className="block text-base font-medium">{vendor.name}</span>
        <span className="flex flex-wrap items-baseline gap-x-2 text-sm text-muted-foreground">
          <span>{tags || where || vendor.about || "Stall"}</span>
          <ListingScore
            ratingAvg={vendor.rating_avg}
            reviewCount={vendor.review_count}
            compact
            className="text-foreground"
          />
        </span>
      </Link>
      <span className="pr-3">
        <SaveButton kind="vendor" slug={vendor.slug} name={vendor.name} />
      </span>
    </div>
  );
}
