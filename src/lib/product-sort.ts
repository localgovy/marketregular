import { LAUNCH_TZ } from "@/lib/launch";
import { zonedParts } from "@/lib/schedule";
import type { FindVendor } from "@/lib/data/product-search";
import type { ProductHit } from "@/lib/product-hits";

export const FIND_SORTS = [
  { id: "next", label: "Next open" },
  { id: "price", label: "Price" },
  { id: "name", label: "Name" },
] as const;

export const SEARCH_SORTS = [
  { id: "match", label: "Best match" },
  ...FIND_SORTS,
] as const;

export type FindSort = (typeof FIND_SORTS)[number]["id"];
export type SearchSort = (typeof SEARCH_SORTS)[number]["id"];

export function torontoWeekday(now = new Date()) {
  return zonedParts(now, LAUNCH_TZ).weekday;
}

export function knownPrice(cents: number | null | undefined) {
  return cents != null && cents > 0 ? cents : null;
}

export function lowestPrice(items: Array<{ priceCents: number | null }>) {
  let lowest: number | null = null;
  for (const item of items) {
    const price = knownPrice(item.priceCents);
    if (price == null) continue;
    if (lowest == null || price < lowest) lowest = price;
  }
  return lowest;
}

export function hasListedPrice(items: Array<{ priceCents: number | null }>) {
  return items.some((item) => knownPrice(item.priceCents) != null);
}

function byName(a: string, b: string) {
  return a.localeCompare(b, "en-CA");
}

function priceRank(cents: number | null) {
  return cents == null ? Number.POSITIVE_INFINITY : cents;
}

function sortItems<T extends { name: string; priceCents: number | null }>(items: T[], sort: FindSort | SearchSort) {
  return [...items].sort((a, b) => {
    if (sort === "price") {
      const price = priceRank(knownPrice(a.priceCents)) - priceRank(knownPrice(b.priceCents));
      if (price !== 0) return price;
    }
    return byName(a.name, b.name);
  });
}

function dayOffset(day: number, today: number) {
  return (day - today + 7) % 7;
}

export function marketWait(days: number[], today: number, openToday = false) {
  if (openToday) return 0;
  const later = days
    .filter((day) => day >= 0 && day <= 6)
    .map((day) => dayOffset(day, today))
    .filter((offset) => offset > 0);
  if (!later.length) return 8;
  return Math.min(...later);
}

function sortMarkets<T extends { name: string; days: number[] }>(markets: T[], today: number) {
  return [...markets].sort((a, b) => {
    const wait = marketWait(a.days, today) - marketWait(b.days, today);
    if (wait !== 0) return wait;
    return byName(a.name, b.name);
  });
}

export function sortFindVendors(vendors: FindVendor[], sort: FindSort, today: number) {
  return vendors
    .map((vendor) => ({
      ...vendor,
      items: sortItems(vendor.items, sort),
      markets: sortMarkets(vendor.markets, today),
    }))
    .sort((a, b) => {
      if (sort === "price") {
        const price = priceRank(lowestPrice(a.items)) - priceRank(lowestPrice(b.items));
        if (price !== 0) return price;
      } else if (sort === "next") {
        if (a.waitDays !== b.waitDays) return a.waitDays - b.waitDays;
      }
      return byName(a.name, b.name);
    });
}

export function sortProductHits(hits: ProductHit[], sort: SearchSort, today: number) {
  return hits
    .map((hit, index) => ({ hit, index }))
    .sort((a, b) => {
      if (sort === "match") return a.index - b.index;
      if (sort === "price") {
        const price =
          priceRank(knownPrice(a.hit.priceCents)) - priceRank(knownPrice(b.hit.priceCents));
        if (price !== 0) return price;
      } else if (sort === "next") {
        const wait =
          marketWait(
            a.hit.markets.flatMap((market) => market.days),
            today,
            a.hit.openToday,
          ) -
          marketWait(
            b.hit.markets.flatMap((market) => market.days),
            today,
            b.hit.openToday,
          );
        if (wait !== 0) return wait;
      }
      const name = byName(a.hit.vendorName, b.hit.vendorName);
      if (name !== 0) return name;
      return byName(a.hit.itemName, b.hit.itemName);
    })
    .map(({ hit }) => ({
      ...hit,
      markets: sortMarkets(hit.markets, today),
    }));
}

export function parseFindSort(value: string | null, allowPrice: boolean): FindSort {
  if (value === "price" && allowPrice) return "price";
  if (value === "name") return "name";
  return "next";
}

export function parseSearchSort(value: string | null, allowPrice: boolean): SearchSort {
  if (value === "next" || value === "name") return value;
  if (value === "price" && allowPrice) return "price";
  return "match";
}
