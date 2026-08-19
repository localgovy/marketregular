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
  { label: "St. Lawrence", q: "St. Lawrence", slugs: ["st-lawrence-market"] },
  { label: "City Hall", q: "Nathan Phillips", slugs: ["nathan-phillips-square"] },
  { label: "Wychwood", q: "Wychwood", slugs: ["wychwood-barns"] },
  { label: "Dufferin Grove", q: "Dufferin Grove", slugs: ["dufferin-grove"] },
  { label: "Junction", q: "Junction", slugs: ["junction-farmers-market"] },
  { label: "Leslieville", q: "Leslieville", slugs: ["leslieville-farmers-market"] },
  { label: "East York", q: "East York", slugs: ["east-york-civic-centre"] },
  { label: "Withrow", q: "Withrow", slugs: ["withrow-park"] },
  { label: "Sorauren", q: "Sorauren", slugs: ["sorauren-park"] },
  { label: "Brick Works", q: "Brick Works", slugs: ["evergreen-brick-works"] },
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

export function whenLinks(today: number) {
  const chips: Array<{ href: string; label: string; tone?: "open" }> = [
    { href: "/search?openNow=1", label: "Open now", tone: "open" },
  ];
  if (today < 0) return chips;

  chips.push({ href: `/search?weekday=${today}`, label: "Today" });
  const tomorrow = (today + 1) % 7;
  chips.push({ href: `/search?weekday=${tomorrow}`, label: "Tomorrow" });
  if (today !== 6 && tomorrow !== 6) {
    chips.push({ href: "/search?weekday=6", label: "Saturday" });
  }
  if (today !== 0 && tomorrow !== 0) {
    chips.push({ href: "/search?weekday=0", label: "Sunday" });
  }
  return chips;
}
