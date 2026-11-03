"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import type {
  EnrichedMarketRow,
  FloorRosterEntry,
  MarketsFloorData,
  PreviewVendorSpotlight,
  VendorTaxonomy,
} from "@/app/preview/_lib/markets-preview-data";
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
} from "@/components/marks";
import { NowLabel } from "@/components/now-label";
import { SaveButton } from "@/components/save-button";
import { SearchField } from "@/components/search-field";
import { VerifiedName } from "@/components/verified-stamp";
import { FIND_CATEGORIES, FIND_PAGES } from "@/data/find-pages";
import { COUNTRY_TAGS, SEARCH_LABEL } from "@/lib/constants";
import { tagLabel } from "@/lib/find-paths";
import { formatPrice } from "@/lib/format";
import { LAUNCH_CITY } from "@/lib/launch";
import type { MapMarket } from "@/lib/directory-page";
import { productsBrowseHref } from "@/lib/product-browse-href";
import { cn } from "@/lib/utils";

type FacetId = "sell" | "cuisine" | "diet" | "made";
type SortId = "soonest" | "stalls" | "name";

type FloorItem = {
  name: string;
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
  categoryLabel: string;
  items: FloorItem[];
  blob: string;
};

type IndexedMarket = {
  market: EnrichedMarketRow;
  blob: string;
  stalls: FloorStall[];
};

type FloorFilters = {
  q: string;
  dayId: string | null;
  area: string | null;
  setup: string | null;
  category: string | null;
  cuisine: string | null;
  diet: string | null;
  made: string | null;
};

type FloorRow = {
  market: EnrichedMarketRow;
  hours: string;
  open: boolean;
  stallCount: number;
  stalls: FloorStall[];
};

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

const chipIdle =
  "stall-chip-sm cursor-pointer bg-card px-3 py-1.5 text-sm font-medium text-foreground ring-1 ring-border hover:bg-secondary";
const chipOn = "stall-chip-sm cursor-pointer bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground";

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

function toStall(
  entry: FloorRosterEntry,
  spot: PreviewVendorSpotlight | undefined,
  tax: VendorTaxonomy | undefined,
): FloorStall {
  const aisleIds = unique([...(tax?.categories ?? []), ...(spot?.aisleIds ?? [])]);
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
  const items: FloorItem[] = [];
  for (const item of spot?.items ?? []) {
    if (items.length >= 2) break;
    items.push({ name: item.name, href: item.href, priceCents: item.priceCents });
  }
  for (const sample of tax?.samples ?? []) {
    if (items.length >= 2) break;
    if (items.some((item) => item.name === sample.name)) continue;
    items.push({ name: sample.name, href: sample.href, priceCents: sample.priceCents });
  }
  const label = aisleIds[0]
    ? categoryLabel(aisleIds[0])
    : tagSpecialty
      ? tagLabel(tagSpecialty)
      : (spot?.primaryAisleLabel ?? "Market stall");
  const blob = [entry.name, label, ...aisleIds.map(categoryLabel), ...origins, ...diets, ...production, ...items.map((item) => item.name)]
    .join(" ")
    .toLowerCase();
  return {
    slug: entry.vendorSlug,
    name: entry.name,
    logoUrl: entry.logoUrl ?? spot?.logoUrl ?? null,
    ratingAvg: entry.ratingAvg ?? spot?.ratingAvg ?? null,
    reviewCount: entry.reviewCount || spot?.reviewCount || 0,
    aisleIds,
    origins,
    diets,
    production,
    categoryLabel: label,
    items,
    blob,
  };
}

function buildIndex(data: MarketsFloorData): IndexedMarket[] {
  const spotBySlug = new Map(data.vendorSpotlights.map((vendor) => [vendor.slug, vendor]));
  const byMarket = new Map<string, FloorStall[]>();
  const seen = new Map<string, Set<string>>();
  for (const entry of data.roster) {
    const have = seen.get(entry.marketSlug) ?? new Set<string>();
    if (have.has(entry.vendorSlug)) continue;
    have.add(entry.vendorSlug);
    seen.set(entry.marketSlug, have);
    const list = byMarket.get(entry.marketSlug) ?? [];
    list.push(toStall(entry, spotBySlug.get(entry.vendorSlug), data.taxonomyBySlug[entry.vendorSlug]));
    byMarket.set(entry.marketSlug, list);
  }
  for (const list of byMarket.values()) {
    list.sort(
      (a, b) => b.reviewCount - a.reviewCount || a.name.localeCompare(b.name),
    );
  }
  return data.enrichedMarkets.map((market) => ({
    market,
    blob: [market.name, market.neighbourhood, market.city, market.address, ...market.tags, ...market.displayTags]
      .join(" ")
      .toLowerCase(),
    stalls: byMarket.get(market.slug) ?? [],
  }));
}

function hasSetup(market: EnrichedMarketRow, setup: string) {
  const tags = market.tags.map((tag) => tag.toLowerCase());
  if (tags.includes(setup)) return true;
  if (setup === "indoor" && market.indoor_outdoor === "Indoor") return true;
  if (setup === "outdoor" && market.indoor_outdoor === "Outdoor") return true;
  return false;
}

function marketInPlace(market: EnrichedMarketRow, area: string, data: MarketsFloorData) {
  const circuit = data.neighbourhoodCircuits.find((entry) => entry.label === area);
  if (!circuit) {
    const needle = area.toLowerCase();
    return (
      market.neighbourhood.toLowerCase() === needle || market.city.toLowerCase() === needle
    );
  }
  if (circuit.topMarkets.some((entry) => entry.slug === market.slug)) return true;
  if (market.neighbourhood.toLowerCase() === circuit.label.toLowerCase()) return true;
  if (circuit.label === circuit.q && market.city.toLowerCase() === circuit.q.toLowerCase()) {
    return true;
  }
  return market.name.toLowerCase().includes(circuit.q.toLowerCase());
}

function stallMatches(
  stall: FloorStall,
  filters: FloorFilters,
) {
  if (filters.category && !stall.aisleIds.includes(filters.category)) return false;
  if (filters.cuisine && !stall.origins.includes(filters.cuisine)) return false;
  if (filters.diet && !stall.diets.includes(filters.diet)) return false;
  if (filters.made && !stall.production.includes(filters.made)) return false;
  return true;
}

function visibleStalls(entry: IndexedMarket, filters: FloorFilters) {
  const needle = filters.q.trim().toLowerCase();
  const marketHit = !needle || entry.blob.includes(needle);
  return entry.stalls.filter((stall) => {
    if (!stallMatches(stall, filters)) return false;
    if (needle && !marketHit && !stall.blob.includes(needle)) return false;
    return true;
  });
}

function marketMatches(
  entry: IndexedMarket,
  filters: FloorFilters,
  daySlugs: Set<string> | null,
  data: MarketsFloorData,
) {
  if (daySlugs && !daySlugs.has(entry.market.slug)) return false;
  if (filters.area && !marketInPlace(entry.market, filters.area, data)) return false;
  if (filters.setup && !hasSetup(entry.market, filters.setup)) return false;
  const needle = filters.q.trim();
  const narrowed = Boolean(
    needle || filters.category || filters.cuisine || filters.diet || filters.made,
  );
  if (!narrowed) return true;
  return visibleStalls(entry, filters).length > 0;
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

function closestGuide(q: string) {
  const needle = q.trim().toLowerCase();
  if (needle.length < 3) return null;
  let best: (typeof FIND_PAGES)[number] | null = null;
  for (const page of FIND_PAGES) {
    const term = page.term.toLowerCase();
    if (term !== needle && !term.startsWith(needle)) continue;
    if (!best || page.term.length < best.term.length) best = page;
  }
  return best;
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

export function MarketsFloorMockup({ data }: { data: MarketsFloorData }) {
  const [q, setQ] = useState("");
  const [dayId, setDayId] = useState<string | null>(null);
  const [area, setArea] = useState<string | null>(null);
  const [setup, setSetup] = useState<string | null>(null);
  const [facet, setFacet] = useState<FacetId>("sell");
  const [category, setCategory] = useState<string | null>(null);
  const [cuisine, setCuisine] = useState<string | null>(null);
  const [diet, setDiet] = useState<string | null>(null);
  const [made, setMade] = useState<string | null>(null);
  const [sort, setSort] = useState<SortId>("soonest");
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [morePlaces, setMorePlaces] = useState(false);

  const index = useMemo(() => buildIndex(data), [data]);
  const filters: FloorFilters = { q, dayId, area, setup, category, cuisine, diet, made };
  const dayGroup = dayId ? (data.fullWeek.find((group) => group.id === dayId) ?? null) : null;
  const daySlugs = dayGroup ? new Set(dayGroup.slots.map((slot) => slot.slug)) : null;
  const slotBySlug = dayGroup
    ? new Map(dayGroup.slots.map((slot) => [slot.slug, slot]))
    : null;

  const rows = useMemo(() => {
    const matched = index.filter((entry) => marketMatches(entry, filters, daySlugs, data));
    const built: FloorRow[] = matched.map((entry) => {
      const stalls = visibleStalls(entry, filters);
      const slot = slotBySlug?.get(entry.market.slug);
      const soonest = nextSession(entry.market.sessions, data.todayWeekday);
      const hours = slot
        ? slot.hours
        : soonest
          ? `${soonest.day.slice(0, 3)} ${soonest.hours}`
          : entry.market.hours || entry.market.nextOpen;
      const narrowed = Boolean(q.trim() || category || cuisine || diet || made);
      return {
        market: entry.market,
        hours,
        open: slot ? slot.open : entry.market.open,
        stallCount: narrowed ? stalls.length : entry.market.vendorCount || stalls.length,
        stalls,
      };
    });
    const slotOrder = slotBySlug
      ? new Map([...slotBySlug.keys()].map((slug, position) => [slug, position]))
      : null;
    built.sort((a, b) => {
      if (sort !== "name" && (a.stallCount > 0) !== (b.stallCount > 0)) {
        return a.stallCount > 0 ? -1 : 1;
      }
      if (sort === "name") return a.market.name.localeCompare(b.market.name);
      if (sort === "stalls") {
        return b.stallCount - a.stallCount || a.market.name.localeCompare(b.market.name);
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
  }, [index, q, dayId, area, setup, category, cuisine, diet, made, sort, data]);

  const selected = rows.find((row) => row.market.slug === selectedSlug) ?? rows[0] ?? null;
  const guide = closestGuide(q);

  const placeChoices = data.neighbourhoodCircuits.filter(
    (circuit) => circuit.label !== "More in Toronto" && circuit.marketCount > 0,
  );

  function optionCount(next: Partial<FloorFilters>) {
    const merged = { ...filters, ...next };
    return index.filter((entry) => marketMatches(entry, merged, daySlugs, data)).length;
  }

  const facetOptions = useMemo(() => {
    const activeDay = dayId ? (data.fullWeek.find((group) => group.id === dayId) ?? null) : null;
    const activeDaySlugs = activeDay ? new Set(activeDay.slots.map((slot) => slot.slug)) : null;

    function tally(kind: FacetId) {
      const counts = new Map<string, number>();
      const narrowed: FloorFilters = {
        q,
        dayId,
        area,
        setup,
        category: kind === "sell" ? null : category,
        cuisine: kind === "cuisine" ? null : cuisine,
        diet: kind === "diet" ? null : diet,
        made: kind === "made" ? null : made,
      };
      for (const entry of index) {
        if (activeDaySlugs && !activeDaySlugs.has(entry.market.slug)) continue;
        if (area && !marketInPlace(entry.market, area, data)) continue;
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
  }, [index, q, dayId, area, setup, category, cuisine, diet, made, data]);

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
    if (facet === "sell") setCategory(next);
    else if (facet === "cuisine") setCuisine(next);
    else if (facet === "diet") setDiet(next);
    else setMade(next);
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

  const stamps = [
    dayGroup ? { key: "day", label: dayGroup.label, clear: () => setDayId(null) } : null,
    area ? { key: "area", label: area, clear: () => setArea(null) } : null,
    setup ? { key: "setup", label: tagLabel(setup), clear: () => setSetup(null) } : null,
    category ? { key: "category", label: categoryLabel(category), clear: () => setCategory(null) } : null,
    cuisine ? { key: "cuisine", label: tagLabel(cuisine), clear: () => setCuisine(null) } : null,
    diet ? { key: "diet", label: tagLabel(diet), clear: () => setDiet(null) } : null,
    made ? { key: "made", label: tagLabel(made), clear: () => setMade(null) } : null,
    q.trim() ? { key: "q", label: q.trim(), clear: () => setQ("") } : null,
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

  function clearAll() {
    setQ("");
    setDayId(null);
    setArea(null);
    setSetup(null);
    setCategory(null);
    setCuisine(null);
    setDiet(null);
    setMade(null);
  }

  return (
    <div className="bg-background text-foreground">
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

      <div className="mx-auto w-full max-w-7xl px-4 py-7 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">When</span>
          <Chip pressed={dayId == null} onClick={() => setDayId(null)}>
            All week
          </Chip>
          {data.fullWeek.map((group) => (
            <Chip
              key={group.id}
              pressed={dayId === group.id}
              onClick={() => setDayId(dayId === group.id ? null : group.id)}
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
                onClick={() => setSetup(pressed ? null : option.id)}
              >
                <span className="inline-flex items-center gap-1.5">
                  {option.label} <Count value={count} active={pressed} />
                </span>
              </Chip>
            );
          })}
        </div>

        <section className="mt-4 grid gap-5 lg:grid-cols-12">
          <div className="flex flex-col justify-between bg-primary p-6 text-primary-foreground ring-1 ring-board lg:col-span-7">
            <div>
              <p className="type-kicker text-primary-foreground/90">
                {LAUNCH_CITY} markets and the stalls that set up there
              </p>
              <h1 className="mt-1 text-primary-foreground">{LAUNCH_CITY} farmers&apos; markets</h1>
              <p className="type-lede mt-2 max-w-2xl text-primary-foreground/95">
                Choose a day or a place, then stay with the markets and their stalls. A specialty
                narrows who is selling. Open a product guide when you want every listing of one food.
              </p>
              <div className="mt-4">
                <SearchField
                  value={q}
                  onChange={setQ}
                  size="panel"
                  aria-label={SEARCH_LABEL}
                  placeholder="Market, stall, neighbourhood, or honey"
                />
              </div>
              {guide ? (
                <p className="mt-3 text-sm text-primary-foreground">
                  <Link href={`/find/${guide.slug}`} className="font-medium underline">
                    Open the {guide.term} guide
                  </Link>
                  <span className="text-primary-foreground/80"> · every stall that lists it</span>
                </p>
              ) : null}
            </div>
            <div className="mt-6 border-t border-primary-foreground/15 pt-4">
              <div className="grid grid-cols-3 gap-3">
                <Census value={rows.length} label="Markets in view" />
                <Census value={stallSlugs.size} label="Stalls in view" />
                <Census value={placeNames.size} label="Places in view" />
              </div>
            </div>
          </div>

          {selected ? (
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

        <section className="mt-5 bg-card p-4 ring-1 ring-board sm:p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">Places</span>
            <Chip pressed={area == null} onClick={() => setArea(null)}>
              All places
            </Chip>
            {shownPlaces.map((circuit) => {
              const pressed = area === circuit.label;
              const count = optionCount({ area: circuit.label });
              if (!pressed && count === 0) return null;
              return (
                <Chip
                  key={circuit.label}
                  pressed={pressed}
                  onClick={() => setArea(pressed ? null : circuit.label)}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {circuit.label} <Count value={count} active={pressed} />
                  </span>
                </Chip>
              );
            })}
            {area && !placeChoices.some((circuit) => circuit.label === area) ? (
              <Chip pressed onClick={() => setArea(null)}>
                {area}
              </Chip>
            ) : null}
            {placeChoices.length > PAGE ? (
              <button type="button" onClick={() => setMorePlaces((value) => !value)} className={chipIdle}>
                {morePlaces ? "Fewer places" : `More places (${placeChoices.length - PAGE})`}
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
                onClick={() => setFacet(item.id)}
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
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2>Markets and stalls</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {rows.length} {rows.length === 1 ? "market" : "markets"}
                {selected ? ` · ${selected.market.name}` : ""}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Sort markets">
              {(
                [
                  ["soonest", "Soonest"],
                  ["stalls", "Most stalls"],
                  ["name", "Name"],
                ] as const
              ).map(([id, label]) => (
                <Chip key={id} pressed={sort === id} onClick={() => setSort(id)}>
                  {label}
                </Chip>
              ))}
            </div>
          </div>

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
                key={[q, dayId, area, setup, category, cuisine, diet, made, sort].join("|")}
                rows={rows}
                selectedSlug={selected?.market.slug ?? ""}
                onSelect={setSelectedSlug}
                onPlace={setArea}
              />
              {selected ? (
                <StallColumn
                  key={`${selected.market.slug}|${q}|${category}|${cuisine}|${diet}|${made}`}
                  row={selected}
                  focusCategory={category}
                  onCategory={(id) => {
                    setFacet("sell");
                    setCategory(id);
                  }}
                />
              ) : null}
            </div>
          )}
        </section>
      </div>
    </div>
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
      <div className="flex items-center justify-between gap-2 border-t border-border bg-receipt px-5 py-3">
        <button
          type="button"
          onClick={onPrevious}
          disabled={!canStep}
          aria-label="Previous market"
          className="stall-chip-sm inline-flex size-9 cursor-pointer items-center justify-center bg-card ring-1 ring-border hover:bg-secondary disabled:cursor-default disabled:opacity-40"
        >
          <CaretLeftMark className="size-4" />
        </button>
        <Link href={`/markets/${market.slug}`} className="text-sm font-medium text-primary hover:underline">
          Open market
        </Link>
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
    <div className="bg-card ring-1 ring-board lg:col-span-5">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <RulesMark className="size-4 text-primary" />
          <h3>Markets</h3>
        </div>
        <span className="type-nums text-sm text-muted-foreground">{rows.length}</span>
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
                          {row.stallCount === 1 ? "stall" : "stalls"}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onPlace(row.market.neighbourhood)}
                    className="mt-0.5 cursor-pointer text-left text-sm text-muted-foreground hover:underline"
                  >
                    {row.market.neighbourhood}
                  </button>
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
    <div id="market-stalls" className="bg-card ring-1 ring-board lg:col-span-7">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <CrateMark className="size-4 text-primary" />
          <h3>Stalls</h3>
        </div>
        <span className="text-sm text-muted-foreground">
          <span className="type-nums">{stalls.length}</span>
          {stalls.length < row.market.vendorCount ? (
            <>
              {" "}
              of <span className="type-nums">{row.market.vendorCount}</span>
            </>
          ) : null}{" "}
          {stalls.length === 1 ? "stall" : "stalls"}
        </span>
      </div>
      {localOptions.length > 1 ? (
        <div className="flex flex-wrap items-center gap-1.5 border-b border-border px-4 py-3">
          <Chip pressed={localCategory == null} onClick={() => setLocalCategory(null)}>
            All stalls here
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
        <p className="px-4 py-6 text-base">No stalls at this market match.</p>
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
            Show more stalls ({stalls.length - limit})
          </button>
        </div>
      ) : null}
    </div>
  );
}
