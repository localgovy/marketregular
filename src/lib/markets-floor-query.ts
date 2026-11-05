import { FIND_CATEGORIES } from "@/data/find-pages";
import { COUNTRY_TAGS, WEEKDAYS } from "@/lib/constants";
import {
  FIND_AREAS,
  marketsHref,
  marketsSearchFromSearchParams,
  type MarketsSearch,
} from "@/lib/find-paths";

export type FloorFacet = "sell" | "cuisine" | "diet" | "made";

export type FloorQuery = {
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
  near: { lat: number; lng: number } | null;
  facet: FloorFacet;
};

const QUERY_CAP = 80;
const TAG_CAP = 8;
const AREA_CAP = 80;

const REGION_LABELS = [
  "Downtown",
  "East end",
  "West end",
  "Etobicoke",
  "Scarborough",
  "Midtown and North York",
  "Mississauga and Brampton",
  "Hamilton",
  "Durham",
  "York Region",
  "Halton",
  "Waterloo Region",
  "Niagara",
];

const SETUP_TAGS = new Set(["indoor", "outdoor", "year-round", "holiday", "seasonal"]);
const DIET_TAGS = new Set([
  "vegan",
  "vegetarian",
  "gluten-free",
  "dairy-free",
  "halal",
  "keto",
  "plant-based",
  "gluten-friendly",
]);
const MADE_TAGS = new Set([
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
]);
const COUNTRY_SET = new Set<string>(COUNTRY_TAGS);
const CATEGORY_IDS = new Set<string>(FIND_CATEGORIES.map((category) => category.id));

/** Older directory tags, and the floor category they select. */
const LEGACY_CATEGORY: Record<string, string> = {
  bakery: "bread-and-bakery",
  bread: "bread-and-bakery",
  sweets: "pies-and-sweets",
  "prepared-food": "prepared-foods",
  produce: "vegetables",
  fruit: "apples-and-fruit",
  meat: "meat-and-turkey",
  poultry: "meat-and-turkey",
  seafood: "seafood",
  eggs: "eggs",
  cheese: "cheese-and-dairy",
  dairy: "cheese-and-dairy",
  honey: "honey",
  maple: "maple",
  preserves: "preserves-and-sauces",
  coffee: "coffee-and-tea",
  tea: "coffee-and-tea",
  beer: "alcohol",
  cider: "alcohol",
  wine: "alcohol",
  flowers: "garden-and-outdoor",
  plants: "garden-and-outdoor",
  crafts: "art-and-stationery",
  jewelry: "clothing-and-accessories",
  mushrooms: "vegetables",
};

export function categoryIdForTag(tag: string) {
  if (CATEGORY_IDS.has(tag)) return tag;
  return LEGACY_CATEGORY[tag] ?? null;
}

export function emptyFloorQuery(): FloorQuery {
  return {
    q: "",
    dayId: null,
    weekday: null,
    area: null,
    setup: null,
    category: null,
    cuisine: null,
    diet: null,
    made: null,
    categoryTags: [],
    cuisineTags: [],
    dietTags: [],
    madeTags: [],
    near: null,
    facet: "sell",
  };
}

export function canonicalArea(value: string) {
  const needle = value.trim().toLowerCase();
  return REGION_LABELS.find((label) => label.toLowerCase() === needle) ?? value.trim();
}

export function areaMatchesMarket(
  area: string,
  market: { slug: string; city: string; neighbourhood: string; region: string | null },
) {
  if (market.region === area) return true;
  const needle = area.trim().toLowerCase();
  if (!needle) return false;
  if (market.city.trim().toLowerCase() === needle) return true;
  if (market.neighbourhood.trim().toLowerCase() === needle) return true;
  const named = FIND_AREAS.find(
    (item) => item.q.toLowerCase() === needle || item.label.toLowerCase() === needle,
  );
  return Boolean(named?.slugs.includes(market.slug));
}

function remember(list: string[], tag: string) {
  if (!list.includes(tag)) list.push(tag);
}

export function floorQueryFromSearch(
  search: MarketsSearch & { day?: string },
  week: ReadonlyArray<{ id: string }>,
): FloorQuery {
  const ids = new Set(week.map((group) => group.id));
  let dayId: string | null = null;
  let weekday: number | null = null;
  if (search.day && (ids.has(search.day) || search.day === "open")) {
    dayId = search.day;
  } else if (search.openNow) {
    dayId = "open";
  } else if (search.weekdays?.length) {
    const day = search.weekdays.find((value) => Number.isInteger(value) && value >= 0 && value <= 6);
    if (day != null) {
      const id = `day-${day}`;
      if (ids.has(id)) dayId = id;
      else weekday = day;
    }
  }

  let setup = search.setup?.trim() || null;
  const categoryTags: string[] = [];
  const cuisineTags: string[] = [];
  const dietTags: string[] = [];
  const madeTags: string[] = [];
  for (const tag of (search.tags ?? []).slice(0, TAG_CAP)) {
    if (SETUP_TAGS.has(tag)) {
      if (!setup) setup = tag;
      continue;
    }
    if (MADE_TAGS.has(tag)) {
      remember(madeTags, tag);
      continue;
    }
    if (DIET_TAGS.has(tag)) {
      remember(dietTags, tag);
      continue;
    }
    if (COUNTRY_SET.has(tag)) {
      remember(cuisineTags, tag);
      continue;
    }
    remember(categoryTags, tag);
  }

  const category = categoryTags.map(categoryIdForTag).find((id): id is string => Boolean(id)) ?? null;
  const cuisine = cuisineTags[0] ?? null;
  const diet = dietTags[0] ?? null;
  const made = madeTags[0] ?? null;
  const facet: FloorFacet = categoryTags.length
    ? "sell"
    : cuisineTags.length
      ? "cuisine"
      : dietTags.length
        ? "diet"
        : madeTags.length
          ? "made"
          : "sell";

  const lat = Number(search.lat);
  const lng = Number(search.lng);
  const near =
    Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
      ? { lat, lng }
      : null;
  const areaRaw = search.areas?.[0]?.trim() ?? "";

  return {
    q: (search.q ?? "").trim().slice(0, QUERY_CAP),
    dayId,
    weekday,
    area: areaRaw && areaRaw.length <= AREA_CAP ? canonicalArea(areaRaw) : null,
    setup,
    category,
    cuisine,
    diet,
    made,
    categoryTags,
    cuisineTags,
    dietTags,
    madeTags,
    near,
    facet,
  };
}

export function floorQueryFromParams(
  params: URLSearchParams,
  week: ReadonlyArray<{ id: string }>,
) {
  return floorQueryFromSearch(
    { ...marketsSearchFromSearchParams(params), day: params.get("day") ?? undefined },
    week,
  );
}

export function floorHref(query: FloorQuery) {
  const tags = [
    ...query.categoryTags,
    ...query.cuisineTags,
    ...query.dietTags,
    ...query.madeTags,
  ];
  const weekday =
    query.dayId?.startsWith("day-")
      ? Number(query.dayId.slice(4))
      : query.dayId
        ? null
        : query.weekday;
  let href = marketsHref({
    q: query.q.trim() || undefined,
    openNow: query.dayId === "open" || undefined,
    weekdays: weekday != null && weekday >= 0 && weekday <= 6 ? [weekday] : undefined,
    areas: query.area ? [query.area] : undefined,
    setup: query.setup || undefined,
    tags: tags.length ? tags : undefined,
    lat: query.near ? String(query.near.lat) : undefined,
    lng: query.near ? String(query.near.lng) : undefined,
    sort: query.near ? "near" : undefined,
  });
  if (query.dayId === "later" || query.dayId === "earlier") {
    href += `${href.includes("?") ? "&" : "?"}day=${query.dayId}`;
  }
  return href;
}

export function weekdayLabel(weekday: number) {
  return WEEKDAYS[weekday] ?? "That day";
}
