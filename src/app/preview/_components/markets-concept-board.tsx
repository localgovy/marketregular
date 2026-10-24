"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { MarketsPreviewData } from "@/app/preview/_lib/markets-preview-data";
import {
  AtlasVendorDirectoryCard,
  MastheadScore,
  ProductThumb,
  SessionLines,
  StallEmblem,
  formatCensus,
  formatStallNote,
  neighbourhoodOptions,
} from "@/app/preview/_components/markets-concept-shared";
import { AddressLink } from "@/components/address-link";
import { BrowseLinks } from "@/components/browse-links";
import { Hours } from "@/components/hours";
import { ListingScore } from "@/components/listing-score";
import { MarketMapLazy } from "@/components/market-map-lazy";
import {
  BlocksMark,
  CaretRightMark,
  CrateMark,
  PlateMark,
  SearchMark,
  SlatsMark,
  WeekMark,
} from "@/components/marks";
import { NowLabel } from "@/components/now-label";
import { ProductPhotoFrame } from "@/components/product-photo-frame";
import { SaveButton } from "@/components/save-button";
import { VerifiedName } from "@/components/verified-stamp";
import { SEARCH_PLACEHOLDER } from "@/lib/constants";
import { formatPrice } from "@/lib/format";
import { LAUNCH_CITY } from "@/lib/launch";
import { cn } from "@/lib/utils";

type SortId = "soonest" | "stalls" | "reviewed" | "name";
const LIST_PAGE = 10;

/**
 * Concept 2 — The Interactive Map, 7-Day Timetable & Market-Stall Explorer
 * - Dual-Plate Masthead pairing the 7-col Forest-Green Search & Day Plate with a 5-col Live Map & Pinned Market Plate
 * - Above-the-fold 2-column 7-Day Weekly Market Schedule (no masonry, unclipped hours in `grid-cols-[minmax(0,1fr)_auto]`)
 * - 12-column Master-Detail Market & Stall Explorer (5-col market list + 7-col live stall & menu inspector for the selected market)
 * - Bottom Vendors Directory (`#directory-vendors`) & `BrowseLinks`
 */
export function MarketsConceptBoard({
  data,
  clockMode = "saturday",
}: {
  data: MarketsPreviewData;
  clockMode?: "saturday" | "live";
}) {
  const simulatedPeak = clockMode === "saturday";

  const [q, setQ] = useState("");
  const [day, setDay] = useState<string>("all");
  const [area, setArea] = useState<string>("all");
  const [setup, setSetup] = useState<string>("all");
  const [openOnly, setOpenOnly] = useState<boolean>(false);
  const [sort, setSort] = useState<SortId>("soonest");
  const [limit, setLimit] = useState<number>(LIST_PAGE);
  const [selectedDayGroupId, setSelectedDayGroupId] = useState<string>("all");
  const [selectedMarketSlug, setSelectedMarketSlug] = useState<string>(
    () => data.enrichedMarkets[0]?.slug ?? "",
  );
  const [stallCategoryFilter, setStallCategoryFilter] = useState<string>("all");

  const areas = useMemo(() => neighbourhoodOptions(data), [data]);
  const weekDays = useMemo(
    () => data.fullWeek.filter((g) => g.id !== "earlier" && g.slots.length > 0),
    [data.fullWeek],
  );

  const dayOptions = ["Sat", "Sun", "Tue", "Wed", "Thu", "Fri", "Mon"];

  const filteredMarkets = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = data.enrichedMarkets.filter((m) => {
      const isOpen = m.open || (simulatedPeak && m.openSaturday);
      if (openOnly && !isOpen) return false;
      if (day !== "all" && !m.dayNames.some((d) => d.startsWith(day))) return false;
      if (area !== "all" && m.neighbourhood.toLowerCase() !== area.toLowerCase()) return false;
      if (setup === "Indoor" && m.indoor_outdoor !== "Indoor") return false;
      if (setup === "Outdoor" && m.indoor_outdoor !== "Outdoor") return false;
      if (setup === "year-round" && !m.tags.includes("year-round")) return false;
      if (needle) {
        const hay = `${m.name} ${m.neighbourhood} ${m.city} ${m.address} ${m.topStalls.map((s) => s.name).join(" ")}`.toLowerCase();
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
  }, [data.enrichedMarkets, q, day, area, setup, openOnly, sort, simulatedPeak]);

  const shownMarkets = filteredMarkets.slice(0, limit);
  const selectedMarket =
    filteredMarkets.find((m) => m.slug === selectedMarketSlug) ??
    data.enrichedMarkets.find((m) => m.slug === selectedMarketSlug) ??
    filteredMarkets[0] ??
    data.enrichedMarkets[0];

  const selectedMarketStalls = useMemo(() => {
    if (!selectedMarket) return [];
    if (stallCategoryFilter === "all") return selectedMarket.topStalls;
    return selectedMarket.topStalls.filter((s) => s.categoryId === stallCategoryFilter);
  }, [selectedMarket, stallCategoryFilter]);

  const openCount = simulatedPeak ? data.saturdayOpenCount : data.openNowSlots.length;
  const hasFilters =
    q.trim().length > 0 || day !== "all" || area !== "all" || setup !== "all" || openOnly;

  function resetAll() {
    setQ("");
    setDay("all");
    setArea("all");
    setSetup("all");
    setOpenOnly(false);
    setLimit(LIST_PAGE);
  }

  const visibleWeekGroups =
    selectedDayGroupId === "all"
      ? weekDays.slice(0, 4)
      : weekDays.filter((g) => g.id === selectedDayGroupId);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-7 sm:px-6">
      {/* Top Neighbourhood & Live Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setArea("all");
              setLimit(LIST_PAGE);
            }}
            className={cn(
              "stall-chip-sm inline-flex cursor-pointer items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors",
              area === "all"
                ? "bg-primary text-primary-foreground"
                : "bg-card text-foreground ring-1 ring-border hover:bg-secondary",
            )}
          >
            <BlocksMark
              className={cn("size-3.5", area === "all" ? "text-primary-foreground" : "text-primary")}
            />
            <span>All neighbourhoods</span>
          </button>

          {data.neighbourhoodCircuits.slice(0, 5).map((circuit) => {
            const active = area.toLowerCase() === circuit.label.toLowerCase();
            return (
              <button
                key={circuit.label}
                type="button"
                onClick={() => {
                  setArea(active ? "all" : circuit.label);
                  setLimit(LIST_PAGE);
                }}
                className={cn(
                  "stall-chip-sm inline-flex cursor-pointer items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-foreground ring-1 ring-border hover:bg-secondary",
                )}
              >
                <span>{circuit.label}</span>
                <span
                  className={cn(
                    "type-nums",
                    active ? "text-primary-foreground/85" : "text-muted-foreground",
                  )}
                >
                  ({circuit.marketCount})
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <span className="stall-chip-sm inline-flex items-center gap-1.5 bg-stamp px-3 py-1 text-sm font-medium text-chalk">
            <WeekMark className="size-3.5 text-chalk" />
            <span>
              {openCount} {openCount === 1 ? "market open" : "markets open"}
              {simulatedPeak ? " (Sat peak)" : " now"}
            </span>
          </span>
          <Link
            href="/markets/open-today"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            <span>Open today schedule</span>
            <CaretRightMark className="size-3.5" />
          </Link>
        </div>
      </div>

      {/* Above-the-Fold Dual-Plate Masthead (7-Col Forest-Green Search Plate + 5-Col Live Map Plate) */}
      <section className="mt-4 grid gap-5 lg:grid-cols-12">
        {/* Left 7 Cols: Forest-Green Search, Day & Setup Plate */}
        <div className="flex flex-col justify-between bg-primary p-6 text-primary-foreground ring-1 ring-board lg:col-span-7">
          <div>
            <p className="type-kicker text-primary-foreground/90">
              Interactive map, 7-day timetable &amp; stall roster explorer
            </p>
            <h1 className="mt-1 text-primary-foreground">{LAUNCH_CITY} farmers&apos; markets</h1>
            <p className="type-lede mt-2 max-w-2xl text-primary-foreground/95">
              Filter all {formatCensus(data.census.markets)} markets by day, neighbourhood, or
              indoor/outdoor setup — and click any market to inspect its stalls, products, and
              weekly hours.
            </p>

            {/* Joined Search Bar */}
            <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:items-stretch">
              <label className="flex min-w-0 flex-1 items-center gap-2.5 rounded-[2px] border border-black/20 bg-receipt px-3.5 py-2.5 text-foreground shadow-[inset_0_1px_0_#fff] focus-within:ring-2 focus-within:ring-chalk">
                <SearchMark className="size-4 shrink-0 text-muted-foreground" />
                <span className="sr-only">Search markets and vendors</span>
                <input
                  type="search"
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setLimit(LIST_PAGE);
                  }}
                  placeholder={SEARCH_PLACEHOLDER}
                  className="h-9 w-full bg-transparent text-base text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
              </label>

              <select
                aria-label="Neighbourhood"
                value={area}
                onChange={(e) => {
                  setArea(e.target.value);
                  setLimit(LIST_PAGE);
                }}
                className="h-14 cursor-pointer rounded-[2px] bg-receipt px-3.5 text-sm font-medium text-foreground ring-1 ring-black/20"
              >
                <option value="all">All neighbourhoods</option>
                {areas.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>

              <a
                href="#market-explorer"
                className="find-go stall-chip inline-flex h-14 shrink-0 cursor-pointer items-center justify-center px-5 text-base font-medium text-receipt hover:brightness-110"
              >
                Explore ({filteredMarkets.length})
              </a>
            </div>

            {/* Day-of-Week Filter Strip on Plate */}
            <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-primary-foreground/15 pt-3.5">
              <span className="mr-1 text-sm font-medium text-primary-foreground/85">Day:</span>
              <button
                type="button"
                onClick={() => {
                  setDay("all");
                  setLimit(LIST_PAGE);
                }}
                className={cn(
                  "stall-chip-sm cursor-pointer px-2.5 py-1 text-sm font-medium transition-colors",
                  day === "all"
                    ? "bg-receipt text-primary"
                    : "bg-primary-foreground/15 text-primary-foreground hover:bg-receipt hover:text-primary",
                )}
              >
                Any day
              </button>
              {dayOptions.map((d) => {
                const active = day === d;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      setDay(active ? "all" : d);
                      setLimit(LIST_PAGE);
                    }}
                    className={cn(
                      "stall-chip-sm cursor-pointer px-2.5 py-1 text-sm font-medium transition-colors",
                      active
                        ? "bg-receipt text-primary"
                        : "bg-primary-foreground/15 text-primary-foreground hover:bg-receipt hover:text-primary",
                    )}
                  >
                    {d}
                  </button>
                );
              })}

              <span aria-hidden className="mx-1 text-primary-foreground/30">
                |
              </span>

              {(["Indoor", "Outdoor", "year-round"] as const).map((s) => {
                const active = setup === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setSetup(active ? "all" : s);
                      setLimit(LIST_PAGE);
                    }}
                    className={cn(
                      "stall-chip-sm cursor-pointer px-2.5 py-1 text-sm font-medium transition-colors",
                      active
                        ? "bg-receipt text-primary"
                        : "bg-primary-foreground/15 text-primary-foreground hover:bg-receipt hover:text-primary",
                    )}
                  >
                    {s === "year-round" ? "Year-round" : s}
                  </button>
                );
              })}

              {hasFilters ? (
                <button
                  type="button"
                  onClick={resetAll}
                  className="ml-auto cursor-pointer text-sm font-medium text-primary-foreground underline underline-offset-4"
                >
                  Reset
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
                <p className="text-sm text-primary-foreground/85">Markets pinned</p>
              </div>
              <div className="rounded-lg bg-primary-foreground/12 px-3.5 py-2.5">
                <p className="type-census text-2xl text-primary-foreground sm:text-3xl">
                  {formatCensus(data.census.vendors)}
                </p>
                <p className="text-sm text-primary-foreground/85">Active stalls</p>
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

        {/* Right 5 Cols: Live Interactive Map & Selected Market Telemetry Plate */}
        <div className="flex flex-col justify-between bg-card ring-1 ring-board lg:col-span-5">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-receipt px-5 py-3">
              <div className="flex items-center gap-2">
                <BlocksMark className="size-4 text-primary" />
                <p className="type-kicker font-medium text-foreground">
                  Interactive market map
                </p>
              </div>
              <span className="stall-chip-sm type-nums bg-stamp px-2.5 py-0.5 text-sm font-medium text-chalk">
                {filteredMarkets.length} {filteredMarkets.length === 1 ? "market" : "markets"}
              </span>
            </div>

            <div className="p-5">
              <MarketMapLazy
                markets={filteredMarkets}
                load="visible"
                className="h-48 w-full border border-border"
              />

              {selectedMarket ? (
                <div className="mt-4 bg-receipt p-3.5 ring-1 ring-border shadow-[inset_3px_0_0_var(--primary)]">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3">
                    <div className="flex min-w-0 items-start gap-2.5">
                      <StallEmblem
                        src={selectedMarket.logo_url}
                        name={selectedMarket.name}
                        kind="market"
                        size="sm"
                        tone="paper"
                        className="mt-0.5"
                      />
                      <div className="min-w-0">
                        <p className="type-kicker text-primary">
                          Active in explorer · {selectedMarket.vendorCount} stalls
                        </p>
                        <Link
                          href={`/markets/${selectedMarket.slug}`}
                          className="mt-0.5 block text-base font-medium text-foreground hover:text-primary hover:underline"
                        >
                          {selectedMarket.name}
                        </Link>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          <AddressLink
                            address={selectedMarket.address}
                            city={selectedMarket.city}
                            province={selectedMarket.province}
                            lat={selectedMarket.lat}
                            lng={selectedMarket.lng}
                          />
                        </p>
                      </div>
                    </div>
                    <SessionLines
                      sessions={selectedMarket.sessions.slice(0, 2)}
                      fallback={selectedMarket.nextOpen}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-receipt px-5 py-3 text-sm">
            <span className="font-medium text-muted-foreground">Quick select:</span>
            <div className="flex flex-wrap gap-1.5">
              {[
                ...new Map(
                  filteredMarkets.map((m) => [m.neighbourhood, m]),
                ).values(),
              ]
                .slice(0, 3)
                .map((m) => (
                  <button
                    key={m.slug}
                    type="button"
                    onClick={() => setSelectedMarketSlug(m.slug)}
                    className={cn(
                      "cursor-pointer rounded px-2 py-0.5 text-sm font-medium transition-colors",
                      selectedMarket?.slug === m.slug
                        ? "bg-primary text-primary-foreground"
                        : "bg-card text-foreground ring-1 ring-border hover:bg-secondary",
                    )}
                  >
                    {m.neighbourhood}
                  </button>
                ))}
            </div>
          </div>
        </div>
      </section>

      {/* Above-the-Fold 7-Day Weekly Market Schedule (2-Col CSS Grid of Day Cards, Never Masonry) */}
      <section
        id="week-schedule"
        aria-label="Weekly market schedule"
        className="mt-8 bg-card ring-1 ring-board"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-board bg-secondary px-4 py-3.5 sm:px-5">
          <div className="flex items-center gap-3">
            <span className="stall-chip-sm flex size-9 shrink-0 items-center justify-center bg-primary text-primary-foreground">
              <WeekMark className="size-5" />
            </span>
            <div>
              <p className="type-kicker text-muted-foreground">
                Every market session this week — unclipped hours in a 2-column day grid
              </p>
              <h2>This Week&apos;s Market Schedule</h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedDayGroupId("all")}
              className={cn(
                "stall-chip-sm cursor-pointer px-3 py-1.5 text-sm font-medium transition-colors",
                selectedDayGroupId === "all"
                  ? "bg-board text-chalk"
                  : "bg-card text-foreground ring-1 ring-border hover:bg-secondary",
              )}
            >
              Next 4 days
            </button>
            {weekDays.slice(0, 6).map((g) => {
              const active = selectedDayGroupId === g.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setSelectedDayGroupId(active ? "all" : g.id)}
                  className={cn(
                    "stall-chip-sm inline-flex cursor-pointer items-baseline gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "bg-card text-foreground ring-1 ring-border hover:bg-secondary",
                  )}
                >
                  <span>{g.label}</span>
                  <span
                    className={cn(
                      "type-nums text-sm",
                      active ? "text-primary-foreground/85" : "text-muted-foreground",
                    )}
                  >
                    ({g.slots.length})
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2-Column Grid of Day Cards — hours in an auto column that cannot shrink */}
        <div className="grid gap-5 p-4 sm:p-5 md:grid-cols-2">
          {visibleWeekGroups.map((group) => {
            const shownSlots =
              selectedDayGroupId === "all" ? group.slots.slice(0, 5) : group.slots;
            const remaining = Math.max(0, group.slots.length - shownSlots.length);
            return (
              <div key={group.id} className="flex flex-col justify-between bg-receipt ring-1 ring-border">
                <div>
                  <div className="flex items-center justify-between gap-2 border-b border-border bg-secondary/60 px-4 py-3">
                    <div className="flex items-baseline gap-2">
                      <h3>{group.label}</h3>
                      <span className="type-nums text-sm text-primary">{group.date}</span>
                    </div>
                    <span className="stall-chip-sm type-nums bg-board px-2.5 py-0.5 text-sm font-medium text-chalk">
                      {group.slots.length} {group.slots.length === 1 ? "market" : "markets"}
                    </span>
                  </div>

                  <ul className="divide-y divide-dashed divide-border px-4">
                    {shownSlots.map((slot) => (
                      <li
                        key={`${group.id}-${slot.id}`}
                        className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 py-2.5"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <StallEmblem
                            src={slot.logo_url}
                            name={slot.name}
                            kind="market"
                            size="xs"
                          />
                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={() => setSelectedMarketSlug(slot.slug)}
                              className="cursor-pointer text-left text-base font-medium text-foreground hover:text-primary hover:underline"
                            >
                              {slot.name}
                            </button>
                            <span className="ml-1.5 text-sm text-muted-foreground">
                              · {slot.neighbourhood}
                              {slot.vendorCount > 0 ? ` · ${slot.vendorCount} stalls` : ""}
                            </span>
                          </div>
                        </div>
                        <Hours
                          value={slot.hours}
                          className="whitespace-nowrap font-medium text-foreground"
                        />
                      </li>
                    ))}
                  </ul>
                </div>

                {remaining > 0 ? (
                  <div className="flex items-center justify-between border-t border-border bg-card px-4 py-2.5 text-sm">
                    <button
                      type="button"
                      onClick={() => setSelectedDayGroupId(group.id)}
                      className="cursor-pointer font-medium text-primary hover:underline"
                    >
                      Show all {group.slots.length} markets on {group.label} →
                    </button>
                    <span className="type-nums text-muted-foreground">+{remaining} more</span>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      {/* Main 12-Col Interactive Market & Stall Explorer (5-Col Market List + 7-Col Selected Market & Stall Stage) */}
      <section
        id="market-explorer"
        aria-label="Interactive market and stall explorer"
        className="scroll-mt-header mt-8 grid gap-8 lg:grid-cols-12 lg:items-start"
      >
        {/* Left 5 Columns: Filterable Market List */}
        <div className="bg-card ring-1 ring-board lg:col-span-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-board bg-secondary px-4 py-3.5">
            <div className="flex items-center gap-2.5">
              <span className="stall-chip-sm flex size-8 shrink-0 items-center justify-center bg-board text-chalk">
                <SlatsMark className="size-4" />
              </span>
              <div>
                <p className="type-kicker text-muted-foreground">
                  Select a market to inspect its stalls
                </p>
                <h2>Markets ({filteredMarkets.length})</h2>
              </div>
            </div>

            <select
              aria-label="Sort markets"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortId)}
              className="cursor-pointer rounded bg-receipt px-2.5 py-1 text-sm font-medium text-foreground ring-1 ring-border"
            >
              <option value="soonest">Opening soonest</option>
              <option value="stalls">Most stalls</option>
              <option value="reviewed">Most reviewed</option>
              <option value="name">Name A–Z</option>
            </select>
          </div>

          {shownMarkets.length > 0 ? (
            <ul className="divide-y divide-border">
              {shownMarkets.map((m) => {
                const active = selectedMarket?.slug === m.slug;
                const isOpen = m.open || (simulatedPeak && m.openSaturday);
                return (
                  <li
                    key={m.id}
                    className={cn(
                      "p-4 transition-colors",
                      active
                        ? "bg-receipt shadow-[inset_4px_0_0_var(--primary)]"
                        : "hover:bg-secondary/40",
                    )}
                  >
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <StallEmblem
                          src={m.logo_url}
                          name={m.name}
                          kind="market"
                          size="md"
                          className="mt-0.5"
                        />
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedMarketSlug(m.slug);
                              setStallCategoryFilter("all");
                            }}
                            className={cn(
                              "cursor-pointer text-left text-base font-medium hover:text-primary hover:underline",
                              active ? "text-primary" : "text-foreground",
                            )}
                          >
                            {m.name}
                          </button>
                          <ListingScore
                            ratingAvg={m.rating_avg}
                            reviewCount={m.review_count}
                            className="mt-0.5 text-sm"
                          />
                          <p className="mt-1 text-sm text-muted-foreground">
                            {m.neighbourhood}
                            {m.indoor_outdoor ? ` · ${m.indoor_outdoor}` : ""} ·{" "}
                            <span className="type-nums font-medium text-foreground">
                              {m.vendorCount} stalls
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        {isOpen ? (
                          <NowLabel>Open now</NowLabel>
                        ) : (
                          <span className="type-nums text-sm font-medium text-foreground">
                            {m.nextOpen}
                          </span>
                        )}
                        <SessionLines sessions={m.sessions.slice(0, 2)} />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="p-6 text-center">
              <p className="text-base text-muted-foreground">No markets match those filters.</p>
              <button
                type="button"
                onClick={resetAll}
                className="mt-2 cursor-pointer font-medium text-primary hover:underline"
              >
                Reset filters
              </button>
            </div>
          )}

          {filteredMarkets.length > shownMarkets.length ? (
            <div className="border-t border-border bg-secondary/40 p-3.5 text-center">
              <button
                type="button"
                onClick={() => setLimit((prev) => prev + LIST_PAGE)}
                className="stall-chip-sm w-full cursor-pointer bg-board py-2 text-sm font-medium text-chalk hover:brightness-110"
              >
                Show more markets ({filteredMarkets.length - shownMarkets.length} remaining)
              </button>
            </div>
          ) : null}
        </div>

        {/* Right 7 Columns: Selected Market Deep Stage (Forest-Green Header + Filterable Stall & Menu Roster) */}
        <div className="lg:sticky lg:top-20 lg:col-span-7">
          {selectedMarket ? (
            <div className="bg-card ring-1 ring-board">
              {/* Forest-Green Selected Market Identity Plate */}
              <div className="border-b border-black/15 bg-primary p-5 text-primary-foreground sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex min-w-0 flex-1 items-start gap-4">
                    <StallEmblem
                      src={selectedMarket.logo_url}
                      name={selectedMarket.name}
                      kind="market"
                      size="lg"
                      tone="chalk"
                      className="mt-0.5"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="type-kicker text-primary-foreground/90">
                        {selectedMarket.neighbourhood}
                        {selectedMarket.indoor_outdoor
                          ? ` · ${selectedMarket.indoor_outdoor} market`
                          : " · Farmers' market"}
                      </p>
                      <h2 className="mt-1 text-primary-foreground">
                        <Link
                          href={`/markets/${selectedMarket.slug}`}
                          className="hover:underline"
                        >
                          <VerifiedName
                            slug={selectedMarket.slug}
                            name={selectedMarket.name}
                          />
                        </Link>
                      </h2>
                      <div className="mt-2 flex flex-wrap items-center gap-2.5">
                        <MastheadScore
                          ratingAvg={selectedMarket.rating_avg}
                          reviewCount={selectedMarket.review_count}
                        />
                        <span className="stall-chip-sm type-nums bg-board/80 px-2.5 py-0.5 text-sm font-medium text-chalk">
                          {selectedMarket.vendorCount} registered stalls
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="rounded bg-receipt p-0.5 ring-1 ring-black/15">
                      <SaveButton
                        kind="market"
                        slug={selectedMarket.slug}
                        name={selectedMarket.name}
                        size="md"
                      />
                    </div>
                    <Link
                      href={`/markets/${selectedMarket.slug}`}
                      className="stall-chip-sm inline-flex items-center gap-1.5 bg-receipt px-3.5 py-2 text-sm font-medium text-primary hover:bg-white"
                    >
                      <span>Market page</span>
                      <CaretRightMark className="size-3.5" />
                    </Link>
                  </div>
                </div>

                <p className="mt-4 text-base leading-relaxed text-primary-foreground/95">
                  {selectedMarket.about}
                </p>

                {/* Address & Unclipped Schedule Strip inside Plate */}
                <div className="mt-4 grid gap-3 border-t border-primary-foreground/15 pt-4 sm:grid-cols-2">
                  <div className="rounded bg-primary-foreground/12 px-3.5 py-2.5">
                    <p className="text-sm font-medium text-primary-foreground/80">Location</p>
                    <p className="mt-0.5 text-base font-medium text-primary-foreground">
                      {selectedMarket.address}, {selectedMarket.city}
                    </p>
                  </div>
                  <div className="rounded bg-primary-foreground/12 px-3.5 py-2.5">
                    <p className="text-sm font-medium text-primary-foreground/80">
                      Weekly hours
                    </p>
                    <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-1">
                      {selectedMarket.sessions.length > 0 ? (
                        selectedMarket.sessions.map((s) => (
                          <span
                            key={`${s.day}-${s.hours}`}
                            className="type-nums text-base font-medium text-primary-foreground"
                          >
                            {s.day} {s.hours}
                          </span>
                        ))
                      ) : (
                        <span className="type-nums text-base font-medium text-primary-foreground">
                          {selectedMarket.nextOpen}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Stalls & Products at This Market */}
              <div className="p-5 sm:p-6">
                <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <CrateMark className="size-4 text-primary" />
                    <h3>Stalls &amp; menu highlights at {selectedMarket.name}</h3>
                  </div>
                  <Link
                    href={`/markets/${selectedMarket.slug}#vendors`}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    See all {selectedMarket.vendorCount} stalls →
                  </Link>
                </div>

                {/* Category Filter Pills for Stalls at Selected Market */}
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setStallCategoryFilter("all")}
                    className={cn(
                      "stall-chip-sm cursor-pointer px-2.5 py-1 text-sm font-medium transition-colors",
                      stallCategoryFilter === "all"
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-foreground hover:bg-secondary/80",
                    )}
                  >
                    All featured ({selectedMarket.topStalls.length})
                  </button>
                  {[
                    ...new Map(
                      selectedMarket.topStalls.map((s) => [s.categoryId, s.categoryLabel]),
                    ).entries(),
                  ].map(([catId, catLabel]) => (
                    <button
                      key={catId}
                      type="button"
                      onClick={() =>
                        setStallCategoryFilter(stallCategoryFilter === catId ? "all" : catId)
                      }
                      className={cn(
                        "stall-chip-sm cursor-pointer px-2.5 py-1 text-sm font-medium transition-colors",
                        stallCategoryFilter === catId
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-foreground hover:bg-secondary/80",
                      )}
                    >
                      {catLabel}
                    </button>
                  ))}
                </div>

                {selectedMarketStalls.length > 0 ? (
                  <ul className="mt-4 grid gap-3.5 sm:grid-cols-2">
                    {selectedMarketStalls.map((st) => {
                      const price = formatPrice(st.priceCents);
                      const stallNote = formatStallNote(st.stall);
                      return (
                        <li
                          key={st.slug}
                          className="flex flex-col justify-between bg-receipt p-3.5 ring-1 ring-border shadow-[inset_3px_0_0_var(--primary)]"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex min-w-0 items-start gap-2.5">
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
                                    className="block text-base font-medium text-foreground hover:text-primary hover:underline"
                                  >
                                    {st.name}
                                  </Link>
                                  <p className="text-sm text-muted-foreground">
                                    {st.categoryLabel}
                                    {stallNote ? ` · ${stallNote}` : ""}
                                  </p>
                                </div>
                              </div>
                              <SaveButton
                                kind="vendor"
                                slug={st.slug}
                                name={st.name}
                                size="sm"
                              />
                            </div>

                            <div className="mt-3 flex items-center justify-between gap-2 border-t border-dashed border-border pt-2.5 text-sm">
                              <Link
                                href={st.itemHref}
                                className="font-medium text-foreground hover:text-primary hover:underline"
                              >
                                {st.itemName}
                              </Link>
                              {price ? (
                                <span className="stall-chip-sm type-nums bg-stamp px-2 py-0.5 text-sm font-medium text-chalk">
                                  {price}
                                </span>
                              ) : null}
                            </div>
                          </div>

                          <div className="mt-2.5 flex items-center justify-between border-t border-border pt-2 text-sm">
                            <ListingScore
                              ratingAvg={st.ratingAvg}
                              reviewCount={st.reviewCount}
                              className="text-sm"
                            />
                            <Link
                              href={`/vendors/${st.slug}`}
                              className="font-medium text-primary hover:underline"
                            >
                              Stall menu →
                            </Link>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="mt-4 bg-receipt p-4 text-sm text-muted-foreground ring-1 ring-border">
                    Visit the market page to browse all stalls at {selectedMarket.name}.
                  </p>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {/* Bottom Full-Width Vendors Directory (#directory-vendors) & BrowseLinks */}
      <section
        id="directory-vendors"
        aria-label="Featured stalls across Toronto markets"
        className="scroll-mt-header mt-10 bg-card p-5 ring-1 ring-board sm:p-6"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <span className="stall-chip-sm flex size-9 shrink-0 items-center justify-center bg-primary text-primary-foreground">
              <PlateMark className="size-5" />
            </span>
            <div>
              <p className="type-kicker text-primary">
                {formatCensus(data.census.vendors)} vendors across {LAUNCH_CITY} markets
              </p>
              <h2 className="mt-0.5">Stalls, menus &amp; where they sell</h2>
            </div>
          </div>
          <Link
            href="/products"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            <span>Search all {formatCensus(data.census.menus)} menu items</span>
            <CaretRightMark className="size-3.5" />
          </Link>
        </div>

        <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.vendorSpotlights.slice(0, 6).map((vendor) => (
            <AtlasVendorDirectoryCard
              key={vendor.id}
              vendor={vendor}
              simulatedPeak={simulatedPeak}
            />
          ))}
        </ul>

        <BrowseLinks className="mt-8" />
      </section>
    </div>
  );
}
