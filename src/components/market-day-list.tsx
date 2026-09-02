import Link from "next/link";
import { Hours } from "@/components/hours";
import { ListingScore } from "@/components/listing-score";
import { NowLabel } from "@/components/now-label";
import { SaveButton } from "@/components/save-button";
import { marketPlaceLine } from "@/lib/listing-copy";
import type { MarketDayRow } from "@/lib/landing";

/**
 * Hours sit in an auto column that cannot shrink, and nothing here clips: this list is
 * the answer to “when is it open”, so every name and every hour has to be readable.
 */
export function MarketDayList({
  rows,
}: {
  rows: MarketDayRow[];
}) {
  if (!rows.length) return null;

  return (
    <ul className="mt-4 rounded-md bg-card ring-1 ring-border">
      {rows.map((row) => {
        return (
          <li
            key={row.market.id}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 border-b border-border px-3 py-3 last:border-b-0 hover:bg-secondary/50"
          >
            <div className="min-w-0">
              <Link
                href={`/markets/${row.market.slug}`}
                className="text-base font-medium hover:underline"
              >
                {row.market.name}
              </Link>
              <p className="mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm text-muted-foreground">
                <span>{marketPlaceLine(row.market.address, row.market.city)}</span>
                {row.stallCount > 0 ? (
                  <span>
                    <span className="type-nums text-foreground">{row.stallCount}</span>{" "}
                    {row.stallCount === 1 ? "stall" : "stalls"}
                  </span>
                ) : null}
                <ListingScore
                  ratingAvg={row.market.rating_avg}
                  reviewCount={row.market.review_count}
                  compact
                  className="text-foreground"
                />
              </p>
              {row.notes ? (
                <p className="mt-0.5 text-sm text-muted-foreground">{row.notes}</p>
              ) : null}
            </div>
            <span className="flex shrink-0 flex-col items-end gap-1">
              <span className="flex items-center gap-2">
                {row.openNow ? <NowLabel>Open now</NowLabel> : null}
                <Hours value={row.hours} className="text-foreground" />
              </span>
              <SaveButton kind="market" slug={row.market.slug} name={row.market.name} />
            </span>
          </li>
        );
      })}
    </ul>
  );
}
