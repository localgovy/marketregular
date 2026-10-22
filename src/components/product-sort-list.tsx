"use client";

import { useMemo, useState } from "react";
import { moreProducts } from "@/app/actions/products";
import { SearchMark } from "@/components/marks";
import { FindVendorList, ProductHitList } from "@/components/product-results";
import { countLabel } from "@/lib/format";
import type { FindVendor } from "@/lib/data/product-search";
import { PRODUCT_PAGE, type ProductHit } from "@/lib/product-hits";
import {
  FIND_SORTS,
  SEARCH_SORTS,
  hasListedPrice,
  knownPrice,
  parseFindSort,
  parseSearchSort,
  sortFindVendors,
  sortProductHits,
  type FindSort,
  type SearchSort,
} from "@/lib/product-sort";
import { cn } from "@/lib/utils";

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
    <label className="inline-flex items-center gap-2 rounded bg-receipt px-3 py-1.5 text-sm text-muted-foreground ring-1 ring-border">
      <span>Sort by</span>
      <select
        aria-label="Sort by"
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="cursor-pointer bg-transparent font-medium text-foreground focus:outline-none"
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
  selectedMarketSlug: controlledMarketSlug,
  onSelectMarketSlug,
  productTerm,
}: {
  vendors: FindVendor[];
  today: number;
  selectedMarketSlug?: string | null;
  onSelectMarketSlug?: (slug: string | null) => void;
  productTerm?: string;
}) {
  const allowPrice = vendors.some((vendor) => hasListedPrice(vendor.items));
  const options = allowPrice ? FIND_SORTS : FIND_SORTS.filter((option) => option.id !== "price");
  const [sort, setSort] = useState<FindSort>("next");
  const [query, setQuery] = useState("");
  const [whenFilter, setWhenFilter] = useState<"all" | "today" | "weekend">("all");
  const [pricedOnly, setPricedOnly] = useState(false);
  const [internalMarketSlug, setInternalMarketSlug] = useState<string | null>(null);

  const activeMarketSlug =
    controlledMarketSlug !== undefined ? controlledMarketSlug : internalMarketSlug;

  function setMarketFilter(slug: string | null) {
    if (onSelectMarketSlug) {
      onSelectMarketSlug(slug);
    } else {
      setInternalMarketSlug(slug);
    }
  }

  const todayCount = useMemo(
    () =>
      vendors.filter(
        (v) => v.badge === "Open now" || v.badge === "Later today" || v.waitDays === 0,
      ).length,
    [vendors],
  );

  const weekendCount = useMemo(
    () =>
      vendors.filter(
        (v) =>
          v.badge === "Selling this weekend" ||
          v.markets.some((m) => m.days.includes(0) || m.days.includes(6)),
      ).length,
    [vendors],
  );

  const pricedCount = useMemo(
    () => vendors.filter((v) => hasListedPrice(v.items)).length,
    [vendors],
  );

  const topMarkets = useMemo(() => {
    const counts = new Map<string, { slug: string; name: string; count: number }>();
    for (const v of vendors) {
      for (const m of v.markets) {
        const existing = counts.get(m.slug);
        if (existing) {
          existing.count += 1;
        } else {
          counts.set(m.slug, { slug: m.slug, name: m.name, count: 1 });
        }
      }
    }
    return [...counts.values()].sort(
      (a, b) => b.count - a.count || a.name.localeCompare(b.name, "en-CA"),
    );
  }, [vendors]);

  const ordered = useMemo(
    () => sortFindVendors(vendors, parseFindSort(sort, allowPrice), today),
    [vendors, sort, allowPrice, today],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ordered.filter((vendor) => {
      if (whenFilter === "today") {
        const isToday =
          vendor.badge === "Open now" ||
          vendor.badge === "Later today" ||
          vendor.waitDays === 0;
        if (!isToday) return false;
      }
      if (whenFilter === "weekend") {
        const isWeekend =
          vendor.badge === "Selling this weekend" ||
          vendor.markets.some((m) => m.days.includes(0) || m.days.includes(6));
        if (!isWeekend) return false;
      }
      if (pricedOnly && !hasListedPrice(vendor.items)) {
        return false;
      }
      if (activeMarketSlug && !vendor.markets.some((m) => m.slug === activeMarketSlug)) {
        return false;
      }
      if (q) {
        const hay = [
          vendor.name,
          ...vendor.items.map((i) => i.name),
          ...vendor.markets.map((m) => m.name),
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [ordered, whenFilter, pricedOnly, activeMarketSlug, query]);

  const hasActiveFilter =
    whenFilter !== "all" ||
    pricedOnly ||
    Boolean(activeMarketSlug) ||
    query.trim().length > 0;

  function resetFilters() {
    setWhenFilter("all");
    setPricedOnly(false);
    setMarketFilter(null);
    setQuery("");
  }

  return (
    <div>
      {/* Interactive Filter & Sort Control Deck */}
      <div className="bg-card p-4 ring-1 ring-board sm:p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-3.5">
          <div>
            <p className="type-kicker text-primary">Stalls &amp; menu comparison</p>
            <h2 className="mt-0.5">
              {productTerm ? `Where to buy ${productTerm.toLowerCase()}` : "Published stalls"}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {hasActiveFilter ? (
              <button
                type="button"
                onClick={resetFilters}
                className="cursor-pointer text-sm font-medium text-stamp hover:underline"
              >
                Reset filters
              </button>
            ) : null}
            <span className="type-nums text-sm text-muted-foreground">
              Showing {filtered.length} of {countLabel(vendors.length, "vendor", "vendors")}
            </span>
            <SortSelect value={sort} options={options} onChange={setSort} />
          </div>
        </div>

        {/* Search + Availability & Price Filter Pills */}
        <div className="mt-3.5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <label className="flex items-center gap-2.5 bg-receipt px-3.5 py-2 ring-1 ring-border focus-within:ring-2 focus-within:ring-primary">
            <SearchMark className="size-4 shrink-0 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Filter ${vendors.length} ${vendors.length === 1 ? "stall" : "stalls"}, menu varieties, or markets…`}
              className="w-full bg-transparent text-base text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </label>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setWhenFilter("all");
                setPricedOnly(false);
              }}
              className={cn(
                "stall-chip-sm cursor-pointer px-3 py-1.5 text-sm font-medium transition-colors",
                whenFilter === "all" && !pricedOnly
                  ? "bg-board text-chalk"
                  : "bg-secondary text-foreground hover:bg-secondary/80",
              )}
            >
              All ({vendors.length})
            </button>

            {todayCount > 0 ? (
              <button
                type="button"
                onClick={() => setWhenFilter(whenFilter === "today" ? "all" : "today")}
                className={cn(
                  "stall-chip-sm cursor-pointer px-3 py-1.5 text-sm font-medium transition-colors",
                  whenFilter === "today"
                    ? "bg-stamp text-chalk"
                    : "bg-secondary text-foreground hover:bg-secondary/80",
                )}
              >
                Selling today ({todayCount})
              </button>
            ) : null}

            {weekendCount > 0 ? (
              <button
                type="button"
                onClick={() => setWhenFilter(whenFilter === "weekend" ? "all" : "weekend")}
                className={cn(
                  "stall-chip-sm cursor-pointer px-3 py-1.5 text-sm font-medium transition-colors",
                  whenFilter === "weekend"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-foreground hover:bg-secondary/80",
                )}
              >
                Weekend ({weekendCount})
              </button>
            ) : null}

            {allowPrice && pricedCount > 0 ? (
              <button
                type="button"
                onClick={() => setPricedOnly((prev) => !prev)}
                className={cn(
                  "stall-chip-sm cursor-pointer px-3 py-1.5 text-sm font-medium transition-colors",
                  pricedOnly
                    ? "bg-stamp text-chalk"
                    : "bg-receipt text-foreground ring-1 ring-border hover:bg-secondary",
                )}
              >
                Has price ({pricedCount})
              </button>
            ) : null}
          </div>
        </div>

        {/* Market Quick-Filter Pills */}
        {topMarkets.length > 1 ? (
          <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-dashed border-border pt-3">
            <span className="mr-1 text-sm font-medium text-muted-foreground">
              Filter by market:
            </span>
            <button
              type="button"
              onClick={() => setMarketFilter(null)}
              className={cn(
                "cursor-pointer rounded px-2.5 py-1 text-sm font-medium transition-colors",
                activeMarketSlug === null
                  ? "bg-primary text-primary-foreground"
                  : "bg-receipt text-foreground ring-1 ring-border hover:bg-secondary",
              )}
            >
              Any market
            </button>
            {topMarkets.slice(0, 6).map((m) => {
              const active = activeMarketSlug === m.slug;
              return (
                <button
                  key={m.slug}
                  type="button"
                  onClick={() => setMarketFilter(active ? null : m.slug)}
                  className={cn(
                    "cursor-pointer rounded px-2.5 py-1 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "bg-receipt text-foreground ring-1 ring-border hover:bg-secondary",
                  )}
                >
                  <span>{m.name}</span>{" "}
                  <span
                    className={cn(
                      "type-nums",
                      active ? "text-primary-foreground/85" : "text-muted-foreground",
                    )}
                  >
                    ({m.count})
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      {filtered.length === 0 && hasActiveFilter ? (
        <div className="mt-5 bg-receipt p-6 text-center ring-1 ring-board">
          <p className="text-base font-medium text-foreground">
            No stalls match that filter combination.
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="mt-3 cursor-pointer rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Show all {vendors.length} {vendors.length === 1 ? "stall" : "stalls"}
          </button>
        </div>
      ) : (
        <FindVendorList vendors={filtered} highlightMarketSlug={activeMarketSlug} />
      )}
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
  const [sort, setSort] = useState<SearchSort>("match");
  const [extra, setExtra] = useState<ProductHit[]>([]);
  const [offset, setOffset] = useState(hits.length);
  const [done, setDone] = useState(hits.length < PRODUCT_PAGE);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pricedOnly, setPricedOnly] = useState(false);
  const [whenFilter, setWhenFilter] = useState<"all" | "today" | "weekend">("all");
  const [marketFilter, setMarketFilter] = useState<string | null>(null);

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

  const allowPrice = hasListedPrice(all);
  const options = allowPrice ? SEARCH_SORTS : SEARCH_SORTS.filter((option) => option.id !== "price");
  const ordered = useMemo(
    () => sortProductHits(all, parseSearchSort(sort, allowPrice), today),
    [all, sort, allowPrice, today],
  );

  const pricedCount = useMemo(
    () => all.filter((h) => knownPrice(h.priceCents) != null).length,
    [all],
  );
  const todayCount = useMemo(
    () =>
      all.filter((h) => h.openToday || h.badge === "Open now" || h.badge === "Later today")
        .length,
    [all],
  );
  const weekendCount = useMemo(
    () =>
      all.filter(
        (h) =>
          h.badge === "Selling this weekend" ||
          h.markets.some((m) => m.days.includes(0) || m.days.includes(6)),
      ).length,
    [all],
  );

  const topMarkets = useMemo(() => {
    const counts = new Map<string, { slug: string; name: string; count: number }>();
    for (const h of all) {
      for (const m of h.markets) {
        const existing = counts.get(m.slug);
        if (existing) {
          existing.count += 1;
        } else {
          counts.set(m.slug, { slug: m.slug, name: m.name, count: 1 });
        }
      }
    }
    return [...counts.values()].sort(
      (a, b) => b.count - a.count || a.name.localeCompare(b.name, "en-CA"),
    );
  }, [all]);

  const filtered = useMemo(() => {
    return ordered.filter((hit) => {
      if (pricedOnly && knownPrice(hit.priceCents) == null) return false;
      if (whenFilter === "today") {
        const isToday =
          hit.openToday || hit.badge === "Open now" || hit.badge === "Later today";
        if (!isToday) return false;
      }
      if (whenFilter === "weekend") {
        const isWeekend =
          hit.badge === "Selling this weekend" ||
          hit.markets.some((m) => m.days.includes(0) || m.days.includes(6));
        if (!isWeekend) return false;
      }
      if (marketFilter && !hit.markets.some((m) => m.slug === marketFilter)) {
        return false;
      }
      return true;
    });
  }, [ordered, pricedOnly, whenFilter, marketFilter]);

  if (!all.length) return null;

  const hasActiveFilter = pricedOnly || whenFilter !== "all" || Boolean(marketFilter);

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
      {/* Interactive Search Hit Filter & Sort Bar */}
      <div className="mb-5 bg-card p-4 ring-1 ring-board">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setWhenFilter("all");
                setPricedOnly(false);
                setMarketFilter(null);
              }}
              className={cn(
                "stall-chip-sm cursor-pointer px-3 py-1.5 text-sm font-medium transition-colors",
                !hasActiveFilter
                  ? "bg-board text-chalk"
                  : "bg-secondary text-foreground hover:bg-secondary/80",
              )}
            >
              All ({all.length})
            </button>

            {todayCount > 0 ? (
              <button
                type="button"
                onClick={() => setWhenFilter(whenFilter === "today" ? "all" : "today")}
                className={cn(
                  "stall-chip-sm cursor-pointer px-3 py-1.5 text-sm font-medium transition-colors",
                  whenFilter === "today"
                    ? "bg-stamp text-chalk"
                    : "bg-secondary text-foreground hover:bg-secondary/80",
                )}
              >
                Selling today ({todayCount})
              </button>
            ) : null}

            {weekendCount > 0 ? (
              <button
                type="button"
                onClick={() => setWhenFilter(whenFilter === "weekend" ? "all" : "weekend")}
                className={cn(
                  "stall-chip-sm cursor-pointer px-3 py-1.5 text-sm font-medium transition-colors",
                  whenFilter === "weekend"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-foreground hover:bg-secondary/80",
                )}
              >
                Weekend ({weekendCount})
              </button>
            ) : null}

            {allowPrice && pricedCount > 0 ? (
              <button
                type="button"
                onClick={() => setPricedOnly((prev) => !prev)}
                className={cn(
                  "stall-chip-sm cursor-pointer px-3 py-1.5 text-sm font-medium transition-colors",
                  pricedOnly
                    ? "bg-stamp text-chalk"
                    : "bg-receipt text-foreground ring-1 ring-border hover:bg-secondary",
                )}
              >
                Has price ({pricedCount})
              </button>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <p className="type-nums text-sm text-muted-foreground">
              {hasActiveFilter
                ? `${filtered.length} of ${countLabel(all.length, "item", "items")}`
                : `${countLabel(all.length, "item", "items")}${done ? "" : " so far"}`}
            </p>
            <SortSelect value={sort} options={options} onChange={setSort} />
          </div>
        </div>

        {topMarkets.length > 1 ? (
          <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-dashed border-border pt-3">
            <span className="mr-1 text-sm font-medium text-muted-foreground">Market:</span>
            <button
              type="button"
              onClick={() => setMarketFilter(null)}
              className={cn(
                "cursor-pointer rounded px-2.5 py-1 text-sm font-medium transition-colors",
                marketFilter === null
                  ? "bg-primary text-primary-foreground"
                  : "bg-receipt text-foreground ring-1 ring-border hover:bg-secondary",
              )}
            >
              Any market
            </button>
            {topMarkets.slice(0, 5).map((m) => {
              const active = marketFilter === m.slug;
              return (
                <button
                  key={m.slug}
                  type="button"
                  onClick={() => setMarketFilter(active ? null : m.slug)}
                  className={cn(
                    "cursor-pointer rounded px-2.5 py-1 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "bg-receipt text-foreground ring-1 ring-border hover:bg-secondary",
                  )}
                >
                  <span>{m.name}</span>{" "}
                  <span
                    className={cn(
                      "type-nums",
                      active ? "text-primary-foreground/85" : "text-muted-foreground",
                    )}
                  >
                    ({m.count})
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-receipt p-6 text-center ring-1 ring-board">
          <p className="text-base font-medium text-foreground">
            No matching items for that filter.
          </p>
          <button
            type="button"
            onClick={() => {
              setWhenFilter("all");
              setPricedOnly(false);
              setMarketFilter(null);
            }}
            className="mt-3 cursor-pointer rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Show all {all.length} items
          </button>
        </div>
      ) : (
        <ProductHitList hits={filtered} highlightMarketSlug={marketFilter} />
      )}

      {page && !done ? (
        <div className="mt-6">
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              void loadMore();
            }}
            className="stall-chip inline-flex h-11 cursor-pointer items-center justify-center bg-primary px-6 text-base font-medium text-primary-foreground hover:brightness-110 disabled:opacity-60"
          >
            {busy ? "Loading more items…" : "Show more products"}
          </button>
        </div>
      ) : null}
      {error ? <p className="mt-2 text-sm text-muted-foreground">{error}</p> : null}
    </div>
  );
}
