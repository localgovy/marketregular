import {
  AMENITY_TAGS,
  COUNTRY_TAGS,
  PRODUCT_TAGS,
  RECORD_TAGS,
  WEEKDAYS,
} from "@/lib/constants";
import { LAUNCH_TZ } from "@/lib/launch";
import type { Market } from "@/types/database";

const PRODUCT_SET = new Set<string>(PRODUCT_TAGS);
const COUNTRY_SET = new Set<string>(COUNTRY_TAGS);
const VENDOR_FILTER_SET = new Set<string>([...PRODUCT_TAGS, ...COUNTRY_TAGS]);
const SETUP_SET = new Set(["indoor", "outdoor", "year-round", "seasonal"]);

/** Product tags people actually shop by, in the order they tend to ask. */
export const FIND_PRODUCTS = [
  "produce",
  "organic",
  "bakery",
  "meat",
  "cheese",
  "vegan",
  "gluten-free",
  "flowers",
  "prepared-food",
  "crafts",
  "coffee",
  "beer",
] as const;

/** Short cuisine row on Find. Everything else lives under All filters. */
export const FIND_ORIGINS = [
  "jamaican",
  "caribbean",
  "mexican",
  "italian",
  "indian",
  "chinese",
  "japanese",
] as const;

const FIND_ORIGIN_SET = new Set<string>(FIND_ORIGINS);

/** Default origin chips, plus any cuisine already on from All filters. */
export function originChipRow(selected: readonly string[] = []) {
  const extras = selected.filter((tag) => COUNTRY_SET.has(tag) && !FIND_ORIGIN_SET.has(tag));
  return extras.length ? [...FIND_ORIGINS, ...extras] : FIND_ORIGINS;
}

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

export function tagsPresent(rows: Array<{ tags: string[] }>, wanted: readonly string[]) {
  const have = new Set(rows.flatMap((row) => row.tags));
  return wanted.filter((tag) => have.has(tag));
}

/** Identity and access tags for the all-filters “on the record” column. */
export const FIND_RECORD = [
  ...RECORD_TAGS,
  ...AMENITY_TAGS.filter((tag) => !SETUP_SET.has(tag)),
] as const;

const TAG_LABELS: Record<string, string> = {
  "year-round": "Year-round",
  "prepared-food": "Prepared food",
  "card-accepted": "Takes cards",
  atm: "ATM",
  "gluten-free": "Gluten-free",
  "black-owned": "Black-owned",
  jewelry: "Jewellery",
  "sri-lankan": "Sri Lankan",
  "west-african": "West African",
  "middle-eastern": "Middle Eastern",
};

export function tagLabel(tag: string) {
  if (TAG_LABELS[tag]) return TAG_LABELS[tag];
  return tag
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function isProductTag(tag: string) {
  return PRODUCT_SET.has(tag);
}

export function isVendorFilterTag(tag: string) {
  return VENDOR_FILTER_SET.has(tag);
}

const RECORD_SET = new Set<string>(RECORD_TAGS);

export function sortTagsForDisplay(tags: string[]) {
  const rank = (tag: string) => {
    if (PRODUCT_SET.has(tag)) return 0;
    if (COUNTRY_SET.has(tag)) return 1;
    if (RECORD_SET.has(tag)) return 2;
    return 3;
  };
  return [...tags].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}

export function applyDirectoryTags<
  M extends { id: string; tags: string[] },
  V extends { id: string; tags: string[] },
>(
  markets: M[],
  vendors: V[],
  links: Array<{ market_id: string; vendor_id: string }>,
  tags: string[],
) {
  if (!tags.length) return { markets, vendors };

  const product = tags.filter((tag) => isVendorFilterTag(tag));
  const place = tags.filter((tag) => !isVendorFilterTag(tag));

  let nextMarkets = markets;
  let nextVendors = vendors;

  if (place.length) {
    nextMarkets = nextMarkets.filter((market) =>
      place.some((tag) => market.tags.includes(tag)),
    );
  }

  if (product.length) {
    nextVendors = nextVendors.filter((vendor) =>
      product.some((tag) => vendor.tags.includes(tag)),
    );
    const matchingVendorIds = new Set(nextVendors.map((vendor) => vendor.id));
    const hostIds = new Set(
      links
        .filter((link) => matchingVendorIds.has(link.vendor_id))
        .map((link) => link.market_id),
    );
    nextMarkets = nextMarkets.filter(
      (market) => hostIds.has(market.id) || product.some((tag) => market.tags.includes(tag)),
    );
  }

  const marketIds = new Set(nextMarkets.map((market) => market.id));
  const atThoseHalls = new Set(
    links.filter((link) => marketIds.has(link.market_id)).map((link) => link.vendor_id),
  );
  nextVendors = nextVendors.filter((vendor) => atThoseHalls.has(vendor.id));

  return { markets: nextMarkets, vendors: nextVendors };
}

export function weekdayInToronto(now = new Date()) {
  const name = new Intl.DateTimeFormat("en-CA", {
    weekday: "long",
    timeZone: LAUNCH_TZ,
  }).format(now);
  return WEEKDAYS.findIndex((day) => day === name);
}

export const DIRECTORY_SORTS = [
  { id: "name", label: "Name" },
  { id: "next", label: "Next open" },
  { id: "near", label: "Closest" },
  { id: "score", label: "Score" },
] as const;

export type DirectorySort = (typeof DIRECTORY_SORTS)[number]["id"];

export type MarketsSearch = {
  q?: string;
  weekdays?: number[];
  setup?: string;
  areas?: string[];
  openNow?: boolean;
  tags?: string[];
  lat?: string;
  lng?: string;
  sort?: DirectorySort;
};

export function parseDirectorySort(
  value: string | undefined,
  hasNear: boolean,
): DirectorySort {
  if (value === "name" || value === "next" || value === "near" || value === "score") {
    return value;
  }
  return hasNear ? "near" : "name";
}

export function marketsHref(search: MarketsSearch) {
  const query = new URLSearchParams();
  const q = search.q?.trim();
  if (q) query.set("q", q);
  for (const day of search.weekdays ?? []) {
    if (day >= 0 && day <= 6) query.append("weekday", String(day));
  }
  if (search.setup) query.set("setup", search.setup);
  for (const area of search.areas ?? []) {
    if (area) query.append("area", area);
  }
  if (search.openNow) query.set("openNow", "1");
  for (const tag of search.tags ?? []) query.append("tag", tag);
  if (search.lat && search.lng) {
    query.set("lat", search.lat);
    query.set("lng", search.lng);
  }
  const implied: DirectorySort = search.lat && search.lng ? "near" : "name";
  if (search.sort && search.sort !== implied) query.set("sort", search.sort);
  const qs = query.toString();
  return qs ? `/markets?${qs}` : "/markets";
}

export function filterMarketsByAreas(markets: Market[], areaKeys: string[]) {
  if (!areaKeys.length) return markets;
  const slugs = new Set(
    FIND_AREAS.filter((area) => areaKeys.includes(area.q)).flatMap((area) => area.slugs),
  );
  if (!slugs.size) return markets;
  return markets.filter((market) => slugs.has(market.slug));
}

export function marketsCrumbs(search: {
  weekdays?: number[];
  setup?: string;
  areas?: string[];
  tags?: string[];
  openNow?: boolean;
  near?: boolean;
  sort?: DirectorySort;
}) {
  const crumbs: string[] = [];
  if (search.near && (!search.sort || search.sort === "near")) crumbs.push("closest first");
  for (const day of search.weekdays ?? []) {
    const name = WEEKDAYS[day];
    if (name) crumbs.push(name);
  }
  if (search.openNow) crumbs.push("open now");
  if (search.setup) crumbs.push(tagLabel(search.setup));
  for (const area of search.areas ?? []) crumbs.push(area);
  for (const tag of search.tags ?? []) crumbs.push(tagLabel(tag));
  return crumbs;
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

export function searchWeekdays(filters: { weekday?: number; weekdays?: number[] }) {
  if (filters.weekdays?.length) return filters.weekdays;
  if (filters.weekday != null && Number.isFinite(filters.weekday)) return [filters.weekday];
  return [];
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
