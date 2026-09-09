"use client";

import Link from "next/link";
import { Hours } from "@/components/hours";
import { ListingScore } from "@/components/listing-score";
import { ListingSaveButton, SaveButton } from "@/components/save-button";
import { formatPostedOn } from "@/lib/format";
import type { SavedListing, SavedListingVendor } from "@/lib/saves";
import { cn } from "@/lib/utils";

export type SavedNote = {
  slug: string;
  title: string;
  date: string;
  kicker?: string;
};

export type SavedListingMarket = {
  slug: string;
  address: string;
  rating_avg: number | null;
  review_count: number;
};

export type SavedListingVendorScore = {
  slug: string;
  rating_avg: number | null;
  review_count: number;
};

function listingGroups(rows: SavedListing[]) {
  const sorted = [...rows].sort(
    (left, right) => left.order - right.order || left.heading.localeCompare(right.heading),
  );
  const groups: Array<{ heading: string; rows: SavedListing[] }> = [];
  for (const row of sorted) {
    const last = groups.at(-1);
    if (last?.heading === row.heading) last.rows.push(row);
    else groups.push({ heading: row.heading, rows: [row] });
  }
  return groups;
}

function VendorPeeks({
  vendors,
  scores,
}: {
  vendors: SavedListingVendor[];
  scores: Map<string, SavedListingVendorScore>;
}) {
  if (!vendors.length) return null;

  return (
    <ul className="mt-4 grid gap-1.5">
      {vendors.map((vendor) => {
        const score = scores.get(vendor.slug);
        return (
          <li key={vendor.slug} className="min-w-0 text-sm leading-relaxed">
            <Link href={`/vendors/${vendor.slug}`} className="hover:underline">
              {vendor.name}
            </Link>
            {score ? (
              <ListingScore
                parens
                ratingAvg={score.rating_avg}
                reviewCount={score.review_count}
                className="ml-2 text-muted-foreground"
              />
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function SavedVisit({
  listing,
  heading,
  market,
  vendorScores,
}: {
  listing: SavedListing;
  heading?: string;
  market?: SavedListingMarket;
  vendorScores: Map<string, SavedListingVendorScore>;
}) {
  const saveOnHeading = Boolean(heading);
  const ratingAvg = market?.rating_avg ?? listing.ratingAvg;
  const reviewCount = market?.review_count ?? listing.reviewCount;
  const address = market?.address?.trim() || null;

  const body = (
    <div className="min-w-0">
      <p>
        <Link
          href={`/markets/${listing.marketSlug}`}
          className="text-base font-medium hover:underline"
        >
          {listing.marketName}
        </Link>
        <ListingScore
          parens
          ratingAvg={ratingAvg}
          reviewCount={reviewCount}
          className="ml-2 text-muted-foreground"
        />
      </p>
      <p className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm">
        {address ? <span className="text-muted-foreground">{address}</span> : null}
        {address ? <span className="text-muted-foreground">·</span> : null}
        <Hours value={listing.hours} className="text-foreground" />
      </p>
      <VendorPeeks vendors={listing.vendors} scores={vendorScores} />
    </div>
  );

  return (
    <div>
      {heading ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="min-w-0 text-sm">{heading}</p>
          <ListingSaveButton listing={listing} name={heading} />
        </div>
      ) : null}
      {saveOnHeading ? (
        <div className="mt-4">{body}</div>
      ) : (
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3">
          {body}
          <ListingSaveButton listing={listing} />
        </div>
      )}
    </div>
  );
}

export function SavedNotesSection({
  notes,
  slugs,
  listings = [],
  markets = [],
  vendors = [],
  heading: Heading,
  listClassName,
}: {
  notes: SavedNote[];
  slugs: string[];
  listings?: SavedListing[];
  markets?: SavedListingMarket[];
  vendors?: SavedListingVendorScore[];
  heading: "h2" | "h3";
  listClassName?: string;
}) {
  const bySlug = new Map(notes.map((note) => [note.slug, note]));
  const marketBySlug = new Map(markets.map((market) => [market.slug, market]));
  const vendorScores = new Map(vendors.map((vendor) => [vendor.slug, vendor]));
  const listingsByBlog = new Map<string, SavedListing[]>();
  for (const listing of listings) {
    const rows = listingsByBlog.get(listing.blog) ?? [];
    rows.push(listing);
    listingsByBlog.set(listing.blog, rows);
  }
  const seen = new Set<string>();
  const order: string[] = [];
  for (const slug of slugs) {
    if (seen.has(slug)) continue;
    seen.add(slug);
    order.push(slug);
  }
  for (const slug of listingsByBlog.keys()) {
    if (seen.has(slug)) continue;
    seen.add(slug);
    order.push(slug);
  }
  const rows = order.flatMap((slug) => {
    const note = bySlug.get(slug);
    if (!note && !listingsByBlog.has(slug)) return [];
    return [
      {
        slug,
        note,
        listings: listingsByBlog.get(slug) ?? [],
      },
    ];
  });

  return (
    <section>
      <Heading>Blog</Heading>
      {rows.length ? (
        <ul className={cn("ring-1 ring-border", listClassName)}>
          {rows.map((row) => (
            <li key={row.slug} className="border-b border-border last:border-b-0">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3">
                <Link
                  href={`/blog/${row.slug}`}
                  className="min-w-0 px-3 py-2.5 hover:bg-secondary/50"
                >
                  <span className="block text-base font-medium">
                    {row.note?.title ?? "Saved note"}
                  </span>
                  {row.note ? (
                    <span className="text-sm text-muted-foreground">
                      {formatPostedOn(
                        row.note.date.includes("T") ? row.note.date : `${row.note.date}T12:00:00`,
                      )}
                    </span>
                  ) : null}
                </Link>
                <span className="pr-2">
                  <SaveButton
                    kind="blog"
                    slug={row.slug}
                    name={row.note?.title ?? "this note"}
                  />
                </span>
              </div>
              {row.listings.length
                ? listingGroups(row.listings).map((group) => {
                    const [only] = group.rows;
                    return (
                      <div key={group.heading} className="border-t border-border px-3 py-5">
                        {only && group.rows.length === 1 ? (
                          <SavedVisit
                            listing={only}
                            heading={group.heading}
                            market={marketBySlug.get(only.marketSlug)}
                            vendorScores={vendorScores}
                          />
                        ) : (
                          <>
                            <p className="text-sm">{group.heading}</p>
                            <ul className="mt-3 grid gap-5">
                              {group.rows.map((listing) => (
                                <li key={listing.slug}>
                                  <SavedVisit
                                    listing={listing}
                                    market={marketBySlug.get(listing.marketSlug)}
                                    vendorScores={vendorScores}
                                  />
                                </li>
                              ))}
                            </ul>
                          </>
                        )}
                      </div>
                    );
                  })
                : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">No notes on the list.</p>
      )}
    </section>
  );
}
