"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
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
import { BrowseLinks } from "@/components/browse-links";
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
  TagMark,
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
const MARKET_LIMIT_STEP = 6;
const VENDOR_LIMIT_STEP = 8;

/**
 * Concept 3 — The Dual-Column Markets & Vendors Atlas + Live Floor Strip
 * Preserves the signature side-by-side Markets + Vendors directory layout of `/markets`
 * (`#directory-markets` + vertical `bg-board` rule + `#directory-vendors`), upgraded with:
 * - Dual-Plate Masthead (7-col Forest-Green Search, All-Filters Drawer & Census Plate + 5-col Featured Market Spotlight Plate)
 * - Above-the-fold Stamp-Bordered Live / Next-Up Floor Strip (`shadow-[inset_4px_0_0_var(--stamp)]`)
 * - Side-by-side Atlas Market Cards (with stall rosters & prices) and Atlas Vendor Cards (with menu items & market hours)
 * - Interactive Map & BrowseLinks
 */
export function MarketsConceptAtlas({
  data,
  clockMode = "saturday",
}: {
  data: MarketsPreviewData;
  clockMode?: "saturday" | "live";
}) {
  const simulatedPeak = clockMode === "saturday";

  const [q, setQ] = useState("");
  const [area, setArea] = useState<string>("all");
  const [category, setCategory] = useState<string>("all");
  const [day, setDay] = useState<string>("all");
  const [setup, setSetup] = useState<string>("all");
  const [openOnly, setOpenOnly] = useState<boolean>(false);
  const [sort, setSort] = useState<SortId>("soonest");
  const [allFiltersOpen, setAllFiltersOpen] = useState<boolean>(false);
  const [floorTab, setFloorTab] = useState<"sat" | "sun" | "midweek">("sat");
  const [spotlightIndex, setSpotlightIndex] = useState<number>(0);
  const [marketLimit, setMarketLimit] = useState<number>(MARKET_LIMIT_STEP);
  const [vendorLimit, setVendorLimit] = useState<number>(VENDOR_LIMIT_STEP);

  const areas = useMemo(() => neighbourhoodOptions(data), [data]);

  const spotlightCandidates = useMemo(() => {
    const seenNeighbourhoods = new Set<string>();
    const picked: typeof data.enrichedMarkets = [];
    for (const m of data.enrichedMarkets) {
      if (m.topStalls.length < 2) continue;
      if (seenNeighbourhoods.has(m.neighbourhood)) continue;
      seenNeighbourhoods.add(m.neighbourhood);
      picked.push(m);
      if (picked.length >= 4) break;
    }
    return picked;
  }, [data.enrichedMarkets]);
  const spotlightMarket =
    spotlightCandidates[spotlightIndex] ??
    spotlightCandidates[0] ??
    data.enrichedMarkets[0];

  const filteredMarkets = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = data.enrichedMarkets.filter((m) => {
      const isOpen = m.open || (simulatedPeak && m.openSaturday);
      if (openOnly && !isOpen) return false;
      if (area !== "all" && m.neighbourhood.toLowerCase() !== area.toLowerCase()) return false;
      if (day === "saturday" && !m.openSaturday) return false;
      if (day === "sunday" && !m.dayNames.some((d) => d.startsWith("Sun"))) return false;
      if (
        day === "midweek" &&
        !m.dayNames.some((d) =>
          ["Mon", "Tue", "Wed", "Thu", "Fri"].some((p) => d.startsWith(p)),
        )
      ) {
        return false;
      }
      if (setup === "Indoor" && m.indoor_outdoor !== "Indoor") return false;
      if (setup === "Outdoor" && m.indoor_outdoor !== "Outdoor") return false;
      if (setup === "year-round" && !m.tags.includes("year-round")) return false;
      if (category !== "all" && !m.topStalls.some((s) => s.categoryId === category)) {
        return false;
      }
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
  }, [data.enrichedMarkets, q, area, category, day, setup, openOnly, sort, simulatedPeak]);

  const filteredVendors = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const matchingSlugs = new Set(filteredMarkets.map((m) => m.slug));
    return data.vendorSpotlights.filter((v) => {
      if (category !== "all" && !v.aisleIds.includes(category)) return false;
      if (
        area !== "all" &&
        !v.markets.some((m) => m.neighbourhood.toLowerCase() === area.toLowerCase())
      ) {
        return false;
      }
      if (day !== "all" || setup !== "all" || openOnly) {
        if (!v.markets.some((m) => matchingSlugs.has(m.slug))) return false;
      }
      if (needle) {
        const hay = `${v.name} ${v.primaryAisleLabel} ${v.items.map((i) => i.name).join(" ")} ${v.markets.map((m) => m.name).join(" ")}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [data.vendorSpotlights, filteredMarkets, q, category, area, day, setup, openOnly]);

  const floorMarkets = useMemo(() => {
    if (floorTab === "sat") {
      return data.enrichedMarkets.filter((m) => m.openSaturday).slice(0, 4);
    }
    if (floorTab === "sun") {
      return data.enrichedMarkets
        .filter((m) => m.dayNames.some((d) => d.startsWith("Sun")))
        .slice(0, 4);
    }
    return data.enrichedMarkets
      .filter((m) =>
        m.dayNames.some((d) =>
          ["Mon", "Tue", "Wed", "Thu", "Fri"].some((p) => d.startsWith(p)),
        ),
      )
      .slice(0, 4);
  }, [data.enrichedMarkets, floorTab]);

  const shownMarkets = filteredMarkets.slice(0, marketLimit);
  const shownVendors = filteredVendors.slice(0, vendorLimit);
  const openCount = simulatedPeak ? data.saturdayOpenCount : data.openNowSlots.length;

  const hasFilters =
    q.trim().length > 0 ||
    area !== "all" ||
    category !== "all" ||
    day !== "all" ||
    setup !== "all" ||
    openOnly;

  function resetAll() {
    setQ("");
    setArea("all");
    setCategory("all");
    setDay("all");
    setSetup("all");
    setOpenOnly(false);
    setMarketLimit(MARKET_LIMIT_STEP);
    setVendorLimit(VENDOR_LIMIT_STEP);
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-7 sm:px-6">
      {/* Top Category & Live Market Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setCategory("all");
              setMarketLimit(MARKET_LIMIT_STEP);
            }}
            className={cn(
              "stall-chip-sm inline-flex cursor-pointer items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors",
              category === "all"
                ? "bg-primary text-primary-foreground"
                : "bg-card text-foreground ring-1 ring-border hover:bg-secondary",
            )}
          >
            <TagMark
              className={cn(
                "size-3.5",
                category === "all" ? "text-primary-foreground" : "text-primary",
              )}
            />
            <span>All specialties</span>
          </button>

          {data.aisles.slice(0, 5).map((cat) => {
            const active = category === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setCategory(active ? "all" : cat.id);
                  setMarketLimit(MARKET_LIMIT_STEP);
                }}
                className={cn(
                  "stall-chip-sm inline-flex cursor-pointer items-center gap-1.5 py-1 pr-3 pl-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-foreground ring-1 ring-border hover:bg-secondary",
                )}
              >
                <ProductThumb src={cat.photoUrl} size="xs" />
                <span>{cat.label}</span>
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
            href="/products"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            <span>Browse product catalogue</span>
            <CaretRightMark className="size-3.5" />
          </Link>
        </div>
      </div>

      {/* Above-the-Fold Dual-Plate Masthead (7-Col Forest-Green Plate + 5-Col Featured Market Spotlight Plate) */}
      <section className="mt-4 grid gap-5 lg:grid-cols-12">
        {/* Left 7 Cols: Forest-Green Search, All-Filters Drawer & Census Plate */}
        <div className="flex flex-col justify-between bg-primary p-6 text-primary-foreground ring-1 ring-board lg:col-span-7">
          <div>
            <p className="type-kicker text-primary-foreground/90">
              Unified markets &amp; stalls directory · {LAUNCH_CITY} &amp; GTA
            </p>
            <h1 className="mt-1 text-primary-foreground">{LAUNCH_CITY} farmers&apos; markets</h1>
            <p className="type-lede mt-2 max-w-2xl text-primary-foreground/95">
              Compare all {formatCensus(data.census.markets)} markets side by side with the{" "}
              {formatCensus(data.census.vendors)} vendors that work them — complete with weekly
              hours, menus, and prices.
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
                    setMarketLimit(MARKET_LIMIT_STEP);
                  }}
                  placeholder={SEARCH_PLACEHOLDER}
                  className="h-9 w-full bg-transparent text-base text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
              </label>

              <button
                type="button"
                aria-expanded={allFiltersOpen}
                onClick={() => setAllFiltersOpen((v) => !v)}
                className={cn(
                  "stall-chip-sm inline-flex h-14 shrink-0 cursor-pointer items-center justify-center px-4 text-sm font-medium ring-1 transition-colors",
                  allFiltersOpen
                    ? "bg-receipt text-primary ring-black/20"
                    : "bg-primary-foreground/15 text-primary-foreground ring-primary-foreground/25 hover:bg-receipt hover:text-primary",
                )}
              >
                {allFiltersOpen ? "Hide filters" : "All filters"}
              </button>

              <a
                href="#directory-markets"
                className="find-go stall-chip inline-flex h-14 shrink-0 cursor-pointer items-center justify-center px-5 text-base font-medium text-receipt hover:brightness-110"
              >
                Find ({filteredMarkets.length})
              </a>
            </div>

            {/* Quick Filter Row */}
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-primary-foreground/15 pt-3.5">
              <select
                aria-label="Day"
                value={day}
                onChange={(e) => {
                  setDay(e.target.value);
                  setMarketLimit(MARKET_LIMIT_STEP);
                }}
                className="h-9 rounded bg-receipt px-2.5 text-sm font-medium text-foreground ring-1 ring-black/15"
              >
                <option value="all">Any day</option>
                <option value="saturday">Saturday ({data.saturdayOpenCount})</option>
                <option value="sunday">Sunday</option>
                <option value="midweek">Midweek (Mon–Fri)</option>
              </select>

              <select
                aria-label="Neighbourhood"
                value={area}
                onChange={(e) => {
                  setArea(e.target.value);
                  setMarketLimit(MARKET_LIMIT_STEP);
                }}
                className="h-9 rounded bg-receipt px-2.5 text-sm font-medium text-foreground ring-1 ring-black/15"
              >
                <option value="all">Any neighbourhood</option>
                {areas.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>

              <select
                aria-label="Setup"
                value={setup}
                onChange={(e) => {
                  setSetup(e.target.value);
                  setMarketLimit(MARKET_LIMIT_STEP);
                }}
                className="h-9 rounded bg-receipt px-2.5 text-sm font-medium text-foreground ring-1 ring-black/15"
              >
                <option value="all">Indoor or outdoor</option>
                <option value="Indoor">Indoor</option>
                <option value="Outdoor">Outdoor</option>
                <option value="year-round">Year-round</option>
              </select>

              <button
                type="button"
                onClick={() => setOpenOnly((v) => !v)}
                className={cn(
                  "stall-chip-sm h-9 cursor-pointer px-3 text-sm font-medium transition-colors",
                  openOnly
                    ? "bg-stamp text-chalk"
                    : "bg-primary-foreground/15 text-primary-foreground hover:bg-receipt hover:text-primary",
                )}
              >
                Open now
              </button>

              {hasFilters ? (
                <button
                  type="button"
                  onClick={resetAll}
                  className="ml-auto cursor-pointer text-sm font-medium text-primary-foreground underline underline-offset-4"
                >
                  Clear all
                </button>
              ) : null}
            </div>

            {/* Expandable All-Filters Drawer inside Plate */}
            {allFiltersOpen ? (
              <div className="mt-4 grid gap-4 rounded bg-receipt p-4 text-foreground ring-1 ring-black/20 sm:grid-cols-3">
                <div>
                  <p className="text-sm font-medium text-primary">When &amp; setup</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(
                      [
                        { id: "all", label: "Any day" },
                        { id: "saturday", label: "Saturday" },
                        { id: "sunday", label: "Sunday" },
                        { id: "midweek", label: "Midweek" },
                      ] as const
                    ).map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setDay(d.id)}
                        className={cn(
                          "cursor-pointer rounded px-2.5 py-1 text-sm font-medium",
                          day === d.id
                            ? "bg-primary text-primary-foreground"
                            : "bg-card text-foreground ring-1 ring-border",
                        )}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-primary">Top districts</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {data.neighbourhoodCircuits.slice(0, 5).map((c) => (
                      <button
                        key={c.label}
                        type="button"
                        onClick={() => setArea(area === c.label ? "all" : c.label)}
                        className={cn(
                          "cursor-pointer rounded px-2.5 py-1 text-sm font-medium",
                          area === c.label
                            ? "bg-board text-chalk"
                            : "bg-card text-foreground ring-1 ring-border",
                        )}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-primary">Product specialties</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {data.aisles.slice(0, 5).map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => setCategory(category === a.id ? "all" : a.id)}
                        className={cn(
                          "cursor-pointer rounded px-2.5 py-1 text-sm font-medium",
                          category === a.id
                            ? "bg-primary text-primary-foreground"
                            : "bg-card text-foreground ring-1 ring-border",
                        )}
                      >
                        {a.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* 3-Stamp Directory Census Strip */}
          <div className="mt-6 border-t border-primary-foreground/15 pt-4">
            <div className="grid grid-cols-3 gap-3">
              <a
                href="#directory-markets"
                className="rounded-lg bg-primary-foreground/12 px-3.5 py-2.5 transition-colors hover:bg-primary-foreground/20"
              >
                <p className="type-census text-2xl text-primary-foreground sm:text-3xl">
                  {formatCensus(data.census.markets)}
                </p>
                <p className="text-sm text-primary-foreground/85">Markets ↓</p>
              </a>
              <a
                href="#directory-vendors"
                className="rounded-lg bg-primary-foreground/12 px-3.5 py-2.5 transition-colors hover:bg-primary-foreground/20"
              >
                <p className="type-census text-2xl text-primary-foreground sm:text-3xl">
                  {formatCensus(data.census.vendors)}
                </p>
                <p className="text-sm text-primary-foreground/85">Vendors ↓</p>
              </a>
              <Link
                href="/products"
                className="rounded-lg bg-primary-foreground/12 px-3.5 py-2.5 transition-colors hover:bg-primary-foreground/20"
              >
                <p className="type-census text-2xl text-primary-foreground sm:text-3xl">
                  {formatCensus(data.census.menus)}
                </p>
                <p className="text-sm text-primary-foreground/85">Menu items →</p>
              </Link>
            </div>
          </div>
        </div>

        {/* Right 5 Cols: Featured Market & Anchor Stalls Spotlight Plate */}
        <div className="flex flex-col justify-between bg-card ring-1 ring-board lg:col-span-5">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-receipt px-5 py-3">
              <div className="flex items-center gap-2">
                <PlateMark className="size-4 text-primary" />
                <p className="type-kicker font-medium text-foreground">
                  Featured market spotlight
                </p>
              </div>
              <div className="flex flex-wrap gap-1">
                {spotlightCandidates.map((cand, idx) => (
                  <button
                    key={cand.slug}
                    type="button"
                    onClick={() => setSpotlightIndex(idx)}
                    className={cn(
                      "cursor-pointer rounded px-2 py-0.5 text-sm font-medium transition-colors",
                      idx === spotlightIndex
                        ? "bg-stamp text-chalk"
                        : "bg-card text-foreground ring-1 ring-border hover:bg-secondary",
                    )}
                  >
                    {cand.neighbourhood}
                  </button>
                ))}
              </div>
            </div>

            {spotlightMarket ? (
              <div className="p-5">
                <ProductPhotoFrame
                  name={spotlightMarket.primaryCategoryLabel}
                  photo={
                    spotlightMarket.bannerPhotoUrl
                      ? {
                          url: spotlightMarket.bannerPhotoUrl,
                          alt: spotlightMarket.bannerPhotoAlt,
                        }
                      : null
                  }
                  className="aspect-[16/9] w-full border border-border"
                />

                <div className="mt-4 bg-receipt p-3.5 ring-1 ring-border shadow-[inset_3px_0_0_var(--primary)]">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3">
                    <div className="flex min-w-0 items-start gap-2.5">
                      <StallEmblem
                        src={spotlightMarket.logo_url}
                        name={spotlightMarket.name}
                        kind="market"
                        size="sm"
                        tone="paper"
                        className="mt-0.5"
                      />
                      <div className="min-w-0">
                        <Link
                          href={`/markets/${spotlightMarket.slug}`}
                          className="block text-base font-medium text-foreground hover:text-primary hover:underline"
                        >
                          {spotlightMarket.name}
                        </Link>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {spotlightMarket.neighbourhood} · {spotlightMarket.vendorCount} stalls
                        </p>
                      </div>
                    </div>
                    <SessionLines
                      sessions={spotlightMarket.sessions.slice(0, 2)}
                      fallback={spotlightMarket.nextOpen}
                    />
                  </div>

                  {spotlightMarket.topStalls.length > 0 ? (
                    <ul className="mt-3 divide-y divide-dashed divide-border border-t border-dashed border-border pt-2">
                      {spotlightMarket.topStalls.slice(0, 2).map((st) => {
                        const price = formatPrice(st.priceCents);
                        return (
                          <li
                            key={st.slug}
                            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 py-1.5 text-sm"
                          >
                            <div className="flex min-w-0 items-center gap-2">
                              <StallEmblem
                                src={st.logoUrl}
                                name={st.name}
                                kind="vendor"
                                size="xs"
                              />
                              <Link
                                href={`/vendors/${st.slug}`}
                                className="font-medium text-foreground hover:text-primary hover:underline"
                              >
                                {st.name}
                              </Link>
                              <span className="text-muted-foreground">· {st.itemName}</span>
                            </div>
                            {price ? (
                              <span className="stall-chip-sm type-nums bg-stamp px-2 py-0.5 text-sm font-medium text-chalk">
                                {price}
                              </span>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-receipt px-5 py-3 text-sm">
            <span className="font-medium text-muted-foreground">
              Side-by-side directory below:
            </span>
            <div className="flex items-center gap-3">
              <a
                href="#directory-markets"
                className="font-medium text-primary hover:underline"
              >
                {filteredMarkets.length} markets ↓
              </a>
              <a
                href="#directory-vendors"
                className="font-medium text-primary hover:underline"
              >
                {filteredVendors.length} stalls ↓
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Stamp-Bordered Live / Next-Up Floor Strip (Direct sibling to HomeAtlas MastheadLiveFloorStrip) */}
      <nav
        aria-label="Live and upcoming market sessions"
        className="mt-6 bg-card shadow-[inset_4px_0_0_var(--stamp)] ring-1 ring-board"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-secondary/55 px-4 py-2.5">
          <div className="flex flex-wrap items-center gap-3">
            <NowLabel className="text-base">
              <span>
                <span className="type-nums font-semibold">{data.saturdayOpenCount}</span>{" "}
                Saturday markets ·{" "}
                <span className="type-nums font-semibold">{data.saturdayStallCount}</span>{" "}
                stalls on the schedule
              </span>
            </NowLabel>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: "sat", label: `Saturday (${data.saturdayOpenCount})` },
                { id: "sun", label: "Sunday" },
                { id: "midweek", label: "Midweek" },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setFloorTab(t.id)}
                className={cn(
                  "stall-chip-sm cursor-pointer px-2.5 py-1 text-sm font-medium transition-colors",
                  floorTab === t.id
                    ? "bg-stamp text-receipt"
                    : "bg-card text-foreground ring-1 ring-border hover:bg-secondary",
                )}
              >
                {t.label}
              </button>
            ))}
            <Link
              href="/markets/open-today"
              className="ml-1 text-sm font-medium text-primary underline underline-offset-4"
            >
              Full day schedule
            </Link>
          </div>
        </div>

        <ul className="grid gap-px bg-border md:grid-cols-2">
          {floorMarkets.map((slot) => (
            <li
              key={slot.id}
              className="flex flex-col justify-between bg-card px-4 py-3 transition-colors hover:bg-secondary/35"
            >
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3">
                <div className="flex min-w-0 items-start gap-2.5">
                  <StallEmblem
                    src={slot.logo_url}
                    name={slot.name}
                    kind="market"
                    size="sm"
                    className="mt-0.5"
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <Link
                        href={`/markets/${slot.slug}`}
                        className="text-base font-medium text-foreground hover:text-primary hover:underline"
                      >
                        <VerifiedName slug={slot.slug} name={slot.name} />
                      </Link>
                      <ListingScore
                        parens
                        ratingAvg={slot.rating_avg}
                        reviewCount={slot.review_count}
                        className="text-sm text-stamp"
                      />
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      <button
                        type="button"
                        onClick={() => setArea(slot.neighbourhood)}
                        className="cursor-pointer font-medium text-primary hover:underline"
                      >
                        {slot.neighbourhood}
                      </button>{" "}
                      · <span className="type-nums">{slot.vendorCount}</span> stalls
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-start gap-2.5">
                  <div className="text-right">
                    <Hours
                      value={slot.saturdayHours ?? slot.hours}
                      className="whitespace-nowrap font-medium text-stamp"
                    />
                  </div>
                  <SaveButton kind="market" slug={slot.slug} name={slot.name} size="sm" />
                </div>
              </div>

              {slot.topStalls.length > 0 ? (
                <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-dashed border-border pt-2 pl-10">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-sm text-muted-foreground">Stalls here:</span>
                    {slot.topStalls.slice(0, 2).map((v) => (
                      <Link
                        key={v.slug}
                        href={`/vendors/${v.slug}`}
                        className="stall-chip-sm inline-flex items-center gap-1.5 bg-secondary/70 py-0.5 pr-2 pl-1 text-sm font-medium text-foreground ring-1 ring-border hover:bg-primary hover:text-primary-foreground"
                      >
                        <StallEmblem src={v.logoUrl} name={v.name} kind="vendor" size="xs" />
                        <span>{v.name}</span>
                      </Link>
                    ))}
                  </div>
                  <Link
                    href={`/markets/${slot.slug}`}
                    className="shrink-0 text-sm font-medium text-primary hover:underline"
                  >
                    Market roster →
                  </Link>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </nav>

      {/* Upgraded Side-by-Side Dual Directory: Markets (Left) | Vertical Board Rule | Vendors (Right) */}
      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,5fr)_auto_minmax(0,7fr)] lg:gap-x-6">
        {/* Left 5fr Column: Markets Directory (#directory-markets) */}
        <section id="directory-markets" className="scroll-mt-header">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 bg-card px-4 py-3 ring-1 ring-board">
            <div className="flex items-center gap-2.5">
              <span className="stall-chip-sm flex size-8 shrink-0 items-center justify-center bg-primary text-primary-foreground">
                <RulesMark className="size-4" />
              </span>
              <div>
                <p className="type-kicker text-primary">
                  {filteredMarkets.length} {filteredMarkets.length === 1 ? "market" : "markets"}
                </p>
                <h2>Markets</h2>
              </div>
            </div>

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
          </div>

          {shownMarkets.length > 0 ? (
            <ul className="grid gap-5">
              {shownMarkets.map((market) => (
                <AtlasMarketCard
                  key={market.id}
                  market={market}
                  simulatedPeak={simulatedPeak}
                  onSelectNeighbourhood={(n) => setArea(area === n ? "all" : n)}
                />
              ))}
            </ul>
          ) : (
            <div className="bg-card p-6 text-center ring-1 ring-board">
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
            <button
              type="button"
              onClick={() => setMarketLimit((prev) => prev + MARKET_LIMIT_STEP)}
              className="stall-chip-sm mt-4 w-full cursor-pointer bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Show more markets ({filteredMarkets.length - shownMarkets.length} remaining)
            </button>
          ) : null}
        </section>

        {/* Signature Vertical Board Divider Rule */}
        <div
          aria-hidden
          data-directory-rule
          className="hidden w-0.5 self-stretch bg-board lg:block"
        />

        {/* Right 7fr Column: Vendors Directory (#directory-vendors) + Interactive Map */}
        <section id="directory-vendors" className="scroll-mt-header flex flex-col gap-6">
          <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 bg-card px-4 py-3 ring-1 ring-board">
              <div className="flex items-center gap-2.5">
                <span className="stall-chip-sm flex size-8 shrink-0 items-center justify-center bg-board text-chalk">
                  <CrateMark className="size-4" />
                </span>
                <div>
                  <p className="type-kicker text-primary">
                    {formatCensus(data.census.vendors)} total · {filteredVendors.length} featured
                    with menus
                  </p>
                  <h2>Vendors &amp; stalls</h2>
                </div>
              </div>

              <Link
                href="/products"
                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                <span>Search all products</span>
                <CaretRightMark className="size-3.5" />
              </Link>
            </div>

            {shownVendors.length > 0 ? (
              <ul className="grid gap-4 sm:grid-cols-2">
                {shownVendors.map((vendor) => (
                  <AtlasVendorDirectoryCard
                    key={vendor.id}
                    vendor={vendor}
                    simulatedPeak={simulatedPeak}
                  />
                ))}
              </ul>
            ) : (
              <div className="bg-card p-6 text-center ring-1 ring-board">
                <p className="text-base text-muted-foreground">No vendors match those filters.</p>
                <button
                  type="button"
                  onClick={resetAll}
                  className="mt-2 cursor-pointer font-medium text-primary hover:underline"
                >
                  Reset filters
                </button>
              </div>
            )}

            {filteredVendors.length > shownVendors.length ? (
              <button
                type="button"
                onClick={() => setVendorLimit((prev) => prev + VENDOR_LIMIT_STEP)}
                className="stall-chip-sm mt-4 w-full cursor-pointer bg-board py-2.5 text-sm font-medium text-chalk hover:brightness-110"
              >
                Show more vendors ({filteredVendors.length - shownVendors.length} remaining)
              </button>
            ) : null}
          </div>

          {/* Interactive Map Card under Vendors Column */}
          <div className="bg-card ring-1 ring-board">
            <div className="flex items-center justify-between gap-2 border-b border-border bg-secondary/50 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <span className="stall-chip-sm flex size-8 shrink-0 items-center justify-center bg-primary text-primary-foreground">
                  <BlocksMark className="size-4" />
                </span>
                <div>
                  <p className="type-kicker text-muted-foreground">
                    Pinned across {LAUNCH_CITY} &amp; the GTA
                  </p>
                  <h3>Market locations map</h3>
                </div>
              </div>
              <span className="type-nums text-sm font-medium text-primary">
                {filteredMarkets.length} pinned
              </span>
            </div>
            <MarketMapLazy
              markets={filteredMarkets}
              load="visible"
              className="h-64 w-full"
            />
          </div>
        </section>
      </div>

      <div className="mt-10 bg-card p-5 ring-1 ring-board sm:p-6">
        <BrowseLinks />
      </div>
    </div>
  );
}
