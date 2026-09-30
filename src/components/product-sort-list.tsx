"use client";

import { useState } from "react";
import { FindVendorList, ProductHitList } from "@/components/product-results";
import { countLabel } from "@/lib/format";
import type { FindVendor } from "@/lib/data/product-search";
import type { ProductHit } from "@/lib/product-hits";
import {
  FIND_SORTS,
  SEARCH_SORTS,
  hasListedPrice,
  parseFindSort,
  parseSearchSort,
  sortFindVendors,
  sortProductHits,
  type FindSort,
  type SearchSort,
} from "@/lib/product-sort";

function SortSelect<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: ReadonlyArray<{ id: T; label: string }>;
  onChange: (value: T) => void;
}) {
  if (options.length < 2) return null;
  return (
    <label className="inline-flex items-baseline gap-1.5 text-sm text-muted-foreground">
      <span>Sort by</span>
      <select
        aria-label="Sort by"
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="bg-transparent font-medium text-foreground"
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function SortableFindVendors({
  vendors,
  today,
}: {
  vendors: FindVendor[];
  today: number;
}) {
  const allowPrice = vendors.some((vendor) => hasListedPrice(vendor.items));
  const options = allowPrice ? FIND_SORTS : FIND_SORTS.filter((option) => option.id !== "price");
  const [sort, setSort] = useState<FindSort>("next");
  const ordered = sortFindVendors(vendors, parseFindSort(sort, allowPrice), today);

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <p className="text-sm text-muted-foreground">
          {countLabel(vendors.length, "vendor", "vendors")}
        </p>
        <SortSelect value={sort} options={options} onChange={setSort} />
      </div>
      <FindVendorList vendors={ordered} />
    </div>
  );
}

export function SortableProductHits({
  hits,
  today,
}: {
  hits: ProductHit[];
  today: number;
}) {
  const allowPrice = hasListedPrice(hits);
  const options = allowPrice ? SEARCH_SORTS : SEARCH_SORTS.filter((option) => option.id !== "price");
  const [sort, setSort] = useState<SearchSort>("match");
  const ordered = sortProductHits(hits, parseSearchSort(sort, allowPrice), today);
  if (!hits.length) return null;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <p className="text-sm text-muted-foreground">{countLabel(hits.length, "item", "items")}</p>
        <SortSelect value={sort} options={options} onChange={setSort} />
      </div>
      <ProductHitList hits={ordered} />
    </div>
  );
}
