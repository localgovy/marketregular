"use client";

import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type {
  FloorMarket,
  FloorRosterEntry,
  FloorTaxonomy,
  FloorWeekGroup,
  MarketsFloorView,
} from "@/lib/markets-floor-types";
import { StallEmblem, formatCensus } from "@/app/preview/_components/markets-concept-shared";
import { AddressLink } from "@/components/address-link";
import { Hours } from "@/components/hours";
import { ListingScore } from "@/components/listing-score";
import { MarketMapLazy } from "@/components/market-map-lazy";
import {
  CaretLeftMark,
  CaretRightMark,
  CloseMark,
  CrateMark,
  PlateMark,
  RulesMark,
  TagMark,
} from "@/components/marks";
import { NowLabel } from "@/components/now-label";
import { SaveButton } from "@/components/save-button";
import { SearchField } from "@/components/search-field";
import { VerifiedName } from "@/components/verified-stamp";
import { FIND_CATEGORIES, FIND_PAGES } from "@/data/find-pages";
import { COUNTRY_TAGS, SEARCH_LABEL } from "@/lib/constants";
import { tagLabel, type MarketsSearch } from "@/lib/find-paths";
import { formatPrice } from "@/lib/format";
import { distanceMeters } from "@/lib/geo";
import { LAUNCH_CITY } from "@/lib/launch";
import type { MapMarket } from "@/lib/directory-page";
import {
  areaMatchesMarket,
  categoryIdForTag,
  emptyFloorQuery,
  floorHref,
  floorQueryFromParams,
  floorQueryFromSearch,
  weekdayLabel,
  type FloorQuery,
} from "@/lib/markets-floor-query";
import { pushAppUrl, replaceAppUrl } from "@/lib/native-history";
import {
  bestFieldRank,
  bigramCandidates,
  buildBigramIndex,
  fieldRank,
  searchBlob,
  type BigramIndex,
} from "@/lib/markets-floor-search";
import { productsBrowseHref } from "@/lib/product-browse-href";
import { cn } from "@/lib/utils";

type FacetId = "sell" | "cuisine" | "diet" | "made";
type FloorItem = {
  name: string;
  nameLower: string;
  href: string;
  priceCents: number | null;
};

type FloorStall = {
  slug: string;
  name: string;
  logoUrl: string | null;
  ratingAvg: number | null;
  reviewCount: number;
  aisleIds: string[];
  origins: string[];
  diets: string[];
  production: string[];
  tags: string[];
  categoryLabel: string;
  items: FloorItem[];
  nameLower: string;
  categoryFields: string[];
  facetFields: string[];
  itemFields: string[];
  blob: string;
  searchId: number;
};

type DirectoryIndex = {
  markets: IndexedMarket[];
  stallAt: Array<{ marketIndex: number; stallIndex: number }>;
  stallBigrams: BigramIndex;
  marketBigrams: BigramIndex;
};

type IndexedMarket = {
  market: FloorMarket;
  blob: string;
  placeBlob: string;
  nameLower: string;
  neighbourhoodLower: string;
  cityLower: string;
  stalls: FloorStall[];
};

type FloorFilters = {
  q: string;
  dayId: string | null;
  weekday: number | null;
  area: string | null;
  setup: string | null;
  category: string | null;
  cuisine: string | null;
  diet: string | null;
  made: string | null;
  categoryTags: string[];
  cuisineTags: string[];
  dietTags: string[];
  madeTags: string[];
};

type FloorRow = {
  market: FloorMarket;
  hours: string;
  open: boolean;
  stallCount: number;
  stalls: FloorStall[];
};

type SearchGuide = { term: string; slug: string; rank: number };

type SearchOffer = {
  vendorSlug: string;
  vendorName: string;
  logoUrl: string | null;
  priceCents: number | null;
  href: string;
  marketSlug: string;
  marketName: string;
  hours: string;
  open: boolean;
  reviewCount: number;
  rank: number;
};

type SearchProduct = {
  name: string;
  href: string;
  rank: number;
  offers: SearchOffer[];
};

type SearchVendor = {
  slug: string;
  name: string;
  logoUrl: string | null;
  categoryLabel: string;
  ratingAvg: number | null;
  reviewCount: number;
  item: FloorItem | null;
  marketSlug: string;
  marketName: string;
  hours: string;
  open: boolean;
  rank: number;
};

type SearchMarket = {
  slug: string;
  name: string;
  neighbourhood: string;
  logoUrl: string | null;
  ratingAvg: number | null;
  reviewCount: number;
  hours: string;
  open: boolean;
  matchingStalls: number;
  stallCount: number;
  rank: number;
};

type SearchAnswer = {
  guides: SearchGuide[];
  products: SearchProduct[];
  vendors: SearchVendor[];
  markets: SearchMarket[];
};

const FALLBACK_GUIDES: SearchGuide[] = [...FIND_PAGES]
  .sort((a, b) => b.vendors - a.vendors || a.term.localeCompare(b.term))
  .slice(0, 6)
  .map((page) => ({ term: page.term, slug: page.slug, rank: 3 }));

const FACETS: Array<{ id: FacetId; label: string }> = [
  { id: "sell", label: "What they sell" },
  { id: "cuisine", label: "Cuisine" },
  { id: "diet", label: "Diet" },
  { id: "made", label: "How it's made" },
];

const SETUPS = [
  { id: "indoor", label: "Indoor" },
  { id: "outdoor", label: "Outdoor" },
  { id: "year-round", label: "Year-round" },
  { id: "holiday", label: "Holiday market" },
] as const;

const DIET_TAGS = new Set(["vegan", "vegetarian", "gluten-free", "dairy-free", "halal", "keto"]);
const COUNTRY_SET = new Set<string>(COUNTRY_TAGS);
const CATEGORY_ORDER = FIND_CATEGORIES.map((category) => category.id);
const CATEGORY_LABEL = new Map<string, string>(
  FIND_CATEGORIES.map((category) => [category.id, category.label]),
);
const DIET_ORDER = [
  "vegan",
  "vegetarian",
  "gluten-free",
  "dairy-free",
  "halal",
  "keto",
  "organic",
  "plant-based",
  "gluten-friendly",
];
const MADE_ORDER = [
  "organic",
  "grass-fed",
  "pasture-raised",
  "free-range",
  "wild",
  "foraged",
  "small-batch",
  "handmade",
  "fair-trade",
  "zero-waste",
];
const PAGE = 8;
const SEARCH_MIN = 2;

const chipIdle =
  "stall-chip-sm cursor-pointer bg-card px-3 py-1.5 text-sm font-medium text-foreground ring-1 ring-border hover:bg-secondary";
const chipOn = "stall-chip-sm cursor-pointer bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground";

function OpenMarketPage({ slug }: { slug: string }) {
  return (
    <Link href={`/markets/${slug}`} className={cn(chipIdle, "inline-flex h-8 items-center whitespace-nowrap")}>
      Open market page
    </Link>
  );
}

function categoryLabel(id: string) {
  const known = CATEGORY_LABEL.get(id);
  if (known) return known;
  return tagLabel(id)
    .split(" ")
    .map((word, index) => {
      const lower = word.toLowerCase();
      if (index > 0 && (lower === "and" || lower === "of")) return lower;
      return index === 0 ? word : lower;
    })
    .join(" ");
}

function nextSession(
  sessions: Array<{ day: string; hours: string }>,
  today: number,
) {
  if (sessions.length === 0) return null;
  const ranked = sessions
    .map((session) => {
      const index = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].findIndex((day) =>
        session.day.startsWith(day),
      );
      const delta = index < 0 ? 7 : (index - today + 7) % 7;
      return { session, delta };
    })
    .sort((a, b) => a.delta - b.delta);
  return ranked[0]?.session ?? null;
}

function unique(values: Array<string | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function orderOf(order: readonly string[], id: string) {
  const index = order.indexOf(id);
  return index === -1 ? order.length : index;
}

function toStall(entry: FloorRosterEntry, tax: FloorTaxonomy | undefined): FloorStall {
  const aisleIds = unique(tax?.categories ?? []);
  const tagSpecialty = entry.tags.find((tag) => !COUNTRY_SET.has(tag) && !DIET_TAGS.has(tag) && tag !== "organic");
  const origins = unique([
    ...(tax?.origins ?? []),
    ...entry.tags.filter((tag) => COUNTRY_SET.has(tag)),
  ]);
  const diets = unique([...(tax?.diets ?? []), ...entry.tags.filter((tag) => DIET_TAGS.has(tag))]);
  const production = unique([
    ...(tax?.production ?? []),
    ...(entry.tags.includes("organic") ? ["organic"] : []),
  ]);
  const items: FloorItem[] = (tax?.samples ?? []).slice(0, 2).map((sample) => ({
    name: sample.name,
    nameLower: sample.name.toLowerCase(),
    href: sample.href,
    priceCents: sample.priceCents,
  }));
  const label = aisleIds[0]
    ? categoryLabel(aisleIds[0])
    : tagSpecialty
      ? tagLabel(tagSpecialty)
      : "Vendor";
  const nameLower = entry.name.toLowerCase();
  const categoryFields = [label, ...aisleIds.map((id) => categoryLabel(id))].map((value) => value.toLowerCase());
  const facetFields = [...origins, ...diets, ...production].map((tag) => tagLabel(tag).toLowerCase());
  const itemFields = items.map((item) => item.nameLower);
  return {
    slug: entry.vendorSlug,
    name: entry.name,
    logoUrl: entry.logoUrl,
    ratingAvg: entry.ratingAvg,
    reviewCount: entry.reviewCount,
    aisleIds,
    origins,
    diets,
    production,
    tags: entry.tags,
    categoryLabel: label,
    items,
    nameLower,
    categoryFields,
    facetFields,
    itemFields,
    blob: searchBlob([nameLower, ...categoryFields, ...facetFields, ...itemFields]),
    searchId: 0,
  };
}

function buildDirectory(data: MarketsFloorView): DirectoryIndex {
  const markets = buildIndex(data);
  const docs: string[][] = [];
  const stallAt: Array<{ marketIndex: number; stallIndex: number }> = [];
  markets.forEach((entry, marketIndex) => {
    entry.stalls.forEach((stall, stallIndex) => {
      stall.searchId = docs.length;
      stallAt.push({ marketIndex, stallIndex });
      docs.push([stall.nameLower, ...stall.categoryFields, ...stall.facetFields, ...stall.itemFields]);
    });
  });
  return {
    markets,
    stallAt,
    stallBigrams: buildBigramIndex(docs),
    marketBigrams: buildBigramIndex(
      markets.map((entry) => [entry.nameLower, entry.neighbourhoodLower, entry.cityLower]),
    ),
  };
}

function buildIndex(data: MarketsFloorView): IndexedMarket[] {
  const byMarket = new Map<string, FloorStall[]>();
  const seen = new Map<string, Set<string>>();
  for (const entry of data.roster) {
    const have = seen.get(entry.marketSlug) ?? new Set<string>();
    if (have.has(entry.vendorSlug)) continue;
    have.add(entry.vendorSlug);
    seen.set(entry.marketSlug, have);
    const list = byMarket.get(entry.marketSlug) ?? [];
    list.push(toStall(entry, data.taxonomyBySlug[entry.vendorSlug]));
    byMarket.set(entry.marketSlug, list);
  }
  for (const list of byMarket.values()) {
    list.sort(
      (a, b) => b.reviewCount - a.reviewCount || a.name.localeCompare(b.name),
    );
  }
  return data.enrichedMarkets.map((market) => {
    const nameLower = market.name.toLowerCase();
    const neighbourhoodLower = market.neighbourhood.toLowerCase();
    const cityLower = market.city.toLowerCase();
    return {
      market,
      nameLower,
      neighbourhoodLower,
      cityLower,
      placeBlob: searchBlob([nameLower, neighbourhoodLower, cityLower]),
      blob: [nameLower, neighbourhoodLower, cityLower, market.address, ...market.tags].join(" ").toLowerCase(),
      stalls: byMarket.get(market.slug) ?? [],
    };
  });
}

function hasSetup(market: FloorMarket, setup: string) {
  const tags = market.tags.map((tag) => tag.toLowerCase());
  if (tags.includes(setup)) return true;
  if (setup === "indoor" && market.indoor_outdoor === "Indoor") return true;
  if (setup === "outdoor" && market.indoor_outdoor === "Outdoor") return true;
  return false;
}

const CITY_AREAS: Array<{ label: string; cities: ReadonlySet<string> }> = [
  { label: "Mississauga and Brampton", cities: new Set(["mississauga", "brampton"]) },
  { label: "Hamilton", cities: new Set(["hamilton", "dundas", "ancaster", "stoney creek", "waterdown"]) },
  {
    label: "Durham",
    cities: new Set(["oshawa", "whitby", "ajax", "pickering", "clarington", "uxbridge", "brock", "newcastle", "port perry"]),
  },
  {
    label: "York Region",
    cities: new Set([
      "markham",
      "vaughan",
      "richmond hill",
      "aurora",
      "newmarket",
      "king",
      "east gwillimbury",
      "georgina",
      "whitchurch-stouffville",
      "stouffville",
    ]),
  },
  { label: "Halton", cities: new Set(["oakville", "burlington", "milton", "halton hills", "georgetown", "acton"]) },
  { label: "Waterloo Region", cities: new Set(["kitchener", "waterloo", "cambridge", "woolwich"]) },
  {
    label: "Niagara",
    cities: new Set([
      "st. catharines",
      "welland",
      "fort erie",
      "niagara falls",
      "niagara-on-the-lake",
      "grimsby",
      "lincoln",
    ]),
  },
];

const MIN_PLACE_MARKETS = 4;

function torontoBand(lat: number, lng: number) {
  if (lng <= -79.47) return "Etobicoke";
  if (lng >= -79.3 || lat >= 43.79) return "Scarborough";
  if (lat >= 43.73) return "North York";
  if (lat < 43.672 && lng > -79.43 && lng < -79.35) return "Downtown";
  if (lng >= -79.365) return "East end";
  if (lng <= -79.41) return "West end";
  return "Midtown";
}

/** A place chip is a region with several markets, not a single hall. */
function areaForMarket(market: FloorMarket) {
  const city = market.city.trim().toLowerCase();
  for (const area of CITY_AREAS) {
    if (area.cities.has(city)) return area.label;
  }
  if (city === "toronto" && market.lat != null && market.lng != null) {
    const band = torontoBand(market.lat, market.lng);
    if (band === "Midtown" || band === "North York") return "Midtown and North York";
    return band;
  }
  return null;
}

function marketInPlace(market: FloorMarket, area: string) {
  return areaMatchesMarket(area, {
    slug: market.slug,
    city: market.city,
    neighbourhood: market.neighbourhood,
    region: areaForMarket(market),
  });
}

function tokenHits(stall: FloorStall, id: string, kind: "sell" | "cuisine" | "diet" | "made") {
  if (kind === "sell") {
    if (stall.aisleIds.includes(id) || stall.tags.includes(id)) return true;
    const mapped = categoryIdForTag(id);
    return Boolean(mapped && mapped !== id && (stall.aisleIds.includes(mapped) || stall.tags.includes(mapped)));
  }
  if (kind === "cuisine") return stall.origins.includes(id) || stall.tags.includes(id);
  if (kind === "diet") return stall.diets.includes(id) || stall.tags.includes(id);
  return stall.production.includes(id) || stall.tags.includes(id);
}

function matchesTokens(
  stall: FloorStall,
  primary: string | null,
  tags: string[],
  kind: "sell" | "cuisine" | "diet" | "made",
) {
  const wanted = new Set(tags);
  if (primary) wanted.add(primary);
  if (wanted.size === 0) return true;
  for (const id of wanted) {
    if (tokenHits(stall, id, kind)) return true;
  }
  return false;
}

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function marketOnWeekday(market: FloorMarket, weekday: number) {
  const short = WEEKDAY_SHORT[weekday];
  if (!short) return false;
  const named = (day: string) => day.startsWith(short) || day.toLowerCase().startsWith(weekdayLabel(weekday).toLowerCase());
  return market.sessions.some((session) => named(session.day)) || market.dayNames.some(named);
}

function daySlugsFor(filters: FloorFilters, data: MarketsFloorView) {
  if (filters.dayId) {
    const group = data.fullWeek.find((item) => item.id === filters.dayId);
    return new Set(group?.slots.map((slot) => slot.slug) ?? []);
  }
  if (filters.weekday == null) return null;
  const grouped = data.fullWeek.find((item) => item.id === `day-${filters.weekday}`);
  if (grouped) return new Set(grouped.slots.map((slot) => slot.slug));
  if (filters.weekday === data.todayWeekday) {
    const slugs = new Set<string>();
    for (const group of data.fullWeek) {
      if (group.id !== "open" && group.id !== "later" && group.id !== "earlier") continue;
      for (const slot of group.slots) slugs.add(slot.slug);
    }
    if (slugs.size > 0) return slugs;
  }
  return null;
}

function stallMatches(
  stall: FloorStall,
  filters: FloorFilters,
) {
  if (!matchesTokens(stall, filters.category, filters.categoryTags, "sell")) return false;
  if (!matchesTokens(stall, filters.cuisine, filters.cuisineTags, "cuisine")) return false;
  if (!matchesTokens(stall, filters.diet, filters.dietTags, "diet")) return false;
  if (!matchesTokens(stall, filters.made, filters.madeTags, "made")) return false;
  return true;
}

function visibleStalls(
  entry: IndexedMarket,
  filters: FloorFilters,
  mode: "browse" | "strict" = "browse",
  proven: Set<number> | null = null,
) {
  const needle = filters.q.trim().toLowerCase();
  const marketHit = mode === "browse" && (!needle || entry.blob.includes(needle));
  return entry.stalls.filter((stall) => {
    if (!stallMatches(stall, filters)) return false;
    if (!needle || marketHit) return true;
    if (proven) return proven.has(stall.searchId);
    return stallMatchesQuery(stall, needle);
  });
}

function stallMatchesQuery(stall: FloorStall, needle: string) {
  return stall.blob.includes(needle);
}

function marketMatches(
  entry: IndexedMarket,
  filters: FloorFilters,
  daySlugs: Set<string> | null,
  mode: "browse" | "strict" = "browse",
) {
  if (!entryInContext(entry, daySlugs, filters)) return false;
  const needle = filters.q.trim();
  const narrowed = Boolean(needle || specialtyOn(filters));
  if (!narrowed) return true;
  return visibleStalls(entry, filters, mode).length > 0;
}

function specialtyOn(filters: FloorFilters) {
  return Boolean(
    filters.category ||
      filters.cuisine ||
      filters.diet ||
      filters.made ||
      filters.categoryTags.length ||
      filters.cuisineTags.length ||
      filters.dietTags.length ||
      filters.madeTags.length,
  );
}

function entryInContext(
  entry: IndexedMarket,
  daySlugs: Set<string> | null,
  filters: Pick<FloorFilters, "area" | "setup" | "weekday" | "dayId">,
) {
  if (daySlugs) {
    if (!daySlugs.has(entry.market.slug)) return false;
  } else if (filters.weekday != null && !marketOnWeekday(entry.market, filters.weekday)) {
    return false;
  }
  if (filters.area && !marketInPlace(entry.market, filters.area)) return false;
  if (filters.setup && !hasSetup(entry.market, filters.setup)) return false;
  return true;
}

function focusedLabel(stall: FloorStall, focus: string | null) {
  if (focus && stall.aisleIds.includes(focus)) return categoryLabel(focus);
  return stall.categoryLabel;
}

function focusedItems(stall: FloorStall, focus: string | null) {
  if (!focus) return stall.items;
  const hrefs = new Set(
    FIND_PAGES.filter((page) => page.category === focus).map((page) => `/find/${page.slug}`),
  );
  return stall.items.filter(
    (item) => hrefs.has(item.href.split("?")[0] ?? item.href) || item.href.includes(`aisle=${focus}`),
  );
}

function vendorRank(stall: FloorStall, needle: string) {
  const name = fieldRank(stall.nameLower, needle);
  if (name != null) return name;
  const category = bestFieldRank(stall.categoryFields, needle);
  if (category != null) return 3 + category;
  const facet = bestFieldRank(stall.facetFields, needle);
  if (facet != null) return 6 + facet;
  const item = bestFieldRank(stall.itemFields, needle);
  if (item != null) return 9 + item;
  return null;
}

function marketTextRank(entry: IndexedMarket, needle: string) {
  const name = fieldRank(entry.nameLower, needle);
  if (name != null) return name;
  const place = fieldRank(entry.neighbourhoodLower, needle);
  if (place != null) return 3 + place;
  const city = fieldRank(entry.cityLower, needle);
  if (city != null) return 6 + city;
  return null;
}

const GUIDE_TERMS = FIND_PAGES.map((page) => ({
  term: page.term,
  slug: page.slug,
  lower: page.term.toLowerCase(),
}));
const guideBigrams = buildBigramIndex(GUIDE_TERMS.map((page) => [page.lower]));

function matchingGuides(needle: string) {
  const guides: SearchGuide[] = [];
  const ids = bigramCandidates(guideBigrams, needle);
  if (!ids) return guides;
  for (const id of ids) {
    const page = GUIDE_TERMS[id];
    if (!page) continue;
    const rank = fieldRank(page.lower, needle);
    if (rank == null) continue;
    guides.push({ term: page.term, slug: page.slug, rank });
  }
  guides.sort(
    (a, b) => a.rank - b.rank || a.term.length - b.term.length || a.term.localeCompare(b.term),
  );
  return guides;
}

function marketWhen(
  market: FloorMarket,
  slot: { hours: string; open: boolean } | undefined,
  today: number,
) {
  const soonest = nextSession(market.sessions, today);
  const hours = slot
    ? slot.hours
    : soonest
      ? `${soonest.day.slice(0, 3)} ${soonest.hours}`
      : market.hours || market.nextOpen;
  return { hours, open: slot ? slot.open : market.open };
}

function proveStalls(directory: DirectoryIndex, needle: string) {
  const ids = bigramCandidates(directory.stallBigrams, needle);
  const proven = new Set<number>();
  if (!ids) return proven;
  for (const id of ids) {
    const at = directory.stallAt[id];
    if (!at) continue;
    const stall = directory.markets[at.marketIndex]?.stalls[at.stallIndex];
    if (stall && vendorRank(stall, needle) != null) proven.add(stall.searchId);
  }
  return proven;
}

function buildSearchAnswer(
  directory: DirectoryIndex,
  filters: FloorFilters,
  daySlugs: Set<string> | null,
  slotBySlug: Map<string, { hours: string; open: boolean }> | null,
  data: MarketsFloorView,
  proven: Set<number>,
): SearchAnswer {
  const index = directory.markets;
  const needle = filters.q.trim().toLowerCase();
  if (needle.length < SEARCH_MIN) {
    return { guides: [], products: [], vendors: [], markets: [] };
  }
  const guides = matchingGuides(needle);
  const productOffers = new Map<string, SearchOffer & { productName: string }>();
  const vendors = new Map<string, SearchVendor>();
  const matchingStalls = new Map<number, number>();
  const whenByMarket = new Map<number, { hours: string; open: boolean }>();

  function whenFor(marketIndex: number) {
    const cached = whenByMarket.get(marketIndex);
    if (cached) return cached;
    const entry = index[marketIndex]!;
    const when = marketWhen(entry.market, slotBySlug?.get(entry.market.slug), data.todayWeekday);
    whenByMarket.set(marketIndex, when);
    return when;
  }

  for (const searchId of proven) {
    const at = directory.stallAt[searchId];
    if (!at) continue;
    const entry = index[at.marketIndex];
    const stall = entry?.stalls[at.stallIndex];
    if (!entry || !stall) continue;
    if (!entryInContext(entry, daySlugs, filters) || !stallMatches(stall, filters)) continue;
    const rank = vendorRank(stall, needle);
    if (rank == null) continue;
    matchingStalls.set(at.marketIndex, (matchingStalls.get(at.marketIndex) ?? 0) + 1);
    const when = whenFor(at.marketIndex);
    const item = stall.items.find((entryItem) => entryItem.nameLower.includes(needle)) ?? null;
    const existingVendor = vendors.get(stall.slug);
    const vendor: SearchVendor = {
      slug: stall.slug,
      name: stall.name,
      logoUrl: stall.logoUrl,
      categoryLabel: stall.categoryLabel,
      ratingAvg: stall.ratingAvg,
      reviewCount: stall.reviewCount,
      item,
      marketSlug: entry.market.slug,
      marketName: entry.market.name,
      hours: when.hours,
      open: when.open,
      rank,
    };
    if (
      !existingVendor ||
      vendor.rank < existingVendor.rank ||
      (vendor.rank === existingVendor.rank && vendor.open && !existingVendor.open)
    ) {
      vendors.set(stall.slug, vendor);
    }
    if (item == null) continue;
    for (let itemIndex = 0; itemIndex < stall.items.length; itemIndex += 1) {
      const product = stall.items[itemIndex]!;
      const productRank = fieldRank(product.nameLower, needle);
      if (productRank == null) continue;
      const key = `${product.nameLower}|${stall.slug}`;
      const offer: SearchOffer & { productName: string } = {
        productName: product.name,
        vendorSlug: stall.slug,
        vendorName: stall.name,
        logoUrl: stall.logoUrl,
        priceCents: product.priceCents,
        href: product.href,
        marketSlug: entry.market.slug,
        marketName: entry.market.name,
        hours: when.hours,
        open: when.open,
        reviewCount: stall.reviewCount,
        rank: productRank,
      };
      const existingOffer = productOffers.get(key);
      if (
        !existingOffer ||
        offer.rank < existingOffer.rank ||
        (offer.rank === existingOffer.rank && offer.open && !existingOffer.open)
      ) {
        productOffers.set(key, offer);
      }
    }
  }

  const markets: SearchMarket[] = [];
  const marketIds = bigramCandidates(directory.marketBigrams, needle) ?? new Uint32Array();
  for (const marketIndex of marketIds) {
    const entry = index[marketIndex];
    if (!entry || !entryInContext(entry, daySlugs, filters)) continue;
    const marketRank = marketTextRank(entry, needle);
    if (marketRank == null) continue;
    const when = whenFor(marketIndex);
    markets.push({
      slug: entry.market.slug,
      name: entry.market.name,
      neighbourhood: entry.market.neighbourhood,
      logoUrl: entry.market.logo_url,
      ratingAvg: entry.market.rating_avg,
      reviewCount: entry.market.review_count,
      hours: when.hours,
      open: when.open,
      matchingStalls: matchingStalls.get(marketIndex) ?? 0,
      stallCount: entry.market.vendorCount || entry.stalls.length,
      rank: marketRank,
    });
  }

  const grouped = new Map<string, SearchProduct>();
  for (const offer of productOffers.values()) {
    const key = offer.productName.toLowerCase();
    const group = grouped.get(key) ?? {
      name: offer.productName,
      href: offer.href,
      rank: offer.rank,
      offers: [],
    };
    if (offer.rank < group.rank) {
      group.rank = offer.rank;
      group.href = offer.href;
      group.name = offer.productName;
    }
    group.offers.push(offer);
    grouped.set(key, group);
  }
  const products = [...grouped.values()];
  for (const product of products) {
    product.offers.sort(
      (a, b) =>
        a.rank - b.rank ||
        Number(b.open) - Number(a.open) ||
        b.reviewCount - a.reviewCount ||
        a.vendorName.localeCompare(b.vendorName),
    );
  }
  products.sort(
    (a, b) => a.rank - b.rank || b.offers.length - a.offers.length || a.name.localeCompare(b.name),
  );
  const vendorList = [...vendors.values()].sort(
    (a, b) =>
      a.rank - b.rank ||
      Number(b.open) - Number(a.open) ||
      b.reviewCount - a.reviewCount ||
      a.name.localeCompare(b.name),
  );
  markets.sort(
    (a, b) =>
      a.rank - b.rank ||
      b.matchingStalls - a.matchingStalls ||
      Number(b.open) - Number(a.open) ||
      a.name.localeCompare(b.name),
  );
  return { guides, products, vendors: vendorList, markets };
}

function classifierGuide(prefix: "origin" | "diet" | "production", value: string) {
  const slug = `${prefix}.${value}`;
  return FIND_PAGES.find((page) => page.matchClassifiers?.includes(slug)) ?? null;
}

function Chip({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button type="button" aria-pressed={pressed} onClick={onClick} className={pressed ? chipOn : chipIdle}>
      {children}
    </button>
  );
}

function Count({ value, active }: { value: number; active: boolean }) {
  return (
    <span className={cn("type-nums", active ? "text-primary-foreground/80" : "text-muted-foreground")}>
      {value}
    </span>
  );
}

function revealMarketsFloor() {
  document.querySelector("[data-mr-search]")?.removeAttribute("data-mr-search");
}

/** Follows a Next navigation to another /markets query. The floor itself does not read the URL, so the cached page stays one document. */
function MarketsQuerySync({
  week,
  onSearch,
}: {
  week: readonly FloorWeekGroup[];
  onSearch: (search: string) => void;
}) {
  const params = useSearchParams();
  const search = params.toString();
  const onSearchRef = useRef(onSearch);
  onSearchRef.current = onSearch;
  useLayoutEffect(() => {
    // `search` only marks that the router moved. Typing updates the address bar
    // without the router, so a stale router string must not replace it.
    void search;
    onSearchRef.current(window.location.search);
  }, [search, week]);
  return null;
}

export function MarketsFloor({
  data,
  initial,
  preview = false,
  syncUrl = false,
}: {
  data: MarketsFloorView;
  initial?: MarketsSearch & { day?: string };
  preview?: boolean;
  syncUrl?: boolean;
}) {
  const [query, setQuery] = useState<FloorQuery>(() =>
    initial ? floorQueryFromSearch(initial, data.fullWeek) : emptyFloorQuery(),
  );
  const queryRef = useRef(query);
  queryRef.current = query;
  const {
    q,
    dayId,
    weekday,
    area,
    setup,
    facet,
    category,
    cuisine,
    diet,
    made,
    categoryTags,
    cuisineTags,
    dietTags,
    madeTags,
    near,
  } = query;
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [pin, setPin] = useState<{ slug: string; scope: "match" | "all" } | null>(null);
  const [morePlaces, setMorePlaces] = useState(false);

  function commit(patch: Partial<FloorQuery>, mode: "push" | "replace" | "silent" = "push") {
    const next = { ...queryRef.current, ...patch };
    queryRef.current = next;
    setQuery(next);
    if (mode === "silent" || !syncUrl || typeof window === "undefined") return;
    const href = floorHref(next);
    const current = `${window.location.pathname}${window.location.search}`;
    if (href === current) return;
    if (mode === "replace") replaceAppUrl(href);
    else pushAppUrl(href);
  }

  function applyExternalSearch(search: string) {
    const next = floorQueryFromParams(new URLSearchParams(search), data.fullWeek);
    revealMarketsFloor();
    if (floorHref(next) === floorHref(queryRef.current)) return;
    queryRef.current = next;
    setQuery(next);
    setPin(null);
  }
  const applyExternalSearchRef = useRef(applyExternalSearch);
  applyExternalSearchRef.current = applyExternalSearch;

  useLayoutEffect(() => {
    if (!syncUrl) return;
    applyExternalSearchRef.current(window.location.search);
  }, [data.fullWeek, syncUrl]);

  useEffect(() => {
    const id = window.location.hash.replace("#", "");
    if (id !== "directory-vendors" && id !== "directory-markets") return;
    document.getElementById(id)?.scrollIntoView();
  }, []);

  useEffect(() => {
    if (!syncUrl) return;
    function onMarketsLink(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname !== "/markets") return;
      event.preventDefault();
      event.stopPropagation();
      applyExternalSearchRef.current(url.searchParams.toString());
      const next = `${url.pathname}${url.search}${url.hash}`;
      const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (next !== current) pushAppUrl(next);
      const id = url.hash.replace("#", "");
      if (id === "directory-vendors" || id === "directory-markets") {
        document.getElementById(id)?.scrollIntoView();
      } else {
        window.scrollTo(0, 0);
      }
    }
    window.addEventListener("click", onMarketsLink, true);
    return () => window.removeEventListener("click", onMarketsLink, true);
  }, [syncUrl]);

  useEffect(() => {
    if (!syncUrl) return;
    function onPop(event: PopStateEvent) {
      const url = new URL(window.location.href);
      if (url.pathname !== "/markets") return;
      const nextOwned = !event.state || typeof event.state !== "object" || !("__NA" in event.state);
      if (nextOwned) event.stopImmediatePropagation();
      applyExternalSearchRef.current(url.searchParams.toString());
    }
    window.addEventListener("popstate", onPop, true);
    return () => window.removeEventListener("popstate", onPop, true);
  }, [syncUrl]);

  const directory = useMemo(() => buildDirectory(data), [data]);
  const index = directory.markets;
  const provenStallIds = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (needle.length < SEARCH_MIN) return null;
    return proveStalls(directory, needle);
  }, [directory, q]);
  const filters: FloorFilters = {
    q,
    dayId,
    weekday,
    area,
    setup,
    category,
    cuisine,
    diet,
    made,
    categoryTags,
    cuisineTags,
    dietTags,
    madeTags,
  };
  const dayGroup = dayId ? (data.fullWeek.find((group) => group.id === dayId) ?? null) : null;
  const daySlugs = daySlugsFor(filters, data);
  const slotBySlug = dayGroup
    ? new Map(dayGroup.slots.map((slot) => [slot.slug, slot]))
    : null;

  const directoryFilters: FloorFilters =
    pin?.scope === "all" ? { ...filters, q: "" } : filters;
  const stallMode = pin?.scope === "match" ? "strict" : "browse";
  const searching = q.trim().length >= SEARCH_MIN && pin == null;

  const rows = useMemo(() => {
    if (q.trim().length >= SEARCH_MIN && pin == null) return [];
    let matched = index.filter((entry) =>
      marketMatches(entry, directoryFilters, daySlugs, stallMode),
    );
    if (pin && !matched.some((entry) => entry.market.slug === pin.slug)) {
      const pinned = index.find((entry) => entry.market.slug === pin.slug);
      if (pinned && entryInContext(pinned, daySlugs, directoryFilters)) matched = [pinned, ...matched];
    }
    const built: FloorRow[] = matched.map((entry) => {
      const stalls = visibleStalls(entry, directoryFilters, stallMode);
      const when = marketWhen(entry.market, slotBySlug?.get(entry.market.slug), data.todayWeekday);
      const narrowed = Boolean(directoryFilters.q.trim() || specialtyOn(directoryFilters));
      return {
        market: entry.market,
        hours: when.hours,
        open: when.open,
        stallCount: narrowed ? stalls.length : entry.market.vendorCount || stalls.length,
        stalls,
      };
    });
    const slotOrder = slotBySlug
      ? new Map([...slotBySlug.keys()].map((slug, position) => [slug, position]))
      : null;
    built.sort((a, b) => {
      if (pin && a.market.slug !== b.market.slug) {
        if (a.market.slug === pin.slug) return -1;
        if (b.market.slug === pin.slug) return 1;
      }
      if (near) {
        const from = (market: FloorMarket) =>
          market.lat == null || market.lng == null
            ? Number.POSITIVE_INFINITY
            : distanceMeters(near, { lat: market.lat, lng: market.lng });
        return from(a.market) - from(b.market) || a.market.name.localeCompare(b.market.name);
      }
      if ((a.stallCount > 0) !== (b.stallCount > 0)) {
        return a.stallCount > 0 ? -1 : 1;
      }
      if (slotOrder) {
        return (
          (slotOrder.get(a.market.slug) ?? 999) - (slotOrder.get(b.market.slug) ?? 999) ||
          a.market.name.localeCompare(b.market.name)
        );
      }
      return (
        Number(b.open) - Number(a.open) ||
        (a.market.waitMinutes ?? Number.POSITIVE_INFINITY) -
          (b.market.waitMinutes ?? Number.POSITIVE_INFINITY) ||
        b.market.review_count - a.market.review_count ||
        a.market.name.localeCompare(b.market.name)
      );
    });
    return built;
    // Slot map identity follows dayId. Filters are listed so the memo stays honest.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, q, dayId, weekday, area, setup, category, cuisine, diet, made, categoryTags, cuisineTags, dietTags, madeTags, near, data, pin]);

  const answer = useMemo(
    () => buildSearchAnswer(directory, filters, daySlugs, slotBySlug, data, provenStallIds ?? new Set()),
    // The answer follows the typed query plus the day, place, and setup already in filters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [directory, q, dayId, weekday, area, setup, category, cuisine, diet, made, categoryTags, cuisineTags, dietTags, madeTags, data, provenStallIds],
  );

  const selected =
    rows.find((row) => row.market.slug === (pin?.slug ?? selectedSlug)) ?? rows[0] ?? null;
  const queryOn = q.trim().length >= SEARCH_MIN;
  const landed = queryOn && pin != null;

  const placeChoices = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of index) {
      const area = areaForMarket(entry.market);
      if (!area) continue;
      counts.set(area, (counts.get(area) ?? 0) + 1);
    }
    return [...counts.entries()]
      .filter(([, count]) => count >= MIN_PLACE_MARKETS)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([label, count]) => ({ label, count }));
  }, [index]);

  const chipCounts = useMemo(() => {
    const setups = new Map<string, number>();
    const areas = new Map<string, number>();
    for (const option of SETUPS) setups.set(option.id, 0);
    const openFilters: FloorFilters = { ...filters, area: null, setup: null };
    const slugs = daySlugsFor(openFilters, data);
    for (const entry of index) {
      if (!entryInContext(entry, slugs, openFilters)) continue;
      if ((filters.q.trim() || specialtyOn(filters)) && visibleStalls(entry, openFilters, "browse", provenStallIds).length === 0) {
        continue;
      }
      if (!area || marketInPlace(entry.market, area)) {
        for (const option of SETUPS) {
          if (hasSetup(entry.market, option.id)) setups.set(option.id, (setups.get(option.id) ?? 0) + 1);
        }
      }
      const region = areaForMarket(entry.market);
      if (region && (!setup || hasSetup(entry.market, setup))) {
        areas.set(region, (areas.get(region) ?? 0) + 1);
      }
    }
    return { setups, areas };
  }, [index, q, dayId, weekday, area, setup, category, cuisine, diet, made, categoryTags, cuisineTags, dietTags, madeTags, data, provenStallIds]);

  function optionCount(next: Partial<FloorFilters>) {
    if (next.setup) return chipCounts.setups.get(next.setup) ?? 0;
    if (next.area) return chipCounts.areas.get(next.area) ?? 0;
    return 0;
  }

  const facetOptions = useMemo(() => {
    if (q.trim().length >= SEARCH_MIN) {
      return { sell: [], cuisine: [], diet: [], made: [] };
    }
    const activeDaySlugs = daySlugsFor(filters, data);

    function tally(kind: FacetId) {
      const counts = new Map<string, number>();
      const narrowed: FloorFilters = {
        ...filters,
        category: kind === "sell" ? null : category,
        cuisine: kind === "cuisine" ? null : cuisine,
        diet: kind === "diet" ? null : diet,
        made: kind === "made" ? null : made,
        categoryTags: kind === "sell" ? [] : categoryTags,
        cuisineTags: kind === "cuisine" ? [] : cuisineTags,
        dietTags: kind === "diet" ? [] : dietTags,
        madeTags: kind === "made" ? [] : madeTags,
      };
      for (const entry of index) {
        if (activeDaySlugs) {
          if (!activeDaySlugs.has(entry.market.slug)) continue;
        } else if (weekday != null && !marketOnWeekday(entry.market, weekday)) {
          continue;
        }
        if (area && !marketInPlace(entry.market, area)) continue;
        if (setup && !hasSetup(entry.market, setup)) continue;
        const ids = new Set<string>();
        for (const stall of visibleStalls(entry, narrowed)) {
          const values =
            kind === "sell"
              ? stall.aisleIds
              : kind === "cuisine"
                ? stall.origins
                : kind === "diet"
                  ? stall.diets
                  : stall.production;
          for (const id of values) ids.add(id);
        }
        for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
      }
      return counts;
    }

    function optionsFor(
      counts: Map<string, number>,
      active: string | null,
      order: readonly string[],
      labelFor: (id: string) => string,
    ) {
      return [...counts.keys()]
        .map((id) => ({ id, label: labelFor(id), count: counts.get(id) ?? 0 }))
        .filter((option) => option.count > 0 || option.id === active)
        .sort(
          (a, b) => orderOf(order, a.id) - orderOf(order, b.id) || a.label.localeCompare(b.label),
        );
    }

    return {
      sell: optionsFor(tally("sell"), category, CATEGORY_ORDER, categoryLabel),
      cuisine: optionsFor(tally("cuisine"), cuisine, COUNTRY_TAGS, tagLabel),
      diet: optionsFor(tally("diet"), diet, DIET_ORDER, tagLabel),
      made: optionsFor(tally("made"), made, MADE_ORDER, tagLabel),
    };
  }, [index, q, dayId, weekday, area, setup, category, cuisine, diet, made, categoryTags, cuisineTags, dietTags, madeTags, data]);

  const activeOptions =
    facet === "sell"
      ? facetOptions.sell
      : facet === "cuisine"
        ? facetOptions.cuisine
        : facet === "diet"
          ? facetOptions.diet
          : facetOptions.made;
  const activeValue =
    facet === "sell" ? category : facet === "cuisine" ? cuisine : facet === "diet" ? diet : made;

  function pickFacetValue(id: string) {
    const next = activeValue === id ? null : id;
    if (facet === "sell") commit({ category: next, categoryTags: next ? [next] : [] });
    else if (facet === "cuisine") commit({ cuisine: next, cuisineTags: next ? [next] : [] });
    else if (facet === "diet") commit({ diet: next, dietTags: next ? [next] : [] });
    else commit({ made: next, madeTags: next ? [next] : [] });
  }

  function step(delta: number) {
    if (!selected || rows.length < 2) return;
    const indexOf = rows.findIndex((row) => row.market.slug === selected.market.slug);
    const next = rows[(indexOf + delta + rows.length) % rows.length];
    if (next) setSelectedSlug(next.market.slug);
  }

  const stallSlugs = new Set<string>();
  const placeNames = new Set<string>();
  for (const row of rows) {
    placeNames.add(row.market.neighbourhood);
    const source = q.trim() || category || cuisine || diet || made ? row.stalls : row.stalls;
    for (const stall of source) stallSlugs.add(stall.slug);
  }

  const mapMarkets: MapMarket[] = rows.flatMap((row) => {
    if (row.market.lat == null || row.market.lng == null) return [];
    return [
      {
        id: row.market.id,
        name: row.market.name,
        slug: row.market.slug,
        lat: row.market.lat,
        lng: row.market.lng,
        city: row.market.city,
        address: row.market.address,
      },
    ];
  });

  const dayStamp = dayGroup?.label ?? (dayId === "open" ? "Open now" : weekday != null ? weekdayLabel(weekday) : null);
  const stamps = [
    dayStamp ? { key: "day", label: dayStamp, clear: () => commit({ dayId: null, weekday: null }) } : null,
    area ? { key: "area", label: area, clear: () => commit({ area: null }) } : null,
    setup
      ? {
          key: "setup",
          label: SETUPS.find((option) => option.id === setup)?.label ?? tagLabel(setup),
          clear: () => commit({ setup: null }),
        }
      : null,
    category || categoryTags.length
      ? {
          key: "category",
          label: category ? categoryLabel(category) : tagLabel(categoryTags[0] ?? ""),
          clear: () => commit({ category: null, categoryTags: [] }),
        }
      : null,
    ...categoryTags
      .filter((tag) => tag !== category && categoryIdForTag(tag) !== category)
      .map((tag) => ({
        key: `category-${tag}`,
        label: tagLabel(tag),
        clear: () => {
          const categoryTagsNext = categoryTags.filter((item) => item !== tag);
          commit({
            categoryTags: categoryTagsNext,
            category: categoryTagsNext.map(categoryIdForTag).find((id): id is string => Boolean(id)) ?? null,
          });
        },
      })),
    cuisine || cuisineTags.length
      ? {
          key: "cuisine",
          label: tagLabel(cuisine ?? cuisineTags[0] ?? ""),
          clear: () => commit({ cuisine: null, cuisineTags: [] }),
        }
      : null,
    diet || dietTags.length
      ? {
          key: "diet",
          label: tagLabel(diet ?? dietTags[0] ?? ""),
          clear: () => commit({ diet: null, dietTags: [] }),
        }
      : null,
    made || madeTags.length
      ? {
          key: "made",
          label: tagLabel(made ?? madeTags[0] ?? ""),
          clear: () => commit({ made: null, madeTags: [] }),
        }
      : null,
    near ? { key: "near", label: "Near you", clear: () => commit({ near: null }) } : null,
    q.trim() ? { key: "q", label: q.trim(), clear: () => commit({ q: "" }, "replace") } : null,
  ].filter((stamp): stamp is { key: string; label: string; clear: () => void } => Boolean(stamp));

  const cuisinePage = cuisine ? classifierGuide("origin", cuisine) : null;
  const dietPage = diet ? classifierGuide("diet", diet) : null;
  const madePage = made ? classifierGuide("production", made) : null;
  const shownPlaces = morePlaces ? placeChoices : placeChoices.slice(0, PAGE);
  const guidePages = category
    ? FIND_PAGES.filter((page) => page.category === category)
        .sort((a, b) => b.vendors - a.vendors)
        .slice(0, 6)
    : [];

  function onQueryChange(value: string) {
    commit({ q: value.slice(0, 80) }, "replace");
    setPin(null);
  }

  function openMarket(slug: string, scope: "match" | "all") {
    setSelectedSlug(slug);
    setPin({ slug, scope });
  }

  function clearAll() {
    setPin(null);
    commit(emptyFloorQuery());
  }

  return (
    <div data-markets-floor="" className="bg-background text-foreground">
      {syncUrl ? (
        <Suspense fallback={null}>
          <MarketsQuerySync week={data.fullWeek} onSearch={(search) => applyExternalSearchRef.current(search)} />
        </Suspense>
      ) : null}
      {preview ? (
        <div className="border-b-2 border-board bg-board text-chalk">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-2 sm:px-6">
            <p className="text-sm font-medium">Markets page mockup</p>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <Link href="/preview/markets" className="underline decoration-chalk/50 underline-offset-4">
                Earlier concepts
              </Link>
              <Link href="/markets" className="text-chalk/80 hover:text-chalk hover:underline">
                Live page
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mx-auto w-full max-w-7xl px-4 py-7 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">When</span>
          <Chip
            pressed={dayId == null && weekday == null}
            onClick={() => commit({ dayId: null, weekday: null })}
          >
            All week
          </Chip>
          {data.fullWeek.map((group) => (
            <Chip
              key={group.id}
              pressed={dayId === group.id}
              onClick={() =>
                commit({
                  dayId: dayId === group.id ? null : group.id,
                  weekday: null,
                })
              }
            >
              {group.label}
            </Chip>
          ))}
          <span aria-hidden className="mx-1 text-muted-foreground">
            ·
          </span>
          <span className="text-sm font-medium">Setup</span>
          {SETUPS.map((option) => {
            const count = optionCount({ setup: option.id });
            const pressed = setup === option.id;
            if (!pressed && count === 0) return null;
            return (
              <Chip
                key={option.id}
                pressed={pressed}
                onClick={() => commit({ setup: pressed ? null : option.id })}
              >
                <span className="inline-flex items-center gap-1.5">
                  {option.label} <Count value={count} active={pressed} />
                </span>
              </Chip>
            );
          })}
        </div>

        <section className={cn("mt-4 grid gap-5", !queryOn && "lg:grid-cols-12")}>
          <div
            className={cn(
              "flex flex-col justify-between bg-primary p-6 text-primary-foreground ring-1 ring-board",
              !queryOn && "lg:col-span-7",
            )}
          >
            <div>
              <h1 className="text-primary-foreground">{LAUNCH_CITY} farmers&apos; markets</h1>
              <p className="type-lede mt-2 max-w-2xl text-primary-foreground/95">
                Type a food, a vendor, or a market. A match opens that food, that vendor, or that
                market&apos;s vendors.
              </p>
              <div className="mt-4">
                <SearchField
                  value={q}
                  onChange={onQueryChange}
                  size="panel"
                  aria-label={SEARCH_LABEL}
                  placeholder="Honey, a vendor, or Leslieville"
                />
              </div>
            </div>
            {queryOn ? null : (
              <div className="mt-6 border-t border-primary-foreground/15 pt-4">
                <div className="grid grid-cols-3 gap-3">
                  <Census value={rows.length} label="Markets in view" />
                  <Census value={stallSlugs.size} label="Vendors in view" />
                  <Census value={placeNames.size} label="Places in view" />
                </div>
              </div>
            )}
          </div>

          {queryOn ? null : selected ? (
            <Spotlight
              row={selected}
              focusCategory={category}
              canStep={rows.length > 1}
              onPrevious={() => step(-1)}
              onNext={() => step(1)}
            />
          ) : (
            <div className="bg-card p-6 ring-1 ring-board lg:col-span-5">
              <h2>No markets match</h2>
              <p className="mt-2 text-base text-muted-foreground">
                Clear a specialty or a day to bring the directory back.
              </p>
              <button type="button" onClick={clearAll} className={cn(chipIdle, "mt-4")}>
                Clear filters
              </button>
            </div>
          )}
        </section>

        {searching ? (
          <SearchAnswer answer={answer} onMarket={(slug, scope) => openMarket(slug, scope)} />
        ) : landed && selected ? (
          <SearchLanding
            row={selected}
            query={q.trim()}
            guides={answer.guides}
            scope={pin.scope}
            onBack={() => setPin(null)}
            onShowAll={() => setPin({ slug: selected.market.slug, scope: "all" })}
          />
        ) : (
          <>
        <section className="mt-5 bg-card p-4 ring-1 ring-board sm:p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">Areas</span>
            <Chip pressed={area == null} onClick={() => commit({ area: null })}>
              All areas
            </Chip>
            {shownPlaces.map((place) => {
              const pressed = area === place.label;
              const count = optionCount({ area: place.label });
              if (!pressed && count === 0) return null;
              return (
                <Chip
                  key={place.label}
                  pressed={pressed}
                  onClick={() => commit({ area: pressed ? null : place.label })}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {place.label} <Count value={count} active={pressed} />
                  </span>
                </Chip>
              );
            })}
            {area && !placeChoices.some((place) => place.label === area) ? (
              <Chip pressed onClick={() => commit({ area: null })}>
                {area}
              </Chip>
            ) : null}
            {placeChoices.length > PAGE ? (
              <button type="button" onClick={() => setMorePlaces((value) => !value)} className={chipIdle}>
                {morePlaces ? "Fewer areas" : `More areas (${placeChoices.length - PAGE})`}
              </button>
            ) : null}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2" role="tablist" aria-label="Specialty">
            {FACETS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={facet === item.id}
                onClick={() => commit({ facet: item.id }, "silent")}
                className={facet === item.id ? chipOn : chipIdle}
              >
                {item.label}
              </button>
            ))}
          </div>
          <FacetChips
            key={facet}
            options={activeOptions}
            value={activeValue}
            onPick={pickFacetValue}
          />
          {category && guidePages.length > 0 ? (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="text-sm font-medium">Product guides</span>
              {guidePages.map((page) => (
                <Link
                  key={page.slug}
                  href={`/find/${page.slug}`}
                  className="stall-chip-sm bg-receipt px-2.5 py-1 text-sm font-medium ring-1 ring-border hover:bg-primary hover:text-primary-foreground"
                >
                  {page.term}
                </Link>
              ))}
              <Link
                href={productsBrowseHref(category, "featured")}
                className="text-sm font-medium text-primary hover:underline"
              >
                All {categoryLabel(category)}
              </Link>
            </div>
          ) : null}
          {cuisinePage || dietPage || madePage ? (
            <p className="mt-3 text-sm">
              {cuisinePage ? (
                <Link href={`/find/${cuisinePage.slug}`} className="font-medium text-primary hover:underline">
                  Open the {cuisinePage.term} guide
                </Link>
              ) : null}
              {dietPage ? (
                <Link href={`/find/${dietPage.slug}`} className="font-medium text-primary hover:underline">
                  Open the {dietPage.term} guide
                </Link>
              ) : null}
              {madePage ? (
                <Link href={`/find/${madePage.slug}`} className="font-medium text-primary hover:underline">
                  Open the {madePage.term} guide
                </Link>
              ) : null}
            </p>
          ) : null}
          {stamps.length > 0 ? (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {stamps.map((stamp) => (
                <button
                  key={stamp.key}
                  type="button"
                  onClick={stamp.clear}
                  className="stall-chip-sm inline-flex cursor-pointer items-center gap-1 bg-secondary px-2.5 py-1 text-sm font-medium"
                >
                  {stamp.label}
                  <CloseMark className="size-3.5" />
                  <span className="sr-only">Remove {stamp.label}</span>
                </button>
              ))}
              <button type="button" onClick={clearAll} className="text-sm font-medium text-primary hover:underline">
                Clear filters
              </button>
            </div>
          ) : null}
        </section>

        <section className="mt-5" aria-live="polite">
          <h2>Markets and vendors</h2>

          {mapMarkets.length > 0 ? (
            <div className="mt-4 h-64 sm:h-72">
              <MarketMapLazy markets={mapMarkets} className="h-full w-full overflow-hidden ring-1 ring-board" />
            </div>
          ) : null}

          {rows.length === 0 ? (
            <div className="mt-4 bg-card p-6 ring-1 ring-board">
              <p className="text-base font-medium">No markets match.</p>
              <button type="button" onClick={clearAll} className={cn(chipIdle, "mt-3")}>
                Clear filters
              </button>
            </div>
          ) : (
            <div className="mt-4 grid items-start gap-5 lg:grid-cols-12">
              <MarketColumn
                key={[q, dayId, area, setup, category, cuisine, diet, made].join("|")}
                rows={rows}
                selectedSlug={selected?.market.slug ?? ""}
                onSelect={(slug) => {
                  setSelectedSlug(slug);
                  if (pin) setPin({ slug, scope: pin.scope });
                }}
                onPlace={(place) => commit({ area: place })}
              />
              {selected ? (
                <StallColumn
                  key={`${selected.market.slug}|${q}|${category}|${cuisine}|${diet}|${made}`}
                  row={selected}
                  focusCategory={category}
                  onCategory={(id) => {
                    commit({ facet: "sell", category: id, categoryTags: [id] });
                  }}
                />
              ) : null}
            </div>
          )}
        </section>
          </>
        )}
      </div>
    </div>
  );
}

function SearchAnswer({
  answer,
  onMarket,
}: {
  answer: SearchAnswer;
  onMarket: (slug: string, scope: "match" | "all") => void;
}) {
  const [more, setMore] = useState(false);
  const shops = answer.vendors.filter((vendor) => vendor.rank < 9);
  const foods = answer.products.slice(0, more ? 12 : 4);
  const shownShops = shops.slice(0, more ? 8 : 4);
  const shownMarkets = answer.markets.slice(0, more ? 8 : 3);
  const best = answer.guides[0] ?? null;
  const otherGuides = answer.guides.slice(1, more ? 6 : 3);
  const empty = !best && foods.length === 0 && shownShops.length === 0 && shownMarkets.length === 0;
  const hidden =
    Math.max(0, answer.products.length - foods.length) +
    Math.max(0, shops.length - shownShops.length) +
    Math.max(0, answer.markets.length - shownMarkets.length) +
    Math.max(0, answer.guides.length - 1 - otherGuides.length);

  if (empty) {
    return (
      <section className="mt-4 bg-card p-6 ring-1 ring-board" aria-live="polite">
        <h2>Nothing matches that search</h2>
        <p className="mt-2 text-base text-muted-foreground">
          Try a food, a vendor, or a market. These guides list one food across every market.
        </p>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {FALLBACK_GUIDES.map((page) => (
            <Link
              key={page.slug}
              href={`/find/${page.slug}`}
              className="stall-chip-sm bg-receipt px-2.5 py-1 text-sm font-medium ring-1 ring-border hover:bg-primary hover:text-primary-foreground"
            >
              {page.term}
            </Link>
          ))}
        </div>
      </section>
    );
  }

  return (
    <div className="mt-4 bg-card ring-1 ring-board" aria-live="polite">
      {best ? (
        <Link
          href={`/find/${best.slug}`}
          className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 border-b border-border bg-receipt px-4 py-4 hover:bg-secondary"
        >
          <TagMark className="size-5 text-primary" />
          <span className="min-w-0">
            <span className="block text-base font-medium">{best.term}</span>
            <span className="text-sm text-muted-foreground">Every vendor that lists it</span>
          </span>
          <CaretRightMark className="size-4 text-primary" />
        </Link>
      ) : null}
      {otherGuides.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 border-b border-border px-4 py-3">
          {otherGuides.map((page) => (
            <Link
              key={page.slug}
              href={`/find/${page.slug}`}
              className="stall-chip-sm bg-receipt px-2.5 py-1 text-sm font-medium ring-1 ring-border hover:bg-primary hover:text-primary-foreground"
            >
              {page.term}
            </Link>
          ))}
        </div>
      ) : null}

      {foods.length > 0 ? (
        <section>
          <h2 className="border-b border-border px-4 py-3">Products</h2>
          <ul>
            {foods.map((product) => {
              const offer = product.offers[0];
              if (!offer) return null;
              const price = formatPrice(offer.priceCents);
              const moreOffers = product.offers.length - 1;
              return (
                <li key={product.name} className="border-b border-border px-4 py-3">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3">
                    <div className="min-w-0">
                      <Link href={product.href} className="text-base font-medium hover:underline">
                        {product.name}
                      </Link>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        <Link href={`/vendors/${offer.vendorSlug}`} className="hover:underline">
                          {offer.vendorName}
                        </Link>
                        <span> · </span>
                        <button
                          type="button"
                          onClick={() => onMarket(offer.marketSlug, "match")}
                          className="cursor-pointer hover:underline"
                        >
                          {offer.marketName}
                        </button>
                      </p>
                      {moreOffers > 0 ? (
                        <Link href={product.href} className="mt-1 inline-block text-sm font-medium text-primary hover:underline">
                          {moreOffers} more {moreOffers === 1 ? "vendor" : "vendors"}
                        </Link>
                      ) : null}
                    </div>
                    <div className="text-right">
                      <Hours value={offer.hours} />
                      {price ? <p className="type-nums text-sm">{price}</p> : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {shownShops.length > 0 ? (
        <section>
          <h2 className="border-b border-border px-4 py-3">Vendors</h2>
          <ul>
            {shownShops.map((vendor) => (
              <li key={vendor.slug} className="border-b border-border">
                <Link
                  href={`/vendors/${vendor.slug}`}
                  className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 px-4 py-3 hover:bg-secondary"
                >
                  <StallEmblem src={vendor.logoUrl} name={vendor.name} kind="vendor" size="sm" />
                  <span className="min-w-0">
                    <span className="block text-base font-medium">{vendor.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {vendor.categoryLabel} · {vendor.marketName}
                    </span>
                  </span>
                  <span className="text-right">
                    <Hours value={vendor.hours} />
                    {vendor.open ? (
                      <span className="mt-0.5 block">
                        <NowLabel>Open</NowLabel>
                      </span>
                    ) : null}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {shownMarkets.length > 0 ? (
        <section>
          <h2 className="border-b border-border px-4 py-3">Markets</h2>
          <ul>
            {shownMarkets.map((market) => (
              <li key={market.slug} className="border-b border-border">
                <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-3 px-4 py-3">
                  <StallEmblem src={market.logoUrl} name={market.name} kind="market" size="sm" />
                  <div className="min-w-0">
                    <button
                      type="button"
                      onClick={() =>
                        onMarket(market.slug, market.matchingStalls > 0 ? "match" : "all")
                      }
                      className="cursor-pointer text-left hover:underline"
                    >
                      <span className="block text-base font-medium">{market.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {market.neighbourhood}
                        {market.matchingStalls > 0
                          ? ` · ${market.matchingStalls} matching ${market.matchingStalls === 1 ? "vendor" : "vendors"}`
                          : ` · ${market.stallCount} ${market.stallCount === 1 ? "vendor" : "vendors"}`}
                      </span>
                    </button>
                    <div className="mt-2">
                      <OpenMarketPage slug={market.slug} />
                    </div>
                  </div>
                  <Hours value={market.hours} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {hidden > 0 ? (
        <div className="px-4 py-3">
          <button type="button" onClick={() => setMore(true)} className={chipIdle}>
            Show more ({hidden})
          </button>
        </div>
      ) : null}
    </div>
  );
}

function SearchLanding({
  row,
  query,
  guides,
  scope,
  onBack,
  onShowAll,
}: {
  row: FloorRow;
  query: string;
  guides: SearchGuide[];
  scope: "match" | "all";
  onBack: () => void;
  onShowAll: () => void;
}) {
  const [limit, setLimit] = useState(PAGE);
  const shown = row.stalls.slice(0, limit);
  const guide = guides[0] ?? null;
  const narrowed = scope === "match" && row.stalls.length > 0 && row.stalls.length < row.market.vendorCount;

  return (
    <section className="mt-4 bg-card ring-1 ring-board" aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <button type="button" onClick={onBack} className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium text-primary hover:underline">
          <CaretLeftMark className="size-4" />
          Back to results
        </button>
        {guide ? (
          <Link href={`/find/${guide.slug}`} className="text-sm font-medium text-primary hover:underline">
            Every vendor that lists {guide.term}
          </Link>
        ) : null}
      </div>
      <div className="border-b border-border px-4 py-4">
        <p className="type-kicker">{row.market.neighbourhood}</p>
        <h2 className="mt-1">
          <Link href={`/markets/${row.market.slug}`} className="hover:underline">
            <VerifiedName slug={row.market.slug} name={row.market.name} />
          </Link>
        </h2>
        <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2">
          <p className="text-sm text-muted-foreground">
            {narrowed
              ? `Vendors matching “${query}”`
              : `${row.stallCount} ${row.stallCount === 1 ? "vendor" : "vendors"}`}
          </p>
          <Hours value={row.hours} />
          <OpenMarketPage slug={row.market.slug} />
        </div>
        {narrowed ? (
          <button type="button" onClick={onShowAll} className="mt-2 cursor-pointer text-sm font-medium text-primary hover:underline">
            All vendors at this market
          </button>
        ) : null}
      </div>
      {shown.length === 0 ? (
        <p className="px-4 py-6 text-base">No vendors at this market match.</p>
      ) : (
        <ul>
          {shown.map((stall) => {
            const needle = query.toLowerCase();
            const item =
              scope === "match"
                ? (stall.items.find((entry) => entry.name.toLowerCase().includes(needle)) ?? null)
                : (stall.items[0] ?? null);
            const price = item ? formatPrice(item.priceCents) : null;
            return (
              <li key={stall.slug} className="border-b border-border px-4 py-3 last:border-b-0">
                <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3">
                  <StallEmblem src={stall.logoUrl} name={stall.name} kind="vendor" size="sm" />
                  <div className="min-w-0">
                    <Link href={`/vendors/${stall.slug}`} className="text-base font-medium hover:underline">
                      {stall.name}
                    </Link>
                    <p className="text-sm text-muted-foreground">{stall.categoryLabel}</p>
                    {item ? (
                      <p className="mt-1">
                        <Link href={item.href} className="text-sm font-medium hover:underline">
                          {item.name}
                          {price ? <span className="type-nums ml-1.5">{price}</span> : null}
                        </Link>
                      </p>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {row.stalls.length > limit ? (
        <div className="px-4 py-3">
          <button type="button" onClick={() => setLimit((value) => value + PAGE)} className={chipIdle}>
            Show more vendors ({row.stalls.length - limit})
          </button>
        </div>
      ) : null}
    </section>
  );
}

function Census({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-lg bg-primary-foreground/12 px-3.5 py-2.5">
      <p className="type-census text-2xl text-primary-foreground sm:text-3xl">{formatCensus(value)}</p>
      <p className="text-sm text-primary-foreground/85">{label}</p>
    </div>
  );
}

function Spotlight({
  row,
  focusCategory,
  canStep,
  onPrevious,
  onNext,
}: {
  row: FloorRow;
  focusCategory: string | null;
  canStep: boolean;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const { market } = row;
  return (
    <div className="flex flex-col justify-between bg-card ring-1 ring-board lg:col-span-5">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-receipt px-5 py-3">
          <div className="flex items-center gap-2">
            <PlateMark className="size-4 text-primary" />
            <p className="type-kicker font-medium">{market.neighbourhood}</p>
          </div>
          <SaveButton kind="market" slug={market.slug} name={market.name} />
        </div>
        <div className="p-5">
          <h2>
            <Link href={`/markets/${market.slug}`} className="hover:underline">
              <VerifiedName slug={market.slug} name={market.name} />
            </Link>
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            <ListingScore parens ratingAvg={market.rating_avg} reviewCount={market.review_count} />
            {row.open ? (
              <span className="ml-2">
                <NowLabel>Open</NowLabel>
              </span>
            ) : null}
          </p>
          {market.sessions.length > 0 ? (
            <ul className="mt-3">
              {market.sessions.map((session) => (
                <li
                  key={`${session.day}-${session.hours}`}
                  className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 py-0.5"
                >
                  <span className="text-sm">{session.day}</span>
                  <Hours value={session.hours} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3">
              <Hours value={row.hours} />
            </p>
          )}
          <p className="mt-2 text-sm">
            <AddressLink
              address={market.address}
              city={market.city}
              province={market.province}
              name={market.name}
              lat={market.lat}
              lng={market.lng}
            />
          </p>
          {row.stalls.length > 0 ? (
            <ul className="mt-4 border-t border-border">
              {row.stalls.slice(0, 3).map((stall) => {
                const item = focusedItems(stall, focusCategory)[0];
                const price = item ? formatPrice(item.priceCents) : null;
                return (
                  <li
                    key={stall.slug}
                    className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 py-2"
                  >
                    <StallEmblem src={stall.logoUrl} name={stall.name} kind="vendor" size="sm" />
                    <div className="min-w-0">
                      <Link
                        href={`/vendors/${stall.slug}`}
                        className="text-sm font-medium hover:underline"
                      >
                        {stall.name}
                      </Link>
                      {item ? (
                        <p>
                          <Link href={item.href} className="text-sm hover:underline">
                            {item.name}
                            {price ? <span className="type-nums ml-1.5">{price}</span> : null}
                          </Link>
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          {focusedLabel(stall, focusCategory)}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-receipt px-5 py-3">
        <button
          type="button"
          onClick={onPrevious}
          disabled={!canStep}
          aria-label="Previous market"
          className="stall-chip-sm inline-flex size-9 cursor-pointer items-center justify-center bg-card ring-1 ring-border hover:bg-secondary disabled:cursor-default disabled:opacity-40"
        >
          <CaretLeftMark className="size-4" />
        </button>
        <OpenMarketPage slug={market.slug} />
        <button
          type="button"
          onClick={onNext}
          disabled={!canStep}
          aria-label="Next market"
          className="stall-chip-sm inline-flex size-9 cursor-pointer items-center justify-center bg-card ring-1 ring-border hover:bg-secondary disabled:cursor-default disabled:opacity-40"
        >
          <CaretRightMark className="size-4" />
        </button>
      </div>
    </div>
  );
}

function FacetChips({
  options,
  value,
  onPick,
}: {
  options: Array<{ id: string; label: string; count: number }>;
  value: string | null;
  onPick: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const head = options.slice(0, PAGE);
  const pinned = value ? options.find((option) => option.id === value) : undefined;
  const visible = expanded ? options : pinned && !head.some((option) => option.id === pinned.id) ? [pinned, ...head] : head;
  if (options.length === 0) {
    return <p className="mt-3 text-sm text-muted-foreground">Nothing in view uses this specialty.</p>;
  }
  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5">
      {visible.map((option) => {
        const pressed = value === option.id;
        return (
          <Chip key={option.id} pressed={pressed} onClick={() => onPick(option.id)}>
            <span className="inline-flex items-center gap-1.5">
              {option.label} <Count value={option.count} active={pressed} />
            </span>
          </Chip>
        );
      })}
      {options.length > PAGE ? (
        <button type="button" onClick={() => setExpanded((open) => !open)} className={chipIdle}>
          {expanded ? "Fewer" : `More (${options.length - PAGE})`}
        </button>
      ) : null}
    </div>
  );
}

function MarketColumn({
  rows,
  selectedSlug,
  onSelect,
  onPlace,
}: {
  rows: FloorRow[];
  selectedSlug: string;
  onSelect: (slug: string) => void;
  onPlace: (place: string) => void;
}) {
  const [limit, setLimit] = useState(PAGE);
  const shown = rows.slice(0, limit);
  return (
    <div id="directory-markets" className="scroll-mt-header bg-card ring-1 ring-board lg:col-span-5">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <RulesMark className="size-4 text-primary" />
          <h3>Markets</h3>
        </div>
        <span className="type-nums text-sm text-primary">{rows.length}</span>
      </div>
      <ul>
        {shown.map((row) => {
          const selected = row.market.slug === selectedSlug;
          return (
            <li
              key={row.market.slug}
              className={cn(
                "border-b border-border border-l-4",
                selected ? "border-l-primary bg-secondary" : "border-l-transparent",
              )}
            >
              <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-3 px-3 py-3">
                <StallEmblem src={row.market.logo_url} name={row.market.name} kind="market" size="sm" />
                <div className="min-w-0">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3">
                    <button
                      type="button"
                      aria-pressed={selected}
                      onClick={() => onSelect(row.market.slug)}
                      className="cursor-pointer text-left"
                    >
                      <span className="text-base font-medium">
                        <VerifiedName slug={row.market.slug} name={row.market.name} />
                      </span>
                      <ListingScore
                        parens
                        ratingAvg={row.market.rating_avg}
                        reviewCount={row.market.review_count}
                        className="ml-1.5"
                      />
                      {row.open ? (
                        <span className="mt-0.5 block">
                          <NowLabel>Open</NowLabel>
                        </span>
                      ) : null}
                    </button>
                    <div className="text-right">
                      <Hours value={row.hours} />
                      {row.stallCount > 0 ? (
                        <p className="text-sm text-muted-foreground">
                          <span className="type-nums">{row.stallCount}</span>{" "}
                          {row.stallCount === 1 ? "vendor" : "vendors"}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  {areaForMarket(row.market) ? (
                    <button
                      type="button"
                      onClick={() => {
                        const place = areaForMarket(row.market);
                        if (place) onPlace(place);
                      }}
                      className="mt-0.5 cursor-pointer text-left text-sm text-muted-foreground hover:underline"
                    >
                      {areaForMarket(row.market)}
                    </button>
                  ) : (
                    <p className="mt-0.5 text-sm text-muted-foreground">{row.market.neighbourhood}</p>
                  )}
                  <div className="mt-2">
                    <OpenMarketPage slug={row.market.slug} />
                  </div>
                </div>
                <SaveButton kind="market" slug={row.market.slug} name={row.market.name} />
              </div>
            </li>
          );
        })}
      </ul>
      {rows.length > limit ? (
        <div className="px-4 py-3">
          <button type="button" onClick={() => setLimit((value) => value + PAGE)} className={chipIdle}>
            Show more markets ({rows.length - limit})
          </button>
        </div>
      ) : null}
    </div>
  );
}

function StallColumn({
  row,
  focusCategory,
  onCategory,
}: {
  row: FloorRow;
  focusCategory: string | null;
  onCategory: (id: string) => void;
}) {
  const [localCategory, setLocalCategory] = useState<string | null>(null);
  const [moreLocal, setMoreLocal] = useState(false);
  const [limit, setLimit] = useState(PAGE);
  const present = new Map<string, string>();
  for (const stall of row.stalls) {
    for (const id of stall.aisleIds) present.set(id, categoryLabel(id));
  }
  const localOptions = [...present.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  const localHead = localOptions.slice(0, PAGE);
  const localVisible = moreLocal
    ? localOptions
    : localCategory && !localHead.some(([id]) => id === localCategory)
      ? ([[localCategory, categoryLabel(localCategory)], ...localHead] as Array<[string, string]>)
      : localHead;
  const stalls = localCategory
    ? row.stalls.filter((stall) => stall.aisleIds.includes(localCategory))
    : row.stalls;
  const shown = stalls.slice(0, limit);
  const guidePages = localCategory
    ? FIND_PAGES.filter((page) => page.category === localCategory)
        .sort((a, b) => b.vendors - a.vendors)
        .slice(0, 4)
    : [];

  return (
    <div id="directory-vendors" className="scroll-mt-header bg-card ring-1 ring-board lg:col-span-7">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <CrateMark className="size-4 text-primary" />
          <h3>Vendors</h3>
        </div>
        <span className="text-sm text-primary">
          <span className="type-nums">{stalls.length}</span>
          {stalls.length < row.market.vendorCount ? (
            <>
              {" "}
              of <span className="type-nums">{row.market.vendorCount}</span>
            </>
          ) : null}{" "}
          {stalls.length === 1 ? "vendor" : "vendors"}
        </span>
      </div>
      {localOptions.length > 1 ? (
        <div className="flex flex-wrap items-center gap-1.5 border-b border-border px-4 py-3">
          <Chip pressed={localCategory == null} onClick={() => setLocalCategory(null)}>
            All vendors here
          </Chip>
          {localVisible.map(([id, label]) => (
            <Chip
              key={id}
              pressed={localCategory === id}
              onClick={() => setLocalCategory(localCategory === id ? null : id)}
            >
              {label}
            </Chip>
          ))}
          {localOptions.length > PAGE ? (
            <button type="button" onClick={() => setMoreLocal((open) => !open)} className={chipIdle}>
              {moreLocal ? "Fewer" : `More (${localOptions.length - PAGE})`}
            </button>
          ) : null}
        </div>
      ) : null}
      {localCategory ? (
        <div className="flex flex-wrap items-center gap-1.5 border-b border-border px-4 py-3">
          <button type="button" onClick={() => onCategory(localCategory)} className={chipIdle}>
            {categoryLabel(localCategory)} at every market
          </button>
          {guidePages.map((page) => (
            <Link
              key={page.slug}
              href={`/find/${page.slug}`}
              className="text-sm font-medium text-primary hover:underline"
            >
              {page.term}
            </Link>
          ))}
        </div>
      ) : null}
      {shown.length === 0 ? (
        <p className="px-4 py-6 text-base">No vendors at this market match.</p>
      ) : (
        <ul>
          {shown.map((stall) => {
            const items = focusedItems(stall, focusCategory);
            const origin = stall.origins[0];
            const diet = stall.diets[0];
            const made = stall.production[0];
            const detail = [focusedLabel(stall, focusCategory), origin ? tagLabel(origin) : null, diet ? tagLabel(diet) : null, made ? tagLabel(made) : null]
              .filter((part): part is string => Boolean(part))
              .filter((part, index, all) => all.indexOf(part) === index)
              .slice(0, 3)
              .join(" · ");
            return (
              <li key={stall.slug} className="border-b border-border px-4 py-3">
                <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-3">
                  <StallEmblem src={stall.logoUrl} name={stall.name} kind="vendor" size="sm" />
                  <div className="min-w-0">
                    <p>
                      <Link href={`/vendors/${stall.slug}`} className="text-base font-medium hover:underline">
                        {stall.name}
                      </Link>
                      <ListingScore
                        parens
                        ratingAvg={stall.ratingAvg}
                        reviewCount={stall.reviewCount}
                        className="ml-1.5"
                      />
                    </p>
                    <p className="text-sm text-muted-foreground">{detail}</p>
                    {items.length > 0 ? (
                      <p className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        {items.map((item) => {
                          const price = formatPrice(item.priceCents);
                          return (
                            <Link
                              key={`${item.href}-${item.name}`}
                              href={item.href}
                              className="text-sm font-medium hover:underline"
                            >
                              {item.name}
                              {price ? <span className="type-nums ml-1.5">{price}</span> : null}
                            </Link>
                          );
                        })}
                      </p>
                    ) : null}
                  </div>
                  <SaveButton kind="vendor" slug={stall.slug} name={stall.name} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {stalls.length > limit ? (
        <div className="px-4 py-3">
          <button type="button" onClick={() => setLimit((value) => value + PAGE)} className={chipIdle}>
            Show more vendors ({stalls.length - limit})
          </button>
        </div>
      ) : null}
    </div>
  );
}
