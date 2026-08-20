import type { Market } from "@/types/database";

/** Product tags people actually shop by, in the order they tend to ask. */
export const FIND_PRODUCTS = [
  "organic",
  "bakery",
  "cheese",
  "meat",
  "flowers",
  "prepared-food",
  "produce",
] as const;

/** Weather and season, after time and place. */
export const FIND_SETUP = ["indoor", "outdoor", "year-round"] as const;

export const FIND_AREAS: Array<{ label: string; q: string; slugs: string[] }> = [
  { label: "St. Lawrence", q: "St. Lawrence", slugs: ["st-lawrence-market", "st-lawrence-farmers-market"] },
  { label: "Wychwood", q: "Wychwood", slugs: ["the-stops-farmers-market"] },
  { label: "Dufferin Grove", q: "Dufferin Grove", slugs: ["dufferin-grove-organic-farmers-market"] },
  { label: "Junction", q: "Junction", slugs: ["the-junction-farmers-market"] },
  { label: "Leslieville", q: "Leslieville", slugs: ["the-leslieville-farmers-market"] },
  { label: "East York", q: "East York", slugs: ["east-york-farmers-market"] },
  { label: "Withrow", q: "Withrow", slugs: ["withrow-park-farmers-market"] },
  { label: "Sorauren", q: "Sorauren", slugs: ["sorauren-farmers-market"] },
  { label: "Brick Works", q: "Brick Works", slugs: ["evergreen-brick-works-saturday-farmers-market"] },
  { label: "North York", q: "North York", slugs: ["north-york-farmers-market"] },
];

export function areasForMarkets(markets: Market[]) {
  const slugs = new Set(markets.map((m) => m.slug));
  return FIND_AREAS.filter((area) => area.slugs.some((slug) => slugs.has(slug)));
}

export function tagsPresent(markets: Market[], wanted: readonly string[]) {
  const have = new Set(markets.flatMap((m) => m.tags));
  return wanted.filter((tag) => have.has(tag));
}

export function tagLabel(tag: string) {
  if (tag === "year-round") return "Year-round";
  if (tag === "prepared-food") return "Prepared food";
  return tag.charAt(0).toUpperCase() + tag.slice(1);
}

/** Repeated or comma-separated `?tag=` values from a search URL. */
export function queryList(value: string | string[] | undefined): string[] {
  if (value == null || value === "") return [];
  return [
    ...new Set(
      (Array.isArray(value) ? value : [value])
        .flatMap((part) => part.split(","))
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
}

export function whenOptions(today: number) {
  const chips: Array<{
    id: string;
    label: string;
    weekday?: number;
    openNow?: boolean;
    tone?: "open";
  }> = [{ id: "open", label: "Open now", openNow: true, tone: "open" }];
  if (today < 0) return chips;

  chips.push({ id: "today", label: "Today", weekday: today });
  const tomorrow = (today + 1) % 7;
  chips.push({ id: "tomorrow", label: "Tomorrow", weekday: tomorrow });
  if (today !== 6 && tomorrow !== 6) {
    chips.push({ id: "saturday", label: "Saturday", weekday: 6 });
  }
  if (today !== 0 && tomorrow !== 0) {
    chips.push({ id: "sunday", label: "Sunday", weekday: 0 });
  }
  return chips;
}
