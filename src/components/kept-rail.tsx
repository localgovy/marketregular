"use client";

import Link from "next/link";
import { Bookmark } from "lucide-react";
import { HomePanel } from "@/components/home-panel";
import { KeepButton, useKeeps } from "@/components/keep-button";
import type { Market, Vendor } from "@/types/database";

export function KeptRail({
  markets,
  vendors,
}: {
  markets: Market[];
  vendors: Vendor[];
}) {
  const keeps = useKeeps();
  const keptMarkets = markets.filter((market) => keeps.markets.includes(market.slug));
  const keptVendors = vendors.filter((vendor) => keeps.vendors.includes(vendor.slug));

  if (!keptMarkets.length && !keptVendors.length) return null;

  return (
    <HomePanel
      id="kept"
      tone="here"
      icon={Bookmark}
      kicker="On your list"
      title="Kept"
      how="Markets and stalls you marked Keep. They stay in this browser."
      action={
        <Link href="/kept" className="hover:underline">
          Open list
        </Link>
      }
    >
      <div className="grid gap-3">
        {keptMarkets.length ? (
          <ul className="overflow-hidden rounded-md ring-1 ring-border">
            {keptMarkets.map((market) => (
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
                  <KeepButton kind="market" slug={market.slug} name={market.name} />
                </span>
              </li>
            ))}
          </ul>
        ) : null}
        {keptVendors.length ? (
          <ul className="flex flex-wrap gap-2">
            {keptVendors.map((vendor) => (
              <li key={vendor.id} className="flex items-center gap-1.5">
                <Link
                  href={`/vendors/${vendor.slug}`}
                  className="inline-flex min-h-10 items-center rounded-md border border-border bg-background px-3 py-1.5 text-base hover:bg-secondary"
                >
                  {vendor.name}
                </Link>
                <KeepButton kind="vendor" slug={vendor.slug} name={vendor.name} />
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </HomePanel>
  );
}

export function KeptDesk({
  markets,
  vendors,
}: {
  markets: Market[];
  vendors: Vendor[];
}) {
  const keeps = useKeeps();
  const keptMarkets = markets.filter((market) => keeps.markets.includes(market.slug));
  const keptVendors = vendors.filter((vendor) => keeps.vendors.includes(vendor.slug));
  const empty = !keptMarkets.length && !keptVendors.length;

  return (
    <div className="grid gap-10">
      {empty ? (
        <p className="text-muted-foreground">
          Nothing kept yet. Open a market or a stall and press Keep. It stays in this
          browser until you take it off. You do not need an account.
        </p>
      ) : null}
      <section>
        <h2 className="font-heading text-2xl">Markets</h2>
        {keptMarkets.length ? (
          <ul className="mt-3 overflow-hidden rounded-md bg-card ring-1 ring-border">
            {keptMarkets.map((market) => (
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
                  <KeepButton kind="market" slug={market.slug} name={market.name} />
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">No markets on the list.</p>
        )}
      </section>
      <section>
        <h2 className="font-heading text-2xl">Vendors</h2>
        {keptVendors.length ? (
          <ul className="mt-3 overflow-hidden rounded-md bg-card ring-1 ring-border">
            {keptVendors.map((vendor) => (
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
                  <KeepButton kind="vendor" slug={vendor.slug} name={vendor.name} />
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
