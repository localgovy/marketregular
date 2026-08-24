"use client";

import Link from "next/link";
import { HomePanel } from "@/components/home-panel";
import { ListingScore } from "@/components/listing-score";
import { TicketMark } from "@/components/marks";
import { SaveButton, useSaves } from "@/components/save-button";
import { useAuthCookie } from "@/lib/supabase/use-auth-cookie";
import type { Market, Vendor } from "@/types/database";

export function SavedRail({
  markets,
}: {
  markets: Array<Pick<Market, "id" | "slug" | "name" | "address" | "rating_avg" | "review_count">>;
}) {
  const saves = useSaves();
  const signedIn = useAuthCookie();
  const savedMarkets = markets.filter((market) => saves.markets.includes(market.slug));
  const vendorCount = saves.vendors.length;

  if (!signedIn || (!savedMarkets.length && !vendorCount)) return null;

  return (
    <HomePanel
      id="saved"
      place="rail"
      tone="here"
      icon={TicketMark}
      kicker="On your list"
      title="Saved"
      how="Markets and stalls you saved."
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
                className="flex items-start gap-2 border-b border-border last:border-b-0"
              >
                <Link
                  href={`/markets/${market.slug}`}
                  className="min-w-0 flex-1 px-3 py-2.5 hover:bg-secondary/50"
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
              {vendorCount === 1 ? "1 saved stall" : `${vendorCount} saved stalls`}
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
  followAccount = false,
}: {
  markets: Market[];
  vendors: Vendor[];
  followAccount?: boolean;
}) {
  const saves = useSaves();
  const savedMarkets = markets.filter((market) => saves.markets.includes(market.slug));
  const savedVendors = vendors.filter((vendor) => saves.vendors.includes(vendor.slug));
  const empty = !savedMarkets.length && !savedVendors.length;

  return (
    <div className="grid gap-10">
      {empty ? (
        <p className="text-muted-foreground">
          {followAccount
            ? "Nothing saved yet. Open a market or a stall and press Save. The list follows this account."
            : "Sign in to save markets and stalls to this account."}
        </p>
      ) : null}
      <section>
        <h2>Markets</h2>
        {savedMarkets.length ? (
          <ul className="mt-3 overflow-hidden rounded-md bg-card ring-1 ring-border">
            {savedMarkets.map((market) => (
              <li
                key={market.id}
                className="flex items-center gap-2 border-b border-border last:border-b-0"
              >
                <Link
                  href={`/markets/${market.slug}`}
                  className="min-w-0 flex-1 px-3 py-3 hover:bg-secondary/50"
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
          <ul className="mt-3 overflow-hidden rounded-md bg-card ring-1 ring-border">
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
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">No stalls on the list.</p>
        )}
      </section>
    </div>
  );
}
