"use client";

import { useMemo, useState } from "react";
import { moreProducts } from "@/app/actions/products";
import { FindVendorList, ProductHitList } from "@/components/product-results";
import { countLabel } from "@/lib/format";
import type { FindVendor } from "@/lib/data/product-search";
import { PRODUCT_PAGE } from "@/lib/product-hits";
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
  page,
}: {
  hits: ProductHit[];
  today: number;
  page?: {
    q: string;
    openToday: boolean;
    marketSlug: string | null;
    day: number | null;
  };
}) {
  const allowPrice = hasListedPrice(hits);
  const options = allowPrice ? SEARCH_SORTS : SEARCH_SORTS.filter((option) => option.id !== "price");
  const [sort, setSort] = useState<SearchSort>("match");
  const [extra, setExtra] = useState<ProductHit[]>([]);
  const [offset, setOffset] = useState(hits.length);
  const [done, setDone] = useState(hits.length < PRODUCT_PAGE);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const all = useMemo(() => {
    const seen = new Set(hits.map((hit) => `${hit.vendorSlug}\0${hit.itemName}`));
    const next = [...hits];
    for (const hit of extra) {
      const key = `${hit.vendorSlug}\0${hit.itemName}`;
      if (seen.has(key)) continue;
      seen.add(key);
      next.push(hit);
    }
    return next;
  }, [hits, extra]);
  const ordered = sortProductHits(all, parseSearchSort(sort, allowPrice), today);
  if (!all.length) return null;

  async function loadMore() {
    if (!page || busy || done) return;
    setBusy(true);
    try {
      const next = await moreProducts({ ...page, offset });
      setExtra((current) => [...current, ...next]);
      setOffset((current) => current + PRODUCT_PAGE);
      if (next.length < PRODUCT_PAGE) setDone(true);
      setError(null);
    } catch {
      setError("Couldn't load more products. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <p className="text-sm text-muted-foreground">
          {countLabel(all.length, "item", "items")}
          {done ? "" : " so far"}
        </p>
        <SortSelect value={sort} options={options} onChange={setSort} />
      </div>
      <ProductHitList hits={ordered} />
      {page && !done ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            void loadMore();
          }}
          className="mt-6 text-base font-medium hover:underline disabled:opacity-60"
        >
          {busy ? "Loading" : "Show more"}
        </button>
      ) : null}
      {error ? <p className="mt-2 text-sm text-muted-foreground">{error}</p> : null}
    </div>
  );
}
