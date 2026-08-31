import {
  AMENITY_TAGS,
  COUNTRY_TAGS,
  PRODUCT_TAGS,
  RECORD_TAGS,
  WEEKDAYS,
} from "@/lib/constants";
import { LAUNCH_CITY, LAUNCH_TZ } from "@/lib/launch";
import { tagLabel } from "@/lib/tag-label";
import { vendorFilterTags } from "@/lib/vendor-tags";
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
  "honey",
  "vegan",
  "gluten-free",
  "flowers",
  "prepared-food",
  "crafts",
  "coffee",
  "beer",
] as const;

const FIND_PRODUCT_SET = new Set<string>(FIND_PRODUCTS);

/** Default product chips, plus any product already on from a category page. */
export function productChipRow(selected: readonly string[] = []) {
  const extras = selected.filter((tag) => PRODUCT_SET.has(tag) && !FIND_PRODUCT_SET.has(tag));
  return extras.length ? [...FIND_PRODUCTS, ...extras] : FIND_PRODUCTS;
}

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
  { label: "Leslieville", q: "Leslieville", slugs: ["the-leslieville-farmers-market", "leslieville-farmers-market-east-end-food-hub"] },
  { label: "East York", q: "East York", slugs: ["east-york-farmers-market"] },
  { label: "Withrow", q: "Withrow", slugs: ["withrow-park-farmers-market"] },
  { label: "Sorauren", q: "Sorauren", slugs: ["sorauren-farmers-market", "sorauren-farmers-market-henderson-brewery"] },
  { label: "Brick Works", q: "Brick Works", slugs: ["evergreen-brick-works-saturday-farmers-market"] },
  { label: "North York", q: "North York", slugs: ["north-york-farmers-market"] },
];

export type PlaceArea = { label: string; q: string };

export type PlaceAreas = {
  neighbourhoods: PlaceArea[];
  cities: PlaceArea[];
};

/**
 * Only places that actually hold a market, so the filter never offers a dead end.
 * Toronto neighbourhoods come from the curated list; everywhere else is its municipality.
 */
export function placeAreasForMarkets(
  markets: Array<Pick<Market, "slug" | "city">>,
): PlaceAreas {
  const slugs = new Set(markets.map((market) => market.slug));
  const neighbourhoods = FIND_AREAS.filter((area) =>
    area.slugs.some((slug) => slugs.has(slug)),
  ).map(({ label, q }) => ({ label, q }));
  const named = new Set(neighbourhoods.map((area) => area.label.toLowerCase()));
  const cities = [...new Set(markets.map((market) => market.city.trim()).filter(Boolean))]
    .filter((city) => city.toLowerCase() !== LAUNCH_CITY.toLowerCase())
    .filter((city) => !named.has(city.toLowerCase()))
    .sort((a, b) => a.localeCompare(b))
    .map((city) => ({ label: city, q: city }));
  return { neighbourhoods, cities };
}

/** Chips shown before the row is expanded, per kind of place. */
const HOME_AREA_SLOTS = 6;

/**
 * Home chip row. Keeps neighbourhoods and municipalities both visible in a short row
 * instead of listing every place in the region, with the remainder behind a toggle.
 */
export function homeAreas(markets: Array<Pick<Market, "slug" | "city">>) {
  const { neighbourhoods, cities } = placeAreasForMarkets(markets);
  const halls = new Map<string, number>();
  for (const market of markets) {
    const city = market.city.trim();
    halls.set(city, (halls.get(city) ?? 0) + 1);
  }
  const busiest = [...cities].sort(
    (a, b) =>
      (halls.get(b.label) ?? 0) - (halls.get(a.label) ?? 0) || a.label.localeCompare(b.label),
  );
  return {
    primary: [
      ...neighbourhoods.slice(0, HOME_AREA_SLOTS),
      ...busiest.slice(0, HOME_AREA_SLOTS),
    ],
    rest: [...neighbourhoods.slice(HOME_AREA_SLOTS), ...busiest.slice(HOME_AREA_SLOTS)],
  };
}

export type HomeAreas = ReturnType<typeof homeAreas>;

/** Which filter chips can actually return something. Stored tags only — guesses are not facts. */
export function tagsPresent(
  rows: Array<{ tags: string[] }>,
  wanted: readonly string[],
) {
  const have = new Set(rows.flatMap((row) => row.tags));
  return wanted.filter((tag) => have.has(tag));
}

/** Identity and access tags for the all-filters “on the record” column. */
export const FIND_RECORD = [
  ...RECORD_TAGS,
  ...AMENITY_TAGS.filter((tag) => !SETUP_SET.has(tag)),
] as const;

export { tagLabel };

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
  V extends { id: string; tags: string[]; searchTags?: string[] },
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
    nextVendors = nextVendors.filter((vendor) => {
      const hay = vendorFilterTags(vendor);
      return product.some((tag) => hay.includes(tag));
    });
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
  if (value === "near") return hasNear ? "near" : "name";
  if (value === "name" || value === "next" || value === "score") {
    return value;
  }
  return hasNear ? "near" : "name";
}

function directoryQuery(search: MarketsSearch) {
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
  return query;
}

function hrefWithQuery(path: string, query: URLSearchParams) {
  const qs = query.toString();
  return qs ? `${path}?${qs}` : path;
}

export function marketsHref(search: MarketsSearch) {
  return hrefWithQuery("/markets", directoryQuery(search));
}

export function filterMarketsByAreas(markets: Market[], areaKeys: string[]) {
  if (!areaKeys.length) return markets;
  const keys = new Set(areaKeys);
  const slugs = new Set(
    FIND_AREAS.filter((area) => keys.has(area.q)).flatMap((area) => area.slugs),
  );
  const cities = new Set(
    areaKeys.map((key) => key.trim().toLowerCase()).filter((key) => key && key !== LAUNCH_CITY.toLowerCase()),
  );
  return markets.filter(
    (market) => slugs.has(market.slug) || cities.has(market.city.trim().toLowerCase()),
  );
}

/**
 * The vendor column answers “who is at these halls”, so a place or time filter narrows it
 * along with the markets. A text query must not: someone searching a shop by name should
 * still find it when no market matched those words.
 */
export function scopeVendorsToMarkets<M extends { id: string }, V extends { id: string }>(
  markets: M[],
  vendors: V[],
  links: Array<{ market_id: string; vendor_id: string; days: number[] }>,
  search: {
    city?: string;
    province?: string;
    setup?: string;
    openNow?: boolean;
    areas?: string[];
  },
  weekdays: number[],
): V[] {
  const narrowed = Boolean(
    search.areas?.length ||
      search.city ||
      search.province ||
      search.setup ||
      search.openNow ||
      weekdays.length,
  );
  if (!narrowed) return vendors;
  const shown = new Set(markets.map((market) => market.id));
  const present = new Set(
    links
      .filter((link) => shown.has(link.market_id))
      .filter((link) => !weekdays.length || link.days.some((day) => weekdays.includes(day)))
      .map((link) => link.vendor_id),
  );
  return vendors.filter((vendor) => present.has(vendor.id));
}

/** Typed search for “Wychwood” / “Brick Works” should still find the hall. */
export function slugsForPlaceQuery(query: string) {
  const needle = foldPlaceQuery(query);
  if (needle.length < 3) return [] as string[];
  const slugs = new Set<string>();
  for (const area of FIND_AREAS) {
    const label = foldPlaceQuery(area.label);
    const key = foldPlaceQuery(area.q);
    const hit =
      needle === label ||
      needle === key ||
      label.includes(needle) ||
      key.includes(needle) ||
      needle.includes(label) ||
      needle.includes(key);
    if (hit) area.slugs.forEach((slug) => slugs.add(slug));
  }
  return [...slugs];
}

function foldPlaceQuery(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[.’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Typed search for a hall name, not a word that merely appears in an about blurb. */
export function queryNamesHall(query: string, name: string) {
  const needle = foldPlaceQuery(query);
  const hall = foldPlaceQuery(name);
  if (needle.length < 4) return false;
  return hall === needle || hall.startsWith(needle) || needle.startsWith(hall);
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
