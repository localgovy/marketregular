"use client";

import Link from "next/link";
import { Bookmark } from "lucide-react";
import { HomePanel } from "@/components/home-panel";
import { SaveButton, useSaves } from "@/components/save-button";
import type { Market, Vendor } from "@/types/database";

export function SavedRail({
  markets,
  vendors,
}: {
  markets: Market[];
  vendors: Vendor[];
}) {
  const saves = useSaves();
  const savedMarkets = markets.filter((market) => saves.markets.includes(market.slug));
  const savedVendors = vendors.filter((vendor) => saves.vendors.includes(vendor.slug));

  if (!savedMarkets.length && !savedVendors.length) return null;

  return (
    <HomePanel
      id="saved"
      tone="here"
      icon={Bookmark}
      kicker="On your list"
      title="Saved"
      how="Markets and stalls you saved. They stay in this browser."
      action={
        <Link href="/saved" className="hover:underline">
          Open list
        </Link>
      }
    >
      <div className="grid gap-3">
        {savedMarkets.length ? (
          <ul className="overflow-hidden rounded-md ring-1 ring-border">
            {savedMarkets.map((market) => (
              <li
                key={market.id}
                className="flex items-center gap-2 border-b border-border last:border-b-0"
              >
                <Link
                  href={`/markets/${market.slug}`}
                  className="min-w-0 flex-1 px-3 py-2.5 hover:bg-secondary/50"
                >
                  <span className="block truncate text-base font-medium">{market.name}</span>
                  <span className="text-sm text-muted-foreground">{market.address}</span>
                </Link>
                <span className="pr-2">
                  <SaveButton kind="market" slug={market.slug} name={market.name} />
                </span>
              </li>
            ))}
          </ul>
        ) : null}
        {savedVendors.length ? (
          <ul className="flex flex-wrap gap-2">
            {savedVendors.map((vendor) => (
              <li key={vendor.id} className="flex items-center gap-1.5">
                <Link
                  href={`/vendors/${vendor.slug}`}
                  className="inline-flex min-h-10 items-center stall-chip-sm border border-border bg-background px-3 py-1.5 text-base hover:bg-secondary"
                >
                  {vendor.name}
                </Link>
                <SaveButton kind="vendor" slug={vendor.slug} name={vendor.name} />
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </HomePanel>
  );
}

export function SavedDesk({
  markets,
  vendors,
}: {
  markets: Market[];
  vendors: Vendor[];
}) {
  const saves = useSaves();
  const savedMarkets = markets.filter((market) => saves.markets.includes(market.slug));
  const savedVendors = vendors.filter((vendor) => saves.vendors.includes(vendor.slug));
  const empty = !savedMarkets.length && !savedVendors.length;

  return (
    <div className="grid gap-10">
      {empty ? (
        <p className="text-muted-foreground">
          Nothing saved yet. Open a market or a stall and press Save. It stays in this
          browser until you take it off. You do not need an account.
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
                  <span className="block truncate text-base font-medium">{market.name}</span>
                  <span className="text-sm text-muted-foreground">{market.address}</span>
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
                  <span className="block truncate text-base font-medium">{vendor.name}</span>
                  {vendor.about ? (
                    <span className="line-clamp-1 text-sm text-muted-foreground">
                      {vendor.about}
                    </span>
                  ) : null}
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
