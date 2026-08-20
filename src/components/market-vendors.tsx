"use client";

import { useMemo, useState } from "react";
import { VendorCard } from "@/components/vendor-card";
import { CloseMark } from "@/components/marks";
import { Input } from "@/components/ui/input";
import { WEEKDAYS } from "@/lib/constants";
import type { MarketDetail } from "@/types/database";

type MarketStall = MarketDetail["vendors"][number];

function fold(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function stallMatches(vendor: MarketStall, query: string) {
  const tokens = fold(query).split(" ").filter(Boolean);
  if (!tokens.length) return true;
  const hay = fold(
    [
      vendor.name,
      vendor.stall,
      vendor.about,
      vendor.tags.join(" "),
      vendor.days.map((day) => WEEKDAYS[day] ?? "").join(" "),
    ]
      .filter(Boolean)
      .join(" "),
  );
  return tokens.every((token) => hay.includes(token));
}

export function MarketVendors({ vendors }: { vendors: MarketStall[] }) {
  const [query, setQuery] = useState("");
  const matches = useMemo(
    () => vendors.filter((vendor) => stallMatches(vendor, query)),
    [vendors, query],
  );
  const searching = fold(query).length > 0;

  return (
    <section id="vendors">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <h2>Vendors</h2>
        {vendors.length ? (
          <p className="text-sm text-muted-foreground">
            {searching ? `${matches.length} of ${vendors.length}` : `${vendors.length} listed`}
          </p>
        ) : null}
      </div>
      {vendors.length ? (
        <>
          <p className="mt-1 text-sm text-muted-foreground">Tap a name for the menu.</p>
          <div className="relative mt-4 max-w-md">
            <label htmlFor="market-vendor-search" className="sr-only">
              Find a stall
            </label>
            <Input
              id="market-vendor-search"
              type="text"
              role="searchbox"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Find a stall"
              autoComplete="off"
              className="h-10 bg-card pr-10 text-base md:text-base"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute top-1/2 right-1.5 flex size-7 -translate-y-1/2 items-center justify-center text-muted-foreground hover:text-foreground"
                aria-label="Clear"
              >
                <CloseMark className="size-3.5" />
              </button>
            ) : null}
          </div>
          {matches.length ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {matches.map((vendor) => (
                <VendorCard
                  key={vendor.id}
                  vendor={vendor}
                  stall={vendor.stall}
                  days={vendor.days}
                />
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">No stalls match that.</p>
          )}
        </>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">Vendor list is being filled in.</p>
      )}
    </section>
  );
}
