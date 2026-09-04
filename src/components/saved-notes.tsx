"use client";

import Link from "next/link";
import { Hours } from "@/components/hours";
import { ListingScore } from "@/components/listing-score";
import { ListingSaveButton, SaveButton } from "@/components/save-button";
import { formatPostedOn } from "@/lib/format";
import type { SavedListing } from "@/lib/saves";
import { cn } from "@/lib/utils";

export type SavedNote = {
  slug: string;
  title: string;
  date: string;
  kicker?: string;
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

function SavedListingRow({ listing }: { listing: SavedListing }) {
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 py-3">
      <div className="min-w-0">
        <span className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <Link
            href={`/markets/${listing.marketSlug}`}
            className="text-base font-medium hover:underline"
          >
            {listing.marketName}
          </Link>
          <ListingScore
            ratingAvg={listing.ratingAvg}
            reviewCount={listing.reviewCount}
            className="text-foreground"
          />
        </span>
        {listing.vendors.length ? (
          <p className="mt-1.5 grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-3 text-sm leading-relaxed">
            <span className="text-muted-foreground">Vendors</span>
            <span className="min-w-0">
              {listing.vendors.map((vendor, vendorIndex) => (
                <span key={vendor.slug}>
                  {vendorIndex ? ", " : null}
                  <Link
                    href={`/vendors/${vendor.slug}`}
                    className="text-foreground hover:underline"
                  >
                    {vendor.name}
                  </Link>
                </span>
              ))}
            </span>
          </p>
        ) : null}
      </div>
      <span className="flex shrink-0 items-start gap-2">
        <Hours value={listing.hours} className="text-foreground" />
        <ListingSaveButton listing={listing} />
      </span>
    </li>
  );
}

export function SavedNotesSection({
  notes,
  slugs,
  listings = [],
  heading: Heading,
  listClassName,
}: {
  notes: SavedNote[];
  slugs: string[];
  listings?: SavedListing[];
  heading: "h2" | "h3";
  listClassName?: string;
}) {
  const bySlug = new Map(notes.map((note) => [note.slug, note]));
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
                ? listingGroups(row.listings).map((group) => (
                    <div key={group.heading} className="border-t border-border px-3 pb-1">
                      <p className="pt-3 text-sm text-muted-foreground">{group.heading}</p>
                      <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 text-sm text-muted-foreground">
                        <span>Market</span>
                        <span className="flex items-center gap-2">
                          <span>Hours</span>
                          <span className="invisible stall-chip-sm inline-flex h-8 px-2.5 text-sm" aria-hidden>
                            Save
                          </span>
                        </span>
                      </div>
                      <ul className="divide-y divide-border">
                        {group.rows.map((listing) => (
                          <SavedListingRow key={listing.slug} listing={listing} />
                        ))}
                      </ul>
                    </div>
                  ))
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
