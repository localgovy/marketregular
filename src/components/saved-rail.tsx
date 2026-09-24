"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSavedRailMarkets, type SavedRailMarket } from "@/app/actions/home-lazy";
import { AddressLink } from "@/components/address-link";
import { HomePanel } from "@/components/home-panel";
import { ListingScore } from "@/components/listing-score";
import { SavedNotesSection, type SavedNote } from "@/components/saved-notes";
import { TicketMark } from "@/components/marks";
import { SaveButton, useSaves } from "@/components/save-button";
import { VerifiedName } from "@/components/verified-stamp";
import { useHydratedSaves } from "@/lib/use-hydrated-saves";
import { EMPTY_SAVES, type Saves } from "@/lib/saves";
import { useAuthCookie } from "@/lib/supabase/use-auth-cookie";
import type { Market, Vendor } from "@/types/database";

export function SavedRail() {
  const saves = useSaves();
  const signedIn = useAuthCookie();
  const [markets, setMarkets] = useState<SavedRailMarket[]>([]);
  const [ready, setReady] = useState(false);
  const saveKey = saves.markets.join(" ");

  useEffect(() => {
    if (!signedIn || !saves.markets.length) {
      setMarkets([]);
      setReady(true);
      return;
    }
    let cancelled = false;
    setReady(false);
    void getSavedRailMarkets(saves.markets).then((rows) => {
      if (cancelled) return;
      setMarkets(rows);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [signedIn, saveKey, saves.markets]);

  const bySlug = new Map(markets.map((market) => [market.slug, market]));
  const savedMarkets = saves.markets.flatMap((slug) => {
    const market = bySlug.get(slug);
    return market ? [market] : [];
  });
  const vendorCount = saves.vendors.length;
  const blogCount = saves.blogs.length;

  if (!signedIn || !ready || (!savedMarkets.length && !vendorCount && !blogCount)) return null;

  return (
    <HomePanel
      id="saved"
      place="rail"
      tone="here"
      icon={TicketMark}
      kicker="On your list"
      title="Saved"
      how="Markets, vendors, blog posts, and reviews on this account."
      action={
        <Link href="/saved" className="hover:underline">
          Open list
        </Link>
      }
    >
      <div className="grid gap-3">
        {savedMarkets.length ? (
          <ul className="ring-1 ring-border">
            {savedMarkets.map((market) => (
              <li
                key={market.id}
                className="flex items-center gap-2 border-b border-border last:border-b-0"
              >
                <div className="min-w-0 flex-1 px-3 py-2.5">
                  <p className="min-w-0">
                    <Link href={`/markets/${market.slug}`} className="text-base font-medium hover:underline">
                      <VerifiedName slug={market.slug} name={market.name} />
                    </Link>
                    <ListingScore
                      parens
                      ratingAvg={market.rating_avg}
                      reviewCount={market.review_count}
                      className="ml-2 text-muted-foreground"
                    />
                  </p>
                  <AddressLink
                    className="mt-0.5 block text-sm text-muted-foreground"
                    address={market.address}
                    city={market.city}
                    name={market.name}
                    lat={market.lat}
                    lng={market.lng}
                  />
                </div>
                <span className="pr-2">
                  <SaveButton kind="market" slug={market.slug} name={market.name} />
                </span>
              </li>
            ))}
          </ul>
        ) : null}
        {vendorCount ? (
          <p className="text-sm text-muted-foreground">
            <Link href="/saved" className="font-medium text-primary hover:underline">
              {vendorCount === 1 ? "1 saved vendor" : `${vendorCount} saved vendors`}
            </Link>
          </p>
        ) : null}
        {blogCount ? (
          <p className="text-sm text-muted-foreground">
            <Link href="/saved" className="font-medium text-primary hover:underline">
              See more
            </Link>
          </p>
        ) : null}
      </div>
    </HomePanel>
  );
}

export function SavedDesk({
  markets,
  vendors,
  notes,
  followAccount = false,
  initialSaves = EMPTY_SAVES,
}: {
  markets: Market[];
  vendors: Vendor[];
  notes: SavedNote[];
  followAccount?: boolean;
  initialSaves?: Saves;
}) {
  const saves = useHydratedSaves(initialSaves);
  const savedMarkets = markets.filter((market) => saves.markets.includes(market.slug));
  const savedVendors = vendors.filter((vendor) => saves.vendors.includes(vendor.slug));
  const empty = !savedMarkets.length && !savedVendors.length && !saves.blogs.length && !saves.listings.length;

  return (
    <div className="grid gap-10">
      {empty ? (
        <p className="text-muted-foreground">
          {followAccount
            ? "Nothing saved yet. Open a market, a vendor, or a note and press Save. The list follows this account."
            : "Sign in to save markets, vendors, blog posts, and reviews to this account."}
        </p>
      ) : null}
      <section>
        <h2>Markets</h2>
        {savedMarkets.length ? (
          <ul className="mt-3 bg-card ring-1 ring-border">
            {savedMarkets.map((market) => (
              <li
                key={market.id}
                className="flex items-center gap-2 border-b border-border last:border-b-0"
              >
                <div className="min-w-0 flex-1 px-3 py-3">
                  <Link
                    href={`/markets/${market.slug}`}
                    className="block text-base font-medium hover:underline"
                  >
                    <VerifiedName slug={market.slug} name={market.name} />
                  </Link>
                  <span className="flex flex-wrap items-baseline gap-x-2 text-sm text-muted-foreground">
                    <AddressLink
                      address={market.address}
                      city={market.city}
                      name={market.name}
                      lat={market.lat}
                      lng={market.lng}
                    />
                    <ListingScore
                      parens
                      ratingAvg={market.rating_avg}
                      reviewCount={market.review_count}
                      className="text-stamp"
                    />
                  </span>
                </div>
                <span className="pr-3">
                  <SaveButton kind="market" slug={market.slug} name={market.name} />
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">No markets on the list.</p>
        )}
      </section>
      <section>
        <h2>Vendors</h2>
        {savedVendors.length ? (
          <ul className="mt-3 bg-card ring-1 ring-border">
            {savedVendors.map((vendor) => (
              <li
                key={vendor.id}
                className="flex items-center gap-2 border-b border-border last:border-b-0"
              >
                <Link
                  href={`/vendors/${vendor.slug}`}
                  className="min-w-0 flex-1 px-3 py-3 hover:bg-secondary/50"
                >
                  <span className="block text-base font-medium">{vendor.name}</span>
                  <span className="flex flex-wrap items-baseline gap-x-2 text-sm text-muted-foreground">
                    {vendor.about ? (
                      <span className="line-clamp-1 min-w-0">{vendor.about}</span>
                    ) : null}
                    <ListingScore
                      parens
                      ratingAvg={vendor.rating_avg}
                      reviewCount={vendor.review_count}
                      className="text-stamp"
                    />
                  </span>
                </Link>
                <span className="pr-3">
                  <SaveButton kind="vendor" slug={vendor.slug} name={vendor.name} />
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">No vendors on the list.</p>
        )}
      </section>
      <SavedNotesSection
        notes={notes}
        slugs={saves.blogs}
        listings={saves.listings}
        markets={markets}
        vendors={vendors}
        heading="h2"
        listClassName="mt-3 bg-card"
      />
    </div>
  );
}
