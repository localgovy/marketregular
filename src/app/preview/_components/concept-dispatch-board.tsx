"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { HomePreviewData } from "@/app/preview/_lib/home-preview-data";
import { AddressLink } from "@/components/address-link";
import { Hours } from "@/components/hours";
import { ListingScore } from "@/components/listing-score";
import {
  AsteriskMark,
  BlocksMark,
  CrateMark,
  MapleMark,
  PlateMark,
  RulesMark,
  SignMark,
  SlatsMark,
  TagMark,
  TallyMark,
  TicketMark,
  WeekMark,
} from "@/components/marks";
import { MarketMapLazy } from "@/components/market-map-lazy";
import { NowLabel } from "@/components/now-label";
import { ProductPhotoFrame } from "@/components/product-photo-frame";
import { ReviewCard } from "@/components/review-card";
import { SaveButton } from "@/components/save-button";
import { SavedRail } from "@/components/saved-rail";
import { SearchField } from "@/components/search-field";
import { VerifiedName } from "@/components/verified-stamp";
import { VendorTodayItem, VendorWeekItem } from "@/components/home-vendors-item";
import { SEARCH_LABEL } from "@/lib/constants";
import { marketsHref, tagLabel } from "@/lib/find-paths";
import { LAUNCH_CITY } from "@/lib/launch";
import { cn } from "@/lib/utils";

function formatCensus(n: number) {
  return n.toLocaleString("en-CA");
}

type WindowFilter =
  | "all"
  | "open"
  | "today"
  | "tomorrow"
  | "Sunday"
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday";
type WireTab = "today" | "week" | "notes";
type BoardLayout = "ledger" | "split-map";

const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export function ConceptDispatchBoard({
  data,
  standalone = false,
}: {
  data: HomePreviewData;
  standalone?: boolean;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [windowFilter, setWindowFilter] = useState<WindowFilter>("all");
  const [areaFilter, setAreaFilter] = useState<string | null>(null);
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [setupFilter, setSetupFilter] = useState<string | null>(null);
  const [boardLayout, setBoardLayout] = useState<BoardLayout>("ledger");
  const [wireTab, setWireTab] = useState<WireTab>("today");
  const [visibleCount, setVisibleCount] = useState(12);

  const tomorrowDayName = useMemo(() => {
    return WEEKDAY_NAMES[(data.todayWeekday + 1) % 7]!;
  }, [data.todayWeekday]);

  const todayDayName = useMemo(() => {
    return WEEKDAY_NAMES[data.todayWeekday]!;
  }, [data.todayWeekday]);

  const weekdayCounts = useMemo(() => {
    return WEEKDAY_NAMES.map((day) => ({
      day,
      count: data.directoryMarkets.filter((m) => m.dayNames.includes(day)).length,
    }));
  }, [data.directoryMarkets]);

  // Live client-side filtering of the 130 directory markets
  const filteredMarkets = useMemo(() => {
    const qLower = searchQuery.trim().toLowerCase();
    return data.directoryMarkets.filter((m) => {
      if (windowFilter === "open" && !m.open) return false;
      if (
        windowFilter === "today" &&
        !m.open &&
        !m.dayNames.includes(todayDayName)
      ) {
        return false;
      }
      if (windowFilter === "tomorrow" && !m.dayNames.includes(tomorrowDayName)) {
        return false;
      }
      if (
        WEEKDAY_NAMES.includes(windowFilter as (typeof WEEKDAY_NAMES)[number]) &&
        !m.dayNames.includes(windowFilter)
      ) {
        return false;
      }

      if (areaFilter) {
        const aLower = areaFilter.toLowerCase();
        const hay = `${m.name} ${m.neighbourhood} ${m.address}`.toLowerCase();
        if (!hay.includes(aLower)) return false;
      }

      if (tagFilter) {
        if (!m.tags.some((t) => t.toLowerCase() === tagFilter.toLowerCase())) {
          return false;
        }
      }

      if (setupFilter) {
        if ((m.indoor_outdoor ?? "").toLowerCase() !== setupFilter.toLowerCase()) {
          return false;
        }
      }

      if (qLower) {
        const hay = `${m.name} ${m.neighbourhood} ${m.address} ${m.tags.join(" ")}`.toLowerCase();
        if (!hay.includes(qLower)) return false;
      }

      return true;
    });
  }, [
    data.directoryMarkets,
    searchQuery,
    windowFilter,
    areaFilter,
    tagFilter,
    setupFilter,
    todayDayName,
    tomorrowDayName,
  ]);

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    windowFilter !== "all" ||
    Boolean(areaFilter) ||
    Boolean(tagFilter) ||
    Boolean(setupFilter);

  function resetAllFilters() {
    setSearchQuery("");
    setWindowFilter("all");
    setAreaFilter(null);
    setTagFilter(null);
    setSetupFilter(null);
    setVisibleCount(10);
  }

  const fullDirectoryHref = marketsHref({
    q: searchQuery.trim() || undefined,
    openNow: windowFilter === "open" || undefined,
    areas: areaFilter ? [areaFilter] : undefined,
    tags: tagFilter ? [tagFilter] : undefined,
  });

  return (
    <div className="bg-background text-foreground">
      {/* Architectural Chalkboard Command Masthead */}
      <section
        aria-label="Grand Hall Departure Console"
        className="border-b-2 border-board bg-board text-chalk"
      >
        <div className="awning-board h-[8px] w-full" aria-hidden />
        <div className="mx-auto max-w-7xl px-4 py-6 lg:px-6 lg:py-8">
          {/* Top Telemetry Strip */}
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-chalk/20 pb-4">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="inline-flex items-center gap-2 text-sm font-medium text-chalk">
                <MapleMark className="h-4 w-8 shrink-0 text-stamp shadow-[0_0_0_1px_rgba(0,0,0,0.28)]" />
                <span>Made by Canadians, for Canadians, to shop Canadian.</span>
              </span>
              <span aria-hidden className="hidden text-chalk/50 sm:inline">
                ·
              </span>
              <span className="type-nums text-sm text-chalk/80">
                {LAUNCH_CITY} dispatch board · {data.todayFormatted}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <span className="inline-flex items-center gap-1.5 text-chalk">
                <span className="size-2 rounded-full bg-stamp" aria-hidden />
                <span className="type-nums font-semibold">{data.openNowSlots.length}</span>
                <span>halls open now</span>
              </span>
              <span aria-hidden className="text-chalk/40">
                ·
              </span>
              <span className="text-chalk/85">
                <span className="type-nums font-semibold text-chalk">
                  {data.sellingToday.length}
                </span>{" "}
                stalls active today
              </span>
              <span aria-hidden className="text-chalk/40">
                ·
              </span>
              <Link href="/events" className="font-medium text-chalk underline underline-offset-4">
                Month calendar
              </Link>
            </div>
          </div>

          {/* Title + 4-Cell Telemetry Census */}
          <div className="mt-6 grid gap-6 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-7">
              <p className="type-kicker text-chalk/80">
                Live market schedule, stall index &amp; hall status
              </p>
              <h1 className="mt-1 text-chalk">{LAUNCH_CITY} farmers&apos; markets</h1>
              <p className="type-lede mt-2 max-w-2xl text-chalk/85">
                Filter all {formatCensus(data.census.markets)} {LAUNCH_CITY} market halls right on
                the board by day, neighbourhood, indoor/outdoor setup, or what the stalls sell.
              </p>
            </div>

            <div className="lg:col-span-5">
              <div className="grid grid-cols-3 divide-x divide-chalk/20 border border-chalk/25 bg-black/15">
                <Link
                  href="/markets"
                  className="flex flex-col justify-between p-3.5 transition-colors hover:bg-white/10"
                >
                  <span className="type-kicker text-chalk/75">Directory</span>
                  <span className="type-census mt-1 text-3xl leading-none text-chalk sm:text-4xl">
                    {formatCensus(data.census.markets)}
                  </span>
                  <span className="mt-1 text-sm font-medium text-chalk/90">markets</span>
                </Link>
                <Link
                  href="/markets#directory-vendors"
                  className="flex flex-col justify-between p-3.5 transition-colors hover:bg-white/10"
                >
                  <span className="type-kicker text-chalk/75">Registered</span>
                  <span className="type-census mt-1 text-3xl leading-none text-chalk sm:text-4xl">
                    {formatCensus(data.census.vendors)}
                  </span>
                  <span className="mt-1 text-sm font-medium text-chalk/90">vendors</span>
                </Link>
                <Link
                  href="/products"
                  className="flex flex-col justify-between p-3.5 transition-colors hover:bg-white/10"
                >
                  <span className="type-kicker text-chalk/75">Catalogue</span>
                  <span className="type-census mt-1 text-3xl leading-none text-chalk sm:text-4xl">
                    {formatCensus(data.census.menus)}
                  </span>
                  <span className="mt-1 text-sm font-medium text-chalk/90">menu items</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Live Board Control Deck (Instant Client-Side Filtering) */}
          <div className="mt-6 border border-chalk/25 bg-panel-find p-4 sm:p-5">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.8fr)_auto] lg:items-center">
              <div>
                <label className="sr-only" htmlFor="dispatch-board-search">
                  {SEARCH_LABEL}
                </label>
                <SearchField
                  id="dispatch-board-search"
                  value={searchQuery}
                  onChange={(val) => {
                    setSearchQuery(val);
                    setVisibleCount(14);
                  }}
                  placeholder="Filter board by hall, neighbourhood, or food…"
                />
              </div>

              {/* Time Window Switcher */}
              <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Time window">
                {(
                  [
                    { id: "all", label: `All halls (${data.census.markets})`, tone: "default" },
                    {
                      id: "open",
                      label: `Open now (${data.openNowSlots.length})`,
                      tone: "open",
                    },
                    { id: "today", label: `Today (${todayDayName})`, tone: "default" },
                    { id: "tomorrow", label: `Tomorrow (${tomorrowDayName})`, tone: "default" },
                    { id: "Saturday", label: "Saturdays", tone: "default" },
                  ] as const
                ).map((item) => {
                  const active = windowFilter === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => {
                        setWindowFilter(item.id);
                        setVisibleCount(10);
                      }}
                      className={cn(
                        "find-chip inline-flex h-10 cursor-pointer items-center justify-center border px-3 text-sm font-medium transition-colors",
                        active
                          ? item.tone === "open"
                            ? "border-chalk/50 bg-stamp text-chalk"
                            : "border-foreground/20 bg-card text-primary"
                          : "border-chalk/60 bg-chalk/10 text-chalk hover:bg-chalk/20",
                      )}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>

              {/* Board View Switcher */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setBoardLayout("ledger")}
                  className={cn(
                    "stall-chip-sm inline-flex h-10 cursor-pointer items-center gap-2 px-3.5 text-sm font-medium",
                    boardLayout === "ledger"
                      ? "bg-card text-primary"
                      : "bg-chalk/15 text-chalk hover:bg-chalk/25",
                  )}
                >
                  <RulesMark className="size-4" />
                  <span>Board</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBoardLayout("split-map")}
                  className={cn(
                    "stall-chip-sm inline-flex h-10 cursor-pointer items-center gap-2 px-3.5 text-sm font-medium",
                    boardLayout === "split-map"
                      ? "bg-card text-primary"
                      : "bg-chalk/15 text-chalk hover:bg-chalk/25",
                  )}
                >
                  <BlocksMark className="size-4" />
                  <span>Board + Map</span>
                </button>
              </div>
            </div>

            {/* Secondary Quick Filter Ribbons: Neighbourhoods + Setup + Products */}
            <div className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-chalk/20 pt-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="type-kicker mr-1 text-chalk/80">Area:</span>
                {data.areas.primary.slice(0, 8).map((area) => {
                  const active = areaFilter === area.q;
                  return (
                    <button
                      key={area.q}
                      type="button"
                      onClick={() => {
                        setAreaFilter(active ? null : area.q);
                        setVisibleCount(14);
                      }}
                      className={cn(
                        "stall-chip-sm cursor-pointer px-2.5 py-1 text-sm font-medium transition-colors",
                        active
                          ? "bg-card text-primary"
                          : "bg-chalk/12 text-chalk hover:bg-chalk/22",
                      )}
                    >
                      {area.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="type-kicker mr-1 text-chalk/80">Stalls:</span>
                {["produce", "bakery", "cheese", "meat", "coffee", "prepared-food", "organic"].map(
                  (tag) => {
                    const active = tagFilter === tag;
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          setTagFilter(active ? null : tag);
                          setVisibleCount(14);
                        }}
                        className={cn(
                          "stall-chip-sm cursor-pointer px-2.5 py-1 text-sm font-medium transition-colors",
                          active
                            ? "bg-card text-primary"
                            : "bg-chalk/12 text-chalk hover:bg-chalk/22",
                        )}
                      >
                        {tagLabel(tag)}
                      </button>
                    );
                  },
                )}
              </div>

              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="ml-auto cursor-pointer text-sm font-medium text-chalk underline underline-offset-4"
                >
                  Clear board filters
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area: 8-Col Live Departure Board + 4-Col Hall Wire & Saved Dock */}
      <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-start">
          {/* Left 8 Columns: The Split-Flap / Civic Departure Board Ledger */}
          <section aria-label="Market Departure Ledger" className="lg:col-span-8">
            <div className="bg-card ring-1 ring-board">
              {/* Board Header Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-board bg-secondary px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <span className="stall-chip-sm flex size-8 shrink-0 items-center justify-center bg-board text-chalk">
                    <WeekMark className="size-4" />
                  </span>
                  <div>
                    <p className="type-kicker text-muted-foreground">
                      Showing <span className="type-nums font-semibold text-foreground">{filteredMarkets.length}</span>{" "}
                      of <span className="type-nums">{data.census.markets}</span> {LAUNCH_CITY} markets
                    </p>
                    <h2>Live Hall &amp; Schedule Board</h2>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    {(["Indoor", "Outdoor"] as const).map((setup) => {
                      const active = setupFilter === setup;
                      return (
                        <button
                          key={setup}
                          type="button"
                          onClick={() => setSetupFilter(active ? null : setup)}
                          className={cn(
                            "stall-chip-sm cursor-pointer px-2.5 py-1 text-sm font-medium",
                            active
                              ? "bg-board text-chalk"
                              : "bg-card text-foreground ring-1 ring-border hover:bg-secondary",
                          )}
                        >
                          {setup}
                        </button>
                      );
                    })}
                  </div>
                  <Link
                    href={fullDirectoryHref}
                    className="text-sm font-medium text-primary underline underline-offset-4"
                  >
                    Open in directory
                  </Link>
                </div>
              </div>

              {/* Optional Split Map Panel when toggled */}
              {boardLayout === "split-map" ? (
                <div className="border-b border-board bg-secondary/40">
                  <div className="flex items-center justify-between px-4 py-2 text-sm text-muted-foreground">
                    <span>Interactive {LAUNCH_CITY} hall pins — click any marker for hours</span>
                    <button
                      type="button"
                      onClick={() => setBoardLayout("ledger")}
                      className="cursor-pointer font-medium text-primary hover:underline"
                    >
                      Hide map
                    </button>
                  </div>
                  <MarketMapLazy load="visible" className="h-72 w-full overflow-hidden" />
                </div>
              ) : null}

              {/* Column Headers for the Civic Ledger */}
              <div className="hidden border-b border-border bg-secondary/45 px-4 py-2 text-sm font-medium text-muted-foreground sm:grid sm:grid-cols-[minmax(0,1.65fr)_minmax(0,0.85fr)_auto] sm:gap-x-4">
                <span>Market hall &amp; street address</span>
                <span>Area &amp; stalls</span>
                <span className="text-right">Status &amp; hours</span>
              </div>

              {/* Filtered Market Ledger Rows */}
              {filteredMarkets.length > 0 ? (
                <ul className="divide-y divide-border">
                  {filteredMarkets.slice(0, visibleCount).map((market) => (
                    <li
                      key={market.id}
                      className={cn(
                        "px-4 py-3.5 transition-colors hover:bg-secondary/40",
                        market.open && "bg-stamp/[0.03] shadow-[inset_3px_0_0_var(--stamp)]",
                      )}
                    >
                      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 sm:grid-cols-[minmax(0,1.65fr)_minmax(0,0.85fr)_auto] sm:gap-x-4">
                        {/* Column 1: Market Name, Score, Address */}
                        <div className="min-w-0">
                          <p className="min-w-0">
                            <Link
                              href={`/markets/${market.slug}`}
                              className="text-base font-medium hover:underline"
                            >
                              <VerifiedName slug={market.slug} name={market.name} />
                            </Link>
                            <ListingScore
                              parens
                              ratingAvg={market.rating_avg}
                              reviewCount={market.review_count}
                              className="ml-2 text-stamp"
                            />
                          </p>
                          <p className="mt-0.5 text-sm text-muted-foreground">
                            <AddressLink
                              address={market.address}
                              city={market.city}
                              province={market.province}
                              name={market.name}
                              lat={market.lat}
                              lng={market.lng}
                            />
                          </p>
                          {market.tags.length > 0 ? (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {market.tags.slice(0, 4).map((tag) => (
                                <button
                                  key={tag}
                                  type="button"
                                  onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
                                  className={cn(
                                    "stall-chip-sm cursor-pointer px-2 py-0.5 text-sm",
                                    tagFilter === tag
                                      ? "bg-primary text-primary-foreground"
                                      : "bg-secondary text-muted-foreground hover:text-foreground",
                                  )}
                                >
                                  {tagLabel(tag)}
                                </button>
                              ))}
                            </div>
                          ) : null}
                        </div>

                        {/* Column 2: Neighbourhood + Stall Count + Setup */}
                        <div className="hidden min-w-0 sm:block">
                          <p className="text-sm font-medium text-foreground">
                            {market.neighbourhood}
                          </p>
                          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
                            {market.vendorCount > 0 ? (
                              <span>
                                <span className="type-nums font-medium text-foreground">
                                  {market.vendorCount}
                                </span>{" "}
                                stalls
                              </span>
                            ) : (
                              <span>Community hall</span>
                            )}
                            {market.indoor_outdoor ? (
                              <>
                                <span aria-hidden>·</span>
                                <span>{market.indoor_outdoor}</span>
                              </>
                            ) : null}
                          </p>
                        </div>

                        {/* Column 3: Status + Hours + Save (Auto non-shrinking column) */}
                        <div className="flex shrink-0 items-center gap-3">
                          <div className="text-right">
                            {market.open ? (
                              <div className="flex flex-col items-end">
                                <NowLabel>Open now</NowLabel>
                                {market.hours ? (
                                  <Hours
                                    value={market.hours}
                                    className="mt-0.5 font-medium text-stamp"
                                  />
                                ) : null}
                              </div>
                            ) : (
                              <div className="flex flex-col items-end">
                                <span className="type-nums whitespace-nowrap text-sm font-medium text-foreground">
                                  {market.nextOpen}
                                </span>
                                <span className="type-nums whitespace-nowrap text-sm text-muted-foreground">
                                  {market.scheduleSummary}
                                </span>
                              </div>
                            )}
                          </div>
                          <SaveButton kind="market" slug={market.slug} name={market.name} />
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-8 text-center">
                  <p className="text-base font-medium text-foreground">
                    No market halls match those exact board filters.
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Try clearing one of the neighbourhood or stall filters to see all sessions.
                  </p>
                  <button
                    type="button"
                    onClick={resetAllFilters}
                    className="stall-chip-sm mt-4 inline-flex h-9 cursor-pointer items-center bg-primary px-4 text-sm font-medium text-primary-foreground"
                  >
                    Reset all filters
                  </button>
                </div>
              )}

              {/* Board Footer Pagination / Directory Link */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-board bg-secondary/55 px-4 py-3">
                <span className="text-sm text-muted-foreground">
                  Displaying{" "}
                  <span className="type-nums font-medium text-foreground">
                    {Math.min(visibleCount, filteredMarkets.length)}
                  </span>{" "}
                  of{" "}
                  <span className="type-nums font-medium text-foreground">
                    {filteredMarkets.length}
                  </span>{" "}
                  matching halls
                </span>
                <div className="flex flex-wrap items-center gap-3">
                  {visibleCount < filteredMarkets.length ? (
                    <button
                      type="button"
                      onClick={() => setVisibleCount((prev) => prev + 12)}
                      className="stall-chip-sm inline-flex h-9 cursor-pointer items-center bg-board px-3.5 text-sm font-medium text-chalk hover:brightness-110"
                    >
                      Show 12 more on board
                    </button>
                  ) : null}
                  <Link
                    href={fullDirectoryHref}
                    className="stall-chip-sm inline-flex h-9 items-center bg-primary px-3.5 text-sm font-medium text-primary-foreground hover:brightness-110"
                  >
                    Full directory &amp; map
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* Right 4 Columns: Tabbed Live Stall & Floor Wire + Saved Dock */}
          <aside className="flex flex-col gap-6 lg:col-span-4">
            {/* Tabbed Station Wire */}
            <section className="bg-card ring-1 ring-board">
              <div className="border-b border-board bg-board px-4 py-3 text-chalk">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <TicketMark className="size-4 text-stamp" />
                    <p className="type-kicker text-chalk/85">Live floor telemetry</p>
                  </div>
                  <Link href="/feed" className="text-sm font-medium text-chalk underline">
                    Full feed
                  </Link>
                </div>
                <h2 className="mt-0.5 text-chalk">Stalls &amp; Floor Wire</h2>

                {/* 3-Tab Segmented Switcher */}
                <div
                  role="tablist"
                  aria-label="Stall and floor wire tabs"
                  className="mt-3 grid grid-cols-3 gap-1 bg-black/25 p-1"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={wireTab === "today"}
                    onClick={() => setWireTab("today")}
                    className={cn(
                      "stall-chip-sm cursor-pointer px-2 py-1.5 text-sm font-medium transition-colors",
                      wireTab === "today"
                        ? "bg-card text-primary"
                        : "text-chalk/85 hover:bg-white/10",
                    )}
                  >
                    Today ({data.sellingToday.length})
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={wireTab === "week"}
                    onClick={() => setWireTab("week")}
                    className={cn(
                      "stall-chip-sm cursor-pointer px-2 py-1.5 text-sm font-medium transition-colors",
                      wireTab === "week"
                        ? "bg-card text-primary"
                        : "text-chalk/85 hover:bg-white/10",
                    )}
                  >
                    Top 5 week
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={wireTab === "notes"}
                    onClick={() => setWireTab("notes")}
                    className={cn(
                      "stall-chip-sm cursor-pointer px-2 py-1.5 text-sm font-medium transition-colors",
                      wireTab === "notes"
                        ? "bg-card text-primary"
                        : "text-chalk/85 hover:bg-white/10",
                    )}
                  >
                    Floor notes
                  </button>
                </div>
              </div>

              {wireTab === "today" ? (
                <div>
                  <div className="border-b border-border bg-secondary/45 px-4 py-2 text-sm text-muted-foreground">
                    Stalls on the floor today across {LAUNCH_CITY}
                  </div>
                  {data.sellingToday.length ? (
                    <ul>
                      {data.sellingToday.slice(0, 6).map((row) => (
                        <VendorTodayItem
                          key={`${row.vendorSlug}-${row.marketSlug}`}
                          row={row}
                        />
                      ))}
                    </ul>
                  ) : (
                    <p className="p-4 text-sm text-muted-foreground">
                      Today&apos;s stalls have closed. Switch to Top 5 week to see upcoming schedules.
                    </p>
                  )}
                </div>
              ) : null}

              {wireTab === "week" ? (
                <div>
                  <div className="border-b border-border bg-secondary/45 px-4 py-2 text-sm text-muted-foreground">
                    Highest-rated stalls setting up this week
                  </div>
                  <ol>
                    {data.weekVendors.slice(0, 5).map((pick, index) => (
                      <VendorWeekItem key={pick.vendorSlug} pick={pick} index={index} />
                    ))}
                  </ol>
                </div>
              ) : null}

              {wireTab === "notes" ? (
                <div>
                  <div className="border-b border-border bg-secondary/45 px-4 py-2 text-sm text-muted-foreground">
                    Recent dispatches from market regulars
                  </div>
                  <ol>
                    {data.tape.slice(0, 4).map((item) => (
                      <ReviewCard key={item.id} item={item} />
                    ))}
                  </ol>
                </div>
              ) : null}
            </section>

            {/* Saved Markets & Stalls Rail */}
            <SavedRail />

            {/* Interactive 7-Day Hall Frequency Card (Compact 2-Col Grid) */}
            <section className="bg-card ring-1 ring-border">
              <div className="flex items-center justify-between gap-2 border-b border-border bg-secondary/55 px-4 py-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="stall-chip-sm flex size-7 shrink-0 items-center justify-center bg-primary text-primary-foreground">
                    <SlatsMark className="size-4" />
                  </span>
                  <div>
                    <p className="type-kicker text-muted-foreground">Filter board by day</p>
                    <h2 className="type-column">Weekly hall frequency</h2>
                  </div>
                </div>
                {WEEKDAY_NAMES.includes(windowFilter as (typeof WEEKDAY_NAMES)[number]) ? (
                  <button
                    type="button"
                    onClick={() => setWindowFilter("all")}
                    className="cursor-pointer text-sm font-medium text-primary underline"
                  >
                    All days
                  </button>
                ) : null}
              </div>

              <ul className="grid grid-cols-2 divide-x divide-y divide-border">
                {weekdayCounts.map(({ day, count }) => {
                  const active = windowFilter === day;
                  return (
                    <li key={day} className="last:col-span-2">
                      <button
                        type="button"
                        onClick={() => {
                          setWindowFilter(active ? "all" : day);
                          setVisibleCount(12);
                        }}
                        className={cn(
                          "grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 px-3.5 py-2 text-left transition-colors",
                          active ? "bg-board text-chalk" : "hover:bg-secondary/45",
                        )}
                      >
                        <span className="text-sm font-medium">{day}</span>
                        <span
                          className={cn(
                            "type-nums whitespace-nowrap text-sm font-medium",
                            active ? "text-chalk" : "text-primary",
                          )}
                        >
                          {count}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          </aside>
        </div>

        {/* Full-Width Section: The Produce & Pantry Exchange (All 8 Aisles) */}
        <section
          aria-label="Produce and Pantry Exchange"
          className="mt-12 border-t-2 border-board pt-8"
        >
          <div className="flex flex-wrap items-end justify-between gap-3 pb-5">
            <div className="flex items-start gap-3">
              <span className="stall-chip-sm mt-0.5 flex size-9 shrink-0 items-center justify-center bg-primary text-primary-foreground">
                <TagMark className="size-5" />
              </span>
              <div>
                <p className="type-kicker text-muted-foreground">
                  {formatCensus(data.census.menus)} menu items indexed across {formatCensus(data.census.vendors)} stalls
                </p>
                <h2>The Produce &amp; Pantry Exchange</h2>
              </div>
            </div>
            <Link
              href="/products"
              className="text-base font-medium text-primary underline underline-offset-4"
            >
              Open full product catalogue
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {data.aisles.slice(0, 8).map((aisle) => (
              <div
                key={aisle.id}
                className="flex flex-col justify-between bg-card ring-1 ring-border transition-colors hover:bg-secondary/35"
              >
                <div>
                  <Link href={`/products?aisle=${aisle.id}`} className="block">
                    <ProductPhotoFrame
                      name={aisle.label}
                      decorative
                      photo={
                        aisle.photoUrl
                          ? { url: aisle.photoUrl, alt: aisle.photoAlt ?? aisle.label }
                          : null
                      }
                      className="h-28 w-full aspect-auto border-b border-border"
                    />
                    <div className="p-3.5">
                      <div className="flex items-baseline justify-between gap-2">
                        <h3>{aisle.label}</h3>
                        <span className="type-nums text-sm font-medium text-stamp">
                          {aisle.count} items
                        </span>
                      </div>
                      <p className="mt-1 text-sm leading-snug text-muted-foreground">
                        {aisle.line}
                      </p>
                    </div>
                  </Link>
                </div>

                {aisle.sampleTerms.length > 0 ? (
                  <div className="flex flex-wrap gap-1 border-t border-border/70 px-3.5 py-2.5">
                    {aisle.sampleTerms.slice(0, 3).map((term) => (
                      <Link
                        key={term.slug}
                        href={`/find/${term.slug}`}
                        className="stall-chip-sm bg-secondary px-2 py-0.5 text-sm text-foreground hover:bg-primary hover:text-primary-foreground"
                      >
                        {term.term}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        {/* Bottom Editorial Dispatches Band */}
        {data.recentNotes.length > 0 ? (
          <section
            aria-label="Field dispatches"
            className="mt-12 border-t-2 border-board pt-8 pb-4"
          >
            <div className="flex flex-wrap items-end justify-between gap-3 pb-5">
              <div className="flex items-start gap-3">
                <span className="stall-chip-sm mt-0.5 flex size-9 shrink-0 items-center justify-center bg-board text-chalk">
                  <SignMark className="size-5" />
                </span>
                <div>
                  <p className="type-kicker text-muted-foreground">Seasonal guides &amp; reporting</p>
                  <h2>Dispatches from the market floor</h2>
                </div>
              </div>
              <Link
                href="/blog"
                className="text-base font-medium text-primary underline underline-offset-4"
              >
                All market notes
              </Link>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              {data.recentNotes.slice(0, 3).map((post, idx) => (
                <article
                  key={post.slug}
                  className={cn(
                    "flex flex-col justify-between bg-card p-5 ring-1",
                    idx === 0 ? "ring-board shadow-[inset_4px_0_0_var(--primary)]" : "ring-border",
                  )}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="type-kicker font-medium text-primary">
                        {post.kicker ?? "Field note"}
                      </span>
                      <SaveButton kind="blog" slug={post.slug} name={post.title} />
                    </div>
                    <h3 className="mt-2">
                      <Link href={`/blog/${post.slug}`} className="hover:underline">
                        {post.title}
                      </Link>
                    </h3>
                    <p className="mt-2 text-base leading-relaxed text-muted-foreground">
                      {post.description}
                    </p>
                  </div>
                  <div className="mt-4 border-t border-border pt-3">
                    <Link
                      href={`/blog/${post.slug}`}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      Read note
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </div>

      {standalone ? (
        <div className="fixed right-4 bottom-4 z-50">
          <Link
            href="/preview?design=2"
            className="find-go stall-chip inline-flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-receipt shadow-lg hover:brightness-110"
          >
            <span>Compare all 3 concepts</span>
          </Link>
        </div>
      ) : null}
    </div>
  );
}
