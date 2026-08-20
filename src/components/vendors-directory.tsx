"use client";

import { useMemo, useState } from "react";
import { CloseMark } from "@/components/marks";
import { VendorRow } from "@/components/vendor-row";
import { Input } from "@/components/ui/input";
import { WEEKDAYS } from "@/lib/constants";
import { vendorProductTags } from "@/lib/vendor-tags";
import type { Vendor } from "@/types/database";

export type VendorDirectoryRow = Vendor & {
  where: string[];
  stalls: string[];
  days: number[];
};

function fold(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function vendorMatches(vendor: VendorDirectoryRow, query: string) {
  const tokens = fold(query).split(" ").filter(Boolean);
  if (!tokens.length) return true;
  const hay = fold(
    [
      vendor.name,
      vendor.about,
      ...vendorProductTags(vendor.name, vendor.tags),
      ...vendor.where,
      ...vendor.stalls,
      ...vendor.days.map((day) => WEEKDAYS[day] ?? ""),
    ]
      .filter(Boolean)
      .join(" "),
  );
  return tokens.every((token) => hay.includes(token));
}

export function VendorsDirectory({ vendors }: { vendors: VendorDirectoryRow[] }) {
  const [query, setQuery] = useState("");
  const matches = useMemo(
    () => vendors.filter((vendor) => vendorMatches(vendor, query)),
    [vendors, query],
  );
  const searching = fold(query).length > 0;

  return (
    <>
      <div className="relative mb-4 max-w-md">
        <label htmlFor="vendor-directory-search" className="sr-only">
          Find a stall
        </label>
        <Input
          id="vendor-directory-search"
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
      <p className="mb-3 text-sm text-muted-foreground">
        {searching ? `${matches.length} of ${vendors.length}` : `${vendors.length} listed`}
      </p>
      {matches.length ? (
        <div className="rounded-md bg-card ring-1 ring-border">
          {matches.map((vendor) => (
            <VendorRow
              key={vendor.id}
              vendor={vendor}
              where={vendor.where.join(" · ")}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No stalls match that.</p>
      )}
    </>
  );
}
