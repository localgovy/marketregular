"use client";

import Link from "next/link";
import { ListingScore } from "@/components/listing-score";
import { SavedNotesSection, type SavedNote } from "@/components/saved-notes";
import { SaveButton } from "@/components/save-button";
import { useHydratedSaves } from "@/lib/use-hydrated-saves";
import type { Saves } from "@/lib/saves";
import type { Market, Vendor } from "@/types/database";

export function AccountSavedLists({
  markets,
  vendors,
  notes,
  nextHours,
  vendorWhen,
  initialSaves,
}: {
  markets: Market[];
  vendors: Vendor[];
  notes: SavedNote[];
  nextHours: Record<string, string>;
  vendorWhen: Record<string, string>;
  initialSaves: Saves;
}) {
  const saves = useHydratedSaves(initialSaves);
  const savedMarkets = markets.filter((market) => saves.markets.includes(market.slug));
  const savedVendors = vendors.filter((vendor) => saves.vendors.includes(vendor.slug));
  const empty =
    !savedMarkets.length && !savedVendors.length && !saves.blogs.length;

  if (empty) {
    return (
      <p className="text-base text-muted-foreground">
        Nothing on the list yet.{" "}
        <Link href="/markets" className="font-medium text-primary hover:underline">
          Open the directory
        </Link>{" "}
        or{" "}
        <Link href="/blog" className="font-medium text-primary hover:underline">
          the blog
        </Link>{" "}
        and press Save. It follows this account.
      </p>
    );
  }

  return (
    <div className="grid gap-6">
      <section>
        <h3>Markets</h3>
        {savedMarkets.length ? (
          <ul className="mt-2 ring-1 ring-border">
            {savedMarkets.map((market) => {
              const hours = nextHours[market.slug];
              return (
                <li
                  key={market.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-3 border-b border-border last:border-b-0"
                >
                  <Link
                    href={`/markets/${market.slug}`}
                    className="min-w-0 px-3 py-2.5 hover:bg-secondary/50"
                  >
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
                  {hours ? (
                    <span className="shrink-0 whitespace-nowrap py-2.5 text-sm text-muted-foreground">
                      {hours}
                    </span>
                  ) : (
                    <span />
                  )}
                  <span className="pr-2">
                    <SaveButton kind="market" slug={market.slug} name={market.name} />
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">No markets on the list.</p>
        )}
      </section>
      <section>
        <h3>Stalls</h3>
        {savedVendors.length ? (
          <ul className="mt-2 ring-1 ring-border">
            {savedVendors.map((vendor) => (
              <li
                key={vendor.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 border-b border-border last:border-b-0"
              >
                <Link
                  href={`/vendors/${vendor.slug}`}
                  className="min-w-0 px-3 py-2.5 hover:bg-secondary/50"
                >
                  <span className="block text-base font-medium">{vendor.name}</span>
                  <span className="flex flex-wrap items-baseline gap-x-2 text-sm text-muted-foreground">
                    {vendorWhen[vendor.slug] ? <span>{vendorWhen[vendor.slug]}</span> : null}
                    <ListingScore
                      ratingAvg={vendor.rating_avg}
                      reviewCount={vendor.review_count}
                      compact
                      className="text-foreground"
                    />
                  </span>
                </Link>
                <span className="pr-2">
                  <SaveButton kind="vendor" slug={vendor.slug} name={vendor.name} />
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">No stalls on the list.</p>
        )}
      </section>
      <SavedNotesSection
        notes={notes}
        slugs={saves.blogs}
        heading="h3"
        listClassName="mt-2"
      />
    </div>
  );
}
