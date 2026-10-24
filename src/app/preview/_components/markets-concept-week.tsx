"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MarketsPreviewData } from "@/app/preview/_lib/markets-preview-data";
import {
  AtlasMarketCard,
  AtlasVendorDirectoryCard,
  ProductThumb,
  SessionLines,
  StallEmblem,
  formatCensus,
  neighbourhoodOptions,
} from "@/app/preview/_components/markets-concept-shared";
import { AddressLink } from "@/components/address-link";
import { BrowseLinks } from "@/components/browse-links";
import { useGeo } from "@/components/geo-provider";
import { Hours } from "@/components/hours";
import { ListingScore } from "@/components/listing-score";
import { MarketMapLazy } from "@/components/market-map-lazy";
import {
  BlocksMark,
  CaretRightMark,
  CrateMark,
  PlateMark,
  RulesMark,
  SearchMark,
  SlatsMark,
  WeekMark,
} from "@/components/marks";
import { NowLabel } from "@/components/now-label";
import { ProductPhotoFrame } from "@/components/product-photo-frame";
import { SaveButton } from "@/components/save-button";
import { VerifiedName } from "@/components/verified-stamp";
import { SEARCH_PLACEHOLDER } from "@/lib/constants";
import { marketsHref } from "@/lib/find-paths";
import { formatPrice } from "@/lib/format";
import { LAUNCH_CITY } from "@/lib/launch";
import { cn } from "@/lib/utils";

type SortId = "soonest" | "stalls" | "reviewed" | "name";
type ViewMode = "cards" | "rows";
const MARKET_PAGE = 8;
const VENDOR_PAGE = 4;

/**
 * Concept 1 — The Markets, Stalls & Products Atlas
 * Direct counterpart to `ProductsAtlas` and `VendorAtlas`:
 * - Top status & quick-filter bar
 * - Above-the-fold Dual-Plate Masthead (7-col forest-green search & census plate + 5-col live/upcoming market spotlight plate)
 * - 12-column synchronized workspace (8-col rich Market Atlas cards + 4-col sticky Market Inspector & Matching Stalls directory)
 * - Bottom Neighbourhood Markets grid & BrowseLinks
 */
export function MarketsConceptWeek({
  data,
  clockMode = "saturday",
}: {
  data: MarketsPreviewData;
  clockMode?: "saturday" | "live";
}) {
  const router = useRouter();
  const { coords, requestAsync } = useGeo();
  const simulatedPeak = clockMode === "saturday";

  const [q, setQ] = useState("");
  const [dayFilter, setDayFilter] = useState<string>("all");
  const [areaFilter, setAreaFilter] = useState<string>("all");
  const [setupFilter, setSetupFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [openOnly, setOpenOnly] = useState<boolean>(false);
  const [sort, setSort] = useState<SortId>("soonest");
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [spotlightMode, setSpotlightMode] = useState<"photo" | "map">("photo");
  const [marketLimit, setMarketLimit] = useState<number>(MARKET_PAGE);
  const [vendorLimit, setVendorLimit] = useState<number>(VENDOR_PAGE);
  const [locating, setLocating] = useState<boolean>(false);
  const [inspectedSlug, setInspectedSlug] = useState<string>(
    () => data.enrichedMarkets[0]?.slug ?? "",
  );

  const areas = useMemo(() => neighbourhoodOptions(data), [data]);

  const filteredMarkets = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = data.enrichedMarkets.filter((m) => {
      const isOpen = m.open || (simulatedPeak && m.openSaturday);
      if (openOnly && !isOpen) return false;
      if (dayFilter === "saturday" && !m.openSaturday) return false;
      if (dayFilter === "sunday" && !m.dayNames.some((d) => d.startsWith("Sun"))) return false;
      if (
        dayFilter === "midweek" &&
        !m.dayNames.some((d) =>
          ["Mon", "Tue", "Wed", "Thu", "Fri"].some((prefix) => d.startsWith(prefix)),
        )
      ) {
        return false;
      }
      if (areaFilter !== "all" && m.neighbourhood.toLowerCase() !== areaFilter.toLowerCase()) {
        return false;
      }
      if (setupFilter === "Indoor" && m.indoor_outdoor !== "Indoor") return false;
      if (setupFilter === "Outdoor" && m.indoor_outdoor !== "Outdoor") return false;
      if (setupFilter === "year-round" && !m.tags.includes("year-round")) return false;
      if (
        categoryFilter !== "all" &&
        !m.topStalls.some((st) => st.categoryId === categoryFilter)
      ) {
        return false;
      }
      if (needle) {
        const hay = `${m.name} ${m.neighbourhood} ${m.city} ${m.address} ${m.tags.join(" ")} ${m.topStalls.map((s) => s.name).join(" ")}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      const aOpen = a.open || (simulatedPeak && a.openSaturday);
      const bOpen = b.open || (simulatedPeak && b.openSaturday);
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "stalls") return b.vendorCount - a.vendorCount || a.name.localeCompare(b.name);
      if (sort === "reviewed") {
        return (b.review_count ?? 0) - (a.review_count ?? 0) || a.name.localeCompare(b.name);
      }
      return (
        Number(bOpen) - Number(aOpen) ||
        (a.waitMinutes ?? Number.POSITIVE_INFINITY) - (b.waitMinutes ?? Number.POSITIVE_INFINITY) ||
        (b.review_count ?? 0) - (a.review_count ?? 0) ||
        a.name.localeCompare(b.name)
      );
    });
  }, [
    data.enrichedMarkets,
    q,
    dayFilter,
    areaFilter,
    setupFilter,
    categoryFilter,
    openOnly,
    sort,
    simulatedPeak,
  ]);

  const filteredVendors = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const matchingMarketSlugs = new Set(filteredMarkets.map((m) => m.slug));
    return data.vendorSpotlights.filter((v) => {
      if (categoryFilter !== "all" && !v.aisleIds.includes(categoryFilter)) return false;
      if (
        areaFilter !== "all" &&
        !v.markets.some((m) => m.neighbourhood.toLowerCase() === areaFilter.toLowerCase())
      ) {
        return false;
      }
      if (dayFilter !== "all" || setupFilter !== "all" || openOnly) {
        if (!v.markets.some((m) => matchingMarketSlugs.has(m.slug))) return false;
      }
      if (needle) {
        const hay = `${v.name} ${v.primaryAisleLabel} ${v.items.map((i) => i.name).join(" ")} ${v.markets.map((m) => m.name).join(" ")}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [
    data.vendorSpotlights,
    filteredMarkets,
    q,
    categoryFilter,
    areaFilter,
    dayFilter,
    setupFilter,
    openOnly,
  ]);

  const shownMarkets = filteredMarkets.slice(0, marketLimit);
  const shownVendors = filteredVendors.slice(0, vendorLimit);

  const inspectedMarket =
    filteredMarkets.find((m) => m.slug === inspectedSlug) ??
    data.enrichedMarkets.find((m) => m.slug === inspectedSlug) ??
    filteredMarkets[0] ??
    data.enrichedMarkets[0];

  const activeCategoryObj = data.aisles.find((a) => a.id === categoryFilter) ?? data.aisles[0];
  const openCount = simulatedPeak ? data.saturdayOpenCount : data.openNowSlots.length;

  const hasFilters =
    q.trim().length > 0 ||
    dayFilter !== "all" ||
    areaFilter !== "all" ||
    setupFilter !== "all" ||
    categoryFilter !== "all" ||
    openOnly;

  function resetAllFilters() {
    setQ("");
    setDayFilter("all");
    setAreaFilter("all");
    setSetupFilter("all");
    setCategoryFilter("all");
    setOpenOnly(false);
    setMarketLimit(MARKET_PAGE);
    setVendorLimit(VENDOR_PAGE);
  }

  async function handleNearMe() {
    if (locating) return;
    setLocating(true);
    const here = coords ?? (await requestAsync());
    setLocating(false);
    if (!here) return;
    router.push(
      marketsHref({
        q: q.trim() || undefined,
        lat: String(here.lat),
        lng: String(here.lng),
        sort: "near",
      }),
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-7 sm:px-6">
      {/* Top Status & Quick-Jump Bar (Exact sibling to ProductsAtlas & VendorAtlas) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { id: "all", label: "All markets" },
              { id: "saturday", label: `Saturday (${data.saturdayOpenCount})` },
              { id: "sunday", label: "Sunday" },
              { id: "midweek", label: "Midweek" },
            ] as const
          ).map((tab) => {
            const active = dayFilter === tab.id && !openOnly;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setDayFilter(tab.id);
                  setOpenOnly(false);
                  setMarketLimit(MARKET_PAGE);
                }}
                className={cn(
                  "stall-chip-sm inline-flex cursor-pointer items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-foreground ring-1 ring-border hover:bg-secondary",
                )}
              >
                <WeekMark
                  className={cn(
                    "size-3.5",
                    active ? "text-primary-foreground" : "text-primary",
                  )}
                />
                <span>{tab.label}</span>
              </button>
            );
          })}

          {(["Indoor", "Outdoor", "year-round"] as const).map((setup) => {
            const active = setupFilter === setup;
            const label = setup === "year-round" ? "Year-round" : setup;
            return (
              <button
                key={setup}
                type="button"
                onClick={() => {
                  setSetupFilter(active ? "all" : setup);
                  setMarketLimit(MARKET_PAGE);
                }}
                className={cn(
                  "stall-chip-sm inline-flex cursor-pointer items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-board text-chalk"
                    : "bg-card text-foreground ring-1 ring-border hover:bg-secondary",
                )}
              >
                <BlocksMark
                  className={cn("size-3.5", active ? "text-chalk" : "text-primary")}
                />
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setOpenOnly((v) => !v)}
            className={cn(
              "stall-chip-sm inline-flex cursor-pointer items-center gap-1.5 px-3 py-1 text-sm font-medium transition-colors",
              openOnly || openCount > 0
                ? "bg-stamp text-chalk"
                : "bg-card text-foreground ring-1 ring-border",
            )}
          >
            <WeekMark className="size-3.5 text-chalk" />
            <span>
              {openCount > 0
                ? `${openCount} ${openCount === 1 ? "market open" : "markets open"}${simulatedPeak ? " (Sat peak)" : " now"}`
                : "Filter open now"}
            </span>
          </button>
          <Link
            href="/products"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            <span>Browse by product</span>
            <CaretRightMark className="size-3.5" />
          </Link>
        </div>
      </div>

      {/* Above-the-Fold Dual-Plate Masthead (7-Col Forest-Green Plate + 5-Col Spotlight Plate) */}
      <section className="mt-4 grid gap-5 lg:grid-cols-12">
        {/* Left 7 Cols: Forest-Green Search, Filter & Census Plate */}
        <div className="flex flex-col justify-between bg-primary p-6 text-primary-foreground ring-1 ring-board lg:col-span-7">
          <div>
            <p className="type-kicker text-primary-foreground/90">
              {LAUNCH_CITY} &amp; Ontario directory · Weekly hours, maps &amp; stall rosters
            </p>
            <h1 className="mt-1 text-primary-foreground">
              {areaFilter !== "all"
                ? `${areaFilter} farmers' markets`
                : `${LAUNCH_CITY} farmers' markets`}
            </h1>
            <p className="type-lede mt-2 max-w-2xl text-primary-foreground/95">
              Every market across {LAUNCH_CITY} and the GTA — with this week&apos;s hours,
              street addresses, indoor or outdoor setup, and the{" "}
              {formatCensus(data.census.vendors)} stalls that sell there.
            </p>

            {/* Joined Search Bar on Plate */}
            <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:items-stretch">
              <label className="flex min-w-0 flex-1 items-center gap-2.5 rounded-[2px] border border-black/20 bg-receipt px-3.5 py-2.5 text-foreground shadow-[inset_0_1px_0_#fff] focus-within:ring-2 focus-within:ring-chalk">
                <SearchMark className="size-4 shrink-0 text-muted-foreground" />
                <span className="sr-only">Search markets and vendors</span>
                <input
                  type="search"
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setMarketLimit(MARKET_PAGE);
                  }}
                  placeholder={SEARCH_PLACEHOLDER}
                  className="h-9 w-full bg-transparent text-base text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
              </label>

              <button
                type="button"
                onClick={() => void handleNearMe()}
                className="stall-chip-sm inline-flex h-14 shrink-0 cursor-pointer items-center justify-center bg-primary-foreground/15 px-4 text-sm font-medium text-primary-foreground ring-1 ring-primary-foreground/25 hover:bg-receipt hover:text-primary"
              >
                {locating ? "Locating…" : "Near me"}
              </button>

              <a
                href="#directory-markets"
                className="find-go stall-chip inline-flex h-14 shrink-0 cursor-pointer items-center justify-center px-5 text-base font-medium text-receipt hover:brightness-110"
              >
                Show {filteredMarkets.length}
              </a>
            </div>

            {/* Visual Product Category Chips on Plate */}
            <div className="mt-3.5 flex flex-wrap items-center gap-1.5 text-sm">
              <span className="mr-1 font-medium text-primary-foreground/85">
                Filter by what stalls sell:
              </span>
              <button
                type="button"
                onClick={() => {
                  setCategoryFilter("all");
                  setMarketLimit(MARKET_PAGE);
                }}
                className={cn(
                  "stall-chip-sm inline-flex cursor-pointer items-center px-2.5 py-1 text-sm font-medium transition-colors",
                  categoryFilter === "all"
                    ? "bg-receipt text-primary"
                    : "bg-primary-foreground/15 text-primary-foreground hover:bg-receipt hover:text-primary",
                )}
              >
                All categories
              </button>
              {data.aisles.slice(0, 6).map((cat) => {
                const active = categoryFilter === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setCategoryFilter(active ? "all" : cat.id);
                      setMarketLimit(MARKET_PAGE);
                    }}
                    className={cn(
                      "stall-chip-sm inline-flex cursor-pointer items-center gap-1.5 py-1 pr-2.5 pl-1.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-receipt text-primary"
                        : "bg-primary-foreground/15 text-primary-foreground hover:bg-receipt hover:text-primary",
                    )}
                  >
                    <ProductThumb src={cat.photoUrl} size="xs" />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Place & Day Dropdown Controls on Plate */}
            <div className="mt-4 flex flex-wrap items-end gap-x-4 gap-y-3 border-t border-primary-foreground/15 pt-3.5">
              <label className="grid w-full gap-1 text-sm font-medium text-primary-foreground/90 sm:w-auto">
                <span>Neighbourhood or city</span>
                <select
                  aria-label="Neighbourhood or city"
                  value={areaFilter}
                  onChange={(e) => {
                    setAreaFilter(e.target.value);
                    setMarketLimit(MARKET_PAGE);
                  }}
                  className="h-9 min-w-[11rem] rounded bg-receipt px-2.5 text-sm font-medium text-foreground ring-1 ring-black/15"
                >
                  <option value="all">Anywhere in Toronto &amp; GTA</option>
                  {areas.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid w-full gap-1 text-sm font-medium text-primary-foreground/90 sm:w-auto">
                <span>When</span>
                <select
                  aria-label="When"
                  value={dayFilter}
                  onChange={(e) => {
                    setDayFilter(e.target.value);
                    setMarketLimit(MARKET_PAGE);
                  }}
                  className="h-9 min-w-[10rem] rounded bg-receipt px-2.5 text-sm font-medium text-foreground ring-1 ring-black/15"
                >
                  <option value="all">Any day of the week</option>
                  <option value="saturday">Saturday ({data.saturdayOpenCount} markets)</option>
                  <option value="sunday">Sunday</option>
                  <option value="midweek">Monday – Friday</option>
                </select>
              </label>

              <label className="flex h-9 cursor-pointer items-center gap-2 rounded bg-primary-foreground/15 px-3 text-sm font-medium text-primary-foreground ring-1 ring-primary-foreground/25">
                <input
                  type="checkbox"
                  checked={openOnly}
                  onChange={(e) => {
                    setOpenOnly(e.target.checked);
                    setMarketLimit(MARKET_PAGE);
                  }}
                  className="accent-stamp"
                />
                <span>Open now</span>
              </label>

              {hasFilters ? (
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="h-9 cursor-pointer px-2 text-sm font-medium text-primary-foreground underline underline-offset-4 hover:text-white"
                >
                  Reset filters
                </button>
              ) : null}
            </div>
          </div>

          {/* 3-Stamp Directory Census Strip */}
          <div className="mt-6 border-t border-primary-foreground/15 pt-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-primary-foreground/12 px-3.5 py-2.5">
                <p className="type-census text-2xl text-primary-foreground sm:text-3xl">
                  {formatCensus(data.census.markets)}
                </p>
                <p className="text-sm text-primary-foreground/85">Toronto markets</p>
              </div>
              <div className="rounded-lg bg-primary-foreground/12 px-3.5 py-2.5">
                <p className="type-census text-2xl text-primary-foreground sm:text-3xl">
                  {formatCensus(data.census.vendors)}
                </p>
                <p className="text-sm text-primary-foreground/85">Market stalls</p>
              </div>
              <div className="rounded-lg bg-primary-foreground/12 px-3.5 py-2.5">
                <p className="type-census text-2xl text-primary-foreground sm:text-3xl">
                  {formatCensus(data.census.menus)}
                </p>
                <p className="text-sm text-primary-foreground/85">Menu items</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right 5 Cols: Active Market & Map Spotlight Plate */}
        <div className="flex flex-col justify-between bg-card ring-1 ring-board lg:col-span-5">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-receipt px-5 py-3">
              <div className="flex items-center gap-2">
                <PlateMark className="size-4 text-primary" />
                <p className="type-kicker font-medium text-foreground">
                  {inspectedMarket ? inspectedMarket.neighbourhood : "Market spotlight"}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setSpotlightMode("photo")}
                  className={cn(
                    "stall-chip-sm cursor-pointer px-2.5 py-0.5 text-sm font-medium",
                    spotlightMode === "photo"
                      ? "bg-stamp text-chalk"
                      : "bg-card text-foreground ring-1 ring-border",
                  )}
                >
                  Spotlight
                </button>
                <button
                  type="button"
                  onClick={() => setSpotlightMode("map")}
                  className={cn(
                    "stall-chip-sm cursor-pointer px-2.5 py-0.5 text-sm font-medium",
                    spotlightMode === "map"
                      ? "bg-stamp text-chalk"
                      : "bg-card text-foreground ring-1 ring-border",
                  )}
                >
                  Live map ({filteredMarkets.length})
                </button>
              </div>
            </div>

            <div className="p-5">
              {spotlightMode === "map" ? (
                <MarketMapLazy
                  markets={filteredMarkets}
                  load="visible"
                  className="aspect-[16/9] w-full border border-border"
                />
              ) : (
                <ProductPhotoFrame
                  name={
                    inspectedMarket?.primaryCategoryLabel ??
                    activeCategoryObj?.label ??
                    "Toronto farmers' markets"
                  }
                  photo={
                    inspectedMarket?.bannerPhotoUrl
                      ? {
                          url: inspectedMarket.bannerPhotoUrl,
                          alt: inspectedMarket.bannerPhotoAlt,
                        }
                      : activeCategoryObj?.photoUrl
                        ? {
                            url: activeCategoryObj.photoUrl,
                            alt: activeCategoryObj.photoAlt ?? activeCategoryObj.label,
                          }
                        : null
                  }
                  className="aspect-[16/9] w-full border border-border"
                />
              )}

              {/* Inset-Accent Receipt Box (Signature of VendorAtlas & ProductsAtlas) */}
              {inspectedMarket ? (
                <div className="mt-4 bg-receipt p-3.5 ring-1 ring-border shadow-[inset_3px_0_0_var(--primary)]">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3">
                    <div className="flex min-w-0 items-start gap-2.5">
                      <StallEmblem
                        src={inspectedMarket.logo_url}
                        name={inspectedMarket.name}
                        kind="market"
                        size="sm"
                        tone="paper"
                        className="mt-0.5"
                      />
                      <div className="min-w-0">
                        <p className="type-kicker text-primary">
                          Selected market · {inspectedMarket.vendorCount} stalls
                        </p>
                        <Link
                          href={`/markets/${inspectedMarket.slug}`}
                          className="mt-0.5 block text-base font-medium text-foreground hover:text-primary hover:underline"
                        >
                          {inspectedMarket.name}
                        </Link>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {inspectedMarket.neighbourhood}
                          {inspectedMarket.indoor_outdoor
                            ? ` · ${inspectedMarket.indoor_outdoor}`
                            : ""}
                        </p>
                      </div>
                    </div>
                    <SessionLines
                      sessions={inspectedMarket.sessions.slice(0, 2)}
                      fallback={inspectedMarket.nextOpen}
                    />
                  </div>

                  {inspectedMarket.topStalls.length > 0 ? (
                    <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-dashed border-border pt-2.5">
                      <span className="mr-1 text-sm text-muted-foreground">Stalls here:</span>
                      {inspectedMarket.topStalls.slice(0, 3).map((st) => (
                        <Link
                          key={st.slug}
                          href={`/vendors/${st.slug}`}
                          className="stall-chip-sm inline-flex items-center gap-1.5 bg-card py-0.5 pr-2 pl-1 text-sm font-medium text-foreground ring-1 ring-border hover:bg-primary hover:text-primary-foreground"
                        >
                          <StallEmblem src={st.logoUrl} name={st.name} kind="vendor" size="xs" />
                          <span>{st.name}</span>
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-receipt px-5 py-3 text-sm">
            <span className="font-medium text-muted-foreground">
              Showing {filteredMarkets.length} markets &amp; {filteredVendors.length} featured stalls
            </span>
            <div className="flex items-center gap-3">
              <a
                href="#directory-markets"
                className="font-medium text-primary hover:underline"
              >
                Markets ↓
              </a>
              <a
                href="#directory-vendors"
                className="font-medium text-primary hover:underline"
              >
                Stalls ↓
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Main 12-Column Directory Workspace: 8-Col Markets Atlas + 4-Col Sticky Inspector & Stalls Rail */}
      <div className="mt-8 grid gap-8 lg:grid-cols-12 lg:items-start">
        {/* Left 8 Columns: Filterable Markets Directory */}
        <section
          id="directory-markets"
          aria-label="Markets directory"
          className="scroll-mt-header flex flex-col gap-5 lg:col-span-8"
        >
          {/* Section Control Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-card px-5 py-3.5 ring-1 ring-board">
            <div className="flex items-center gap-3">
              <span className="stall-chip-sm flex size-9 shrink-0 items-center justify-center bg-primary text-primary-foreground">
                <SlatsMark className="size-5" />
              </span>
              <div>
                <p className="type-kicker text-primary">
                  {filteredMarkets.length}{" "}
                  {filteredMarkets.length === 1 ? "market" : "markets"} · Unclipped weekly hours
                </p>
                <h2>Markets &amp; hours</h2>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <label className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                <span>Sort:</span>
                <select
                  aria-label="Sort markets"
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortId)}
                  className="cursor-pointer rounded bg-receipt px-2.5 py-1.5 text-sm font-medium text-foreground ring-1 ring-border"
                >
                  <option value="soonest">Opening soonest</option>
                  <option value="stalls">Most stalls</option>
                  <option value="reviewed">Most reviewed</option>
                  <option value="name">Name A–Z</option>
                </select>
              </label>

              <div className="flex items-center rounded bg-secondary p-0.5 ring-1 ring-border">
                <button
                  type="button"
                  onClick={() => setViewMode("cards")}
                  className={cn(
                    "cursor-pointer rounded px-2.5 py-1 text-sm font-medium transition-colors",
                    viewMode === "cards"
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground hover:bg-card",
                  )}
                >
                  Atlas cards
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("rows")}
                  className={cn(
                    "cursor-pointer rounded px-2.5 py-1 text-sm font-medium transition-colors",
                    viewMode === "rows"
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground hover:bg-card",
                  )}
                >
                  Compact rows
                </button>
              </div>
            </div>
          </div>

          {shownMarkets.length === 0 ? (
            <div className="bg-card p-6 text-center ring-1 ring-board">
              <p className="text-base font-medium text-foreground">
                No markets match that filter combination.
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Reset filters to browse all {formatCensus(data.census.markets)} markets across{" "}
                {LAUNCH_CITY} and Ontario.
              </p>
              <button
                type="button"
                onClick={resetAllFilters}
                className="stall-chip-sm mt-4 cursor-pointer bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Show all {formatCensus(data.census.markets)} markets
              </button>
            </div>
          ) : viewMode === "cards" ? (
            <ul className="grid gap-5 md:grid-cols-2">
              {shownMarkets.map((market) => (
                <AtlasMarketCard
                  key={market.id}
                  market={market}
                  simulatedPeak={simulatedPeak}
                  selected={inspectedMarket?.slug === market.slug}
                  onInspect={(slug) => setInspectedSlug(slug)}
                  onSelectNeighbourhood={(area) => {
                    setAreaFilter(areaFilter === area ? "all" : area);
                    setMarketLimit(MARKET_PAGE);
                  }}
                />
              ))}
            </ul>
          ) : (
            <ul className="divide-y divide-border bg-card ring-1 ring-board">
              {shownMarkets.map((market) => {
                const isOpen = market.open || (simulatedPeak && market.openSaturday);
                return (
                  <li
                    key={market.id}
                    className={cn(
                      "p-4 transition-colors hover:bg-secondary/35 sm:px-5",
                      inspectedMarket?.slug === market.slug && "bg-secondary/50",
                    )}
                  >
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <StallEmblem
                          src={market.logo_url}
                          name={market.name}
                          kind="market"
                          size="md"
                          className="mt-0.5"
                        />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-baseline gap-x-2">
                            <Link
                              href={`/markets/${market.slug}`}
                              className="text-base font-medium text-foreground hover:text-primary hover:underline"
                            >
                              <VerifiedName slug={market.slug} name={market.name} />
                            </Link>
                            <ListingScore
                              parens
                              ratingAvg={market.rating_avg}
                              reviewCount={market.review_count}
                              className="text-sm text-stamp"
                            />
                          </div>
                          <p className="mt-0.5 text-sm text-muted-foreground">
                            {market.neighbourhood}
                            {market.indoor_outdoor ? ` · ${market.indoor_outdoor}` : ""} ·{" "}
                            <AddressLink
                              address={market.address}
                              city={market.city}
                              province={market.province}
                              lat={market.lat}
                              lng={market.lng}
                            />
                          </p>
                          {market.topStalls.length > 0 ? (
                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                              <span className="text-sm text-muted-foreground">Stalls:</span>
                              {market.topStalls.slice(0, 3).map((st) => (
                                <Link
                                  key={st.slug}
                                  href={`/vendors/${st.slug}`}
                                  className="stall-chip-sm inline-flex items-center gap-1 bg-receipt px-2 py-0.5 text-sm font-medium text-foreground ring-1 ring-border hover:bg-primary hover:text-primary-foreground"
                                >
                                  <span>{st.name}</span>
                                </Link>
                              ))}
                              <button
                                type="button"
                                onClick={() => setInspectedSlug(market.slug)}
                                className="cursor-pointer text-sm font-medium text-primary hover:underline"
                              >
                                Inspect {market.vendorCount} stalls →
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex shrink-0 items-start gap-3">
                        <div className="text-right">
                          {isOpen ? (
                            <NowLabel>Open now</NowLabel>
                          ) : (
                            <span className="type-nums text-sm font-medium text-foreground">
                              {market.nextOpen}
                            </span>
                          )}
                          <SessionLines sessions={market.sessions} />
                        </div>
                        <SaveButton kind="market" slug={market.slug} name={market.name} size="sm" />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {filteredMarkets.length > shownMarkets.length ? (
            <div className="flex items-center justify-between bg-card px-5 py-3.5 ring-1 ring-board">
              <span className="type-nums text-sm text-muted-foreground">
                Showing {shownMarkets.length} of {filteredMarkets.length} markets
              </span>
              <button
                type="button"
                onClick={() => setMarketLimit((prev) => prev + MARKET_PAGE)}
                className="stall-chip-sm cursor-pointer bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Show more markets ({filteredMarkets.length - shownMarkets.length} remaining)
              </button>
            </div>
          ) : null}
        </section>

        {/* Right 4 Columns: Sticky Market Inspector + Matching Vendors Rail */}
        <aside className="flex flex-col gap-6 lg:sticky lg:top-20 lg:col-span-4">
          {/* 1. Selected Market Roster & Hours Inspector (Mirrors VendorAtlas Where They Sell Rail) */}
          {inspectedMarket ? (
            <div className="bg-card ring-1 ring-board">
              <div className="flex items-center justify-between gap-2 border-b border-black/15 bg-primary px-5 py-3.5 text-primary-foreground">
                <div className="flex items-center gap-2">
                  <BlocksMark className="size-4 text-primary-foreground" />
                  <h2 className="text-xl text-primary-foreground">Market inspector</h2>
                </div>
                <span className="stall-chip-sm type-nums bg-board/80 px-2.5 py-0.5 text-sm font-medium text-chalk">
                  {inspectedMarket.vendorCount}{" "}
                  {inspectedMarket.vendorCount === 1 ? "stall" : "stalls"}
                </span>
              </div>

              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <StallEmblem
                      src={inspectedMarket.logo_url}
                      name={inspectedMarket.name}
                      kind="market"
                      size="md"
                      tone="paper"
                    />
                    <div className="min-w-0">
                      <Link
                        href={`/markets/${inspectedMarket.slug}`}
                        className="text-base font-medium text-foreground hover:text-primary hover:underline"
                      >
                        <VerifiedName slug={inspectedMarket.slug} name={inspectedMarket.name} />
                      </Link>
                      <ListingScore
                        className="mt-0.5 text-sm"
                        ratingAvg={inspectedMarket.rating_avg}
                        reviewCount={inspectedMarket.review_count}
                      />
                      <p className="mt-1 text-sm text-muted-foreground">
                        <AddressLink
                          address={inspectedMarket.address}
                          city={inspectedMarket.city}
                          province={inspectedMarket.province}
                          lat={inspectedMarket.lat}
                          lng={inspectedMarket.lng}
                        />
                      </p>
                    </div>
                  </div>
                  <SaveButton
                    kind="market"
                    slug={inspectedMarket.slug}
                    name={inspectedMarket.name}
                    size="sm"
                  />
                </div>

                <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 border-t border-dashed border-border pt-3">
                  <span className="text-sm font-medium text-muted-foreground">Weekly hours</span>
                  <SessionLines
                    sessions={inspectedMarket.sessions}
                    fallback={inspectedMarket.nextOpen}
                  />
                </div>

                {inspectedMarket.topStalls.length > 0 ? (
                  <div className="mt-4 border-t border-dashed border-border pt-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">
                        Stalls at {inspectedMarket.name}
                      </p>
                      <Link
                        href={`/markets/${inspectedMarket.slug}#vendors`}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        All {inspectedMarket.vendorCount} →
                      </Link>
                    </div>
                    <ul className="mt-2.5 divide-y divide-dashed divide-border">
                      {inspectedMarket.topStalls.slice(0, 5).map((st) => {
                        const price = formatPrice(st.priceCents);
                        return (
                          <li
                            key={st.slug}
                            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 py-2"
                          >
                            <div className="flex min-w-0 items-center gap-2.5">
                              <StallEmblem
                                src={st.logoUrl}
                                name={st.name}
                                kind="vendor"
                                size="sm"
                                tone="paper"
                              />
                              <div className="min-w-0">
                                <Link
                                  href={`/vendors/${st.slug}`}
                                  className="block text-sm font-medium text-foreground hover:text-primary hover:underline"
                                >
                                  {st.name}
                                </Link>
                                <p className="text-sm text-muted-foreground">
                                  {st.itemName}
                                  {price ? ` · ${price}` : ""}
                                </p>
                              </div>
                            </div>
                            <Link
                              href={`/vendors/${st.slug}`}
                              className="rounded bg-receipt px-2.5 py-1 text-sm font-medium text-foreground ring-1 ring-border hover:bg-secondary"
                            >
                              Visit
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : null}

                <div className="mt-4 border-t border-border pt-3.5">
                  <Link
                    href={`/markets/${inspectedMarket.slug}`}
                    className="stall-chip-sm flex w-full items-center justify-center gap-1.5 bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    <span>Open {inspectedMarket.name}</span>
                    <CaretRightMark className="size-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          ) : null}

          {/* 2. Matching Vendors Directory (#directory-vendors) */}
          <section
            id="directory-vendors"
            aria-label="Matching stalls directory"
            className="scroll-mt-header bg-card ring-1 ring-board"
          >
            <div className="flex items-center justify-between gap-2 border-b border-black/15 bg-primary px-5 py-3.5 text-primary-foreground">
              <div className="flex items-center gap-2">
                <CrateMark className="size-4 text-primary-foreground" />
                <h2 className="text-xl text-primary-foreground">Featured stalls</h2>
              </div>
              <span className="stall-chip-sm type-nums bg-board/80 px-2.5 py-0.5 text-sm font-medium text-chalk">
                {filteredVendors.length}
              </span>
            </div>

            <div className="p-4">
              {shownVendors.length > 0 ? (
                <ul className="flex flex-col gap-3.5">
                  {shownVendors.map((vendor) => (
                    <AtlasVendorDirectoryCard
                      key={vendor.id}
                      vendor={vendor}
                      simulatedPeak={simulatedPeak}
                    />
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No featured stalls match those filters.
                </p>
              )}

              {filteredVendors.length > shownVendors.length ? (
                <button
                  type="button"
                  onClick={() => setVendorLimit((prev) => prev + VENDOR_PAGE)}
                  className="mt-3.5 w-full cursor-pointer rounded bg-secondary px-3 py-2 text-sm font-medium text-foreground ring-1 ring-border hover:bg-secondary/80"
                >
                  Show more stalls ({filteredVendors.length - shownVendors.length} more)
                </button>
              ) : null}
            </div>
          </section>
        </aside>
      </div>

      {/* Bottom Discovery Spread: Neighbourhood Markets Grid + BrowseLinks */}
      <section
        aria-label="Neighbourhood markets"
        className="mt-10 bg-card p-5 ring-1 ring-board sm:p-6"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <span className="stall-chip-sm flex size-9 shrink-0 items-center justify-center bg-board text-chalk">
              <RulesMark className="size-5" />
            </span>
            <div>
              <p className="type-kicker text-primary">Markets by neighbourhood</p>
              <h2 className="mt-0.5">Explore {LAUNCH_CITY} market districts</h2>
            </div>
          </div>
          <Link
            href="/products"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            <span>Compare all product categories</span>
            <CaretRightMark className="size-3.5" />
          </Link>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.neighbourhoodCircuits.slice(0, 6).map((areaCard) => (
            <div
              key={areaCard.label}
              className="flex flex-col justify-between bg-receipt p-4 ring-1 ring-border shadow-[inset_3px_0_0_var(--primary)]"
            >
              <div>
                <div className="flex items-baseline justify-between gap-2">
                  <h3>
                    <button
                      type="button"
                      onClick={() => {
                        setAreaFilter(areaCard.label);
                        setMarketLimit(MARKET_PAGE);
                      }}
                      className="cursor-pointer text-left hover:text-primary hover:underline"
                    >
                      {areaCard.label}
                    </button>
                  </h3>
                  <span className="type-nums text-sm font-medium text-primary">
                    {areaCard.vendorCount} stalls
                  </span>
                </div>

                <ul className="mt-3 divide-y divide-dashed divide-border">
                  {areaCard.topMarkets.slice(0, 2).map((m) => (
                    <li
                      key={m.id}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 py-2 text-sm"
                    >
                      <Link
                        href={`/markets/${m.slug}`}
                        className="font-medium text-foreground hover:text-primary hover:underline"
                      >
                        {m.name}
                      </Link>
                      <Hours
                        value={m.hours || m.sessions[0]?.hours || "Schedule"}
                        className="text-muted-foreground"
                      />
                    </li>
                  ))}
                </ul>
              </div>

              {areaCard.topVendors.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border pt-2.5">
                  {areaCard.topVendors.slice(0, 2).map((v) => (
                    <Link
                      key={v.slug}
                      href={`/vendors/${v.slug}`}
                      className="inline-flex items-center gap-1.5 rounded bg-card px-2 py-0.5 text-sm font-medium text-foreground ring-1 ring-border hover:bg-secondary"
                    >
                      <StallEmblem src={v.logoUrl} name={v.name} kind="vendor" size="xs" />
                      <span>{v.name}</span>
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>

        <BrowseLinks className="mt-8" />
      </section>
    </div>
  );
}
