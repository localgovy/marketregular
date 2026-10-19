"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { HomePreviewData } from "@/app/preview/_lib/home-preview-data";
import { AddressLink } from "@/components/address-link";
import { useGeo } from "@/components/geo-provider";
import { Hours } from "@/components/hours";
import { ListingScore } from "@/components/listing-score";
import {
  AsteriskMark,
  BlocksMark,
  CrateMark,
  MapleMark,
  PlateMark,
  SignMark,
  TagMark,
  TallyMark,
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
import { SEARCH_LABEL, SEARCH_PLACEHOLDER } from "@/lib/constants";
import { marketsHref, tagLabel } from "@/lib/find-paths";
import { LAUNCH_CITY } from "@/lib/launch";
import { cn } from "@/lib/utils";

function formatCensus(n: number) {
  return n.toLocaleString("en-CA");
}

const CRAVING_SHORTCUTS = [
  { label: "Sourdough", href: "/find/sourdough" },
  { label: "Butter tarts", href: "/find/butter-tarts" },
  { label: "Heirloom tomatoes", href: "/find/tomatoes" },
  { label: "Ontario apples", href: "/find/apples" },
  { label: "Bagels", href: "/find/bagels" },
  { label: "Smoked fish", href: "/find/smoked-fish" },
  { label: "Garlic", href: "/find/garlic" },
  { label: "Farm eggs", href: "/find/eggs" },
] as const;

export function ConceptNeighbourhoodAtlas({
  data,
  standalone = false,
}: {
  data: HomePreviewData;
  standalone?: boolean;
}) {
  const router = useRouter();
  const { coords, requestAsync } = useGeo();

  const [q, setQ] = useState("");
  const [locating, setLocating] = useState(false);
  const [selectedAisleId, setSelectedAisleId] = useState<string>(
    data.aisles[0]?.id ?? "bakery",
  );
  const [selectedCircuitIndex, setSelectedCircuitIndex] = useState<number>(0);

  const activeAisle =
    data.aisles.find((a) => a.id === selectedAisleId) ?? data.aisles[0] ?? null;
  const activeCircuit =
    data.neighbourhoodCircuits[selectedCircuitIndex] ??
    data.neighbourhoodCircuits[0] ??
    null;

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
    <div className="bg-background text-foreground">
      {/* Top Canadian Banner + Open Now Pulse */}
      <div className="border-b border-board bg-secondary">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-2.5 lg:px-6">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="inline-flex items-center gap-2 text-sm font-medium text-board">
              <MapleMark className="h-4 w-8 shrink-0 text-stamp shadow-[0_0_0_1px_rgba(0,0,0,0.18)]" />
              <span>Made by Canadians, for Canadians, to shop Canadian.</span>
            </span>
            <span aria-hidden className="hidden text-muted-foreground sm:inline">
              ·
            </span>
            <span className="type-nums text-sm text-muted-foreground">
              {LAUNCH_CITY} neighbourhood &amp; product atlas · {data.todayFormatted}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            {data.openNowSlots.length > 0 ? (
              <Link href="/markets/open-today" className="hover:underline">
                <NowLabel>
                  <span>
                    <span className="type-nums">{data.openNowSlots.length}</span>{" "}
                    {data.openNowSlots.length === 1 ? "hall open now" : "halls open now"}
                  </span>
                </NowLabel>
              </Link>
            ) : null}
            <Link href="/products" className="font-medium text-primary hover:underline">
              Full product catalogue
            </Link>
            <span aria-hidden className="text-muted-foreground">
              ·
            </span>
            <Link href="/events" className="font-medium text-primary hover:underline">
              Month calendar
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 lg:px-6 lg:py-8">
        {/* Masthead + Craving Search Deck */}
        <header className="border-b-2 border-board pb-6">
          <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-7">
              <p className="type-kicker font-medium text-primary">
                Explore by neighbourhood walk or what is on the tables
              </p>
              <h1 className="mt-1">{LAUNCH_CITY} farmers&apos; markets</h1>
              <p className="type-lede mt-2 max-w-2xl text-muted-foreground">
                Start with a craving — sourdough, butter tarts, heirloom produce — or pick a{" "}
                {LAUNCH_CITY} neighbourhood on the atlas to see every stall and schedule.
              </p>
            </div>

            {/* 3-Stamp Ticket Strip */}
            <div className="lg:col-span-5">
              <nav
                aria-label="On the directory"
                className="grid grid-cols-3 divide-x divide-border bg-card ring-1 ring-board"
              >
                <Link
                  href="/markets"
                  className="flex flex-col justify-between p-3.5 transition-colors hover:bg-secondary/60"
                >
                  <span className="type-kicker text-muted-foreground">Atlas</span>
                  <span className="type-census mt-1 text-3xl leading-none text-board sm:text-4xl">
                    {formatCensus(data.census.markets)}
                  </span>
                  <span className="mt-1 text-sm font-medium text-primary">markets</span>
                </Link>
                <Link
                  href="/markets#directory-vendors"
                  className="flex flex-col justify-between p-3.5 transition-colors hover:bg-secondary/60"
                >
                  <span className="type-kicker text-muted-foreground">Stalls</span>
                  <span className="type-census mt-1 text-3xl leading-none text-board sm:text-4xl">
                    {formatCensus(data.census.vendors)}
                  </span>
                  <span className="mt-1 text-sm font-medium text-primary">vendors</span>
                </Link>
                <Link
                  href="/products"
                  className="flex flex-col justify-between p-3.5 transition-colors hover:bg-secondary/60"
                >
                  <span className="type-kicker text-muted-foreground">Tables</span>
                  <span className="type-census mt-1 text-3xl leading-none text-stamp sm:text-4xl">
                    {formatCensus(data.census.menus)}
                  </span>
                  <span className="mt-1 text-sm font-medium text-stamp">menu items</span>
                </Link>
              </nav>
            </div>
          </div>

          {/* Search & Craving Shortcut Bar */}
          <div className="mt-5 bg-panel-find text-primary-foreground ring-1 ring-board">
            <div className="awning-leaf h-[7px] w-full" aria-hidden />
            <div className="p-4 sm:p-5">
              <form
                action="/markets"
                className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-center"
              >
                <div>
                  <label className="sr-only" htmlFor="atlas-search">
                    {SEARCH_LABEL}
                  </label>
                  <SearchField
                    id="atlas-search"
                    value={q}
                    onChange={setQ}
                    placeholder={SEARCH_PLACEHOLDER}
                  />
                  {q.trim() ? <input type="hidden" name="q" value={q.trim()} /> : null}
                </div>

                <button
                  type="button"
                  onClick={() => void handleNearMe()}
                  className="find-chip inline-flex h-12 cursor-pointer items-center justify-center border border-chalk/65 bg-chalk/10 px-4 text-sm font-medium text-primary-foreground hover:bg-chalk/20"
                >
                  {locating ? "Locating…" : "Markets near me"}
                </button>

                <button
                  type="submit"
                  className="find-go stall-chip inline-flex h-12 shrink-0 cursor-pointer items-center justify-between gap-4 px-5 text-receipt hover:brightness-110"
                >
                  <span className="type-column text-receipt">Search directory</span>
                  <span className="text-base font-medium text-receipt">Go</span>
                </button>
              </form>

              <div className="mt-3.5 flex flex-wrap items-center gap-1.5 border-t border-primary-foreground/20 pt-3">
                <span className="type-kicker mr-1 text-chalk">Craving right now:</span>
                {CRAVING_SHORTCUTS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="stall-chip-sm bg-primary-foreground/15 px-2.5 py-1 text-sm font-medium text-primary-foreground transition-colors hover:bg-card hover:text-primary"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </header>

        {/* Above-the-Fold Split Hero: 6-Col Craving & Aisle Crate Explorer + 6-Col Live Neighbourhood Atlas */}
        <section
          aria-label="Craving Crate Explorer and Live Atlas"
          className="mt-8 grid gap-8 lg:grid-cols-12 lg:items-start"
        >
          {/* Left 6 Columns: Interactive Craving & Aisle Crate Explorer */}
          <div className="bg-card ring-1 ring-board lg:col-span-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b-2 border-board bg-secondary px-4 py-3">
              <div className="flex items-center gap-2.5">
                <span className="stall-chip-sm flex size-8 shrink-0 items-center justify-center bg-primary text-primary-foreground">
                  <TagMark className="size-4" />
                </span>
                <div>
                  <p className="type-kicker text-muted-foreground">
                    Browse {formatCensus(data.census.menus)} items by crate
                  </p>
                  <h2>What are you shopping for?</h2>
                </div>
              </div>
              <Link
                href="/products"
                className="text-sm font-medium text-primary underline underline-offset-4"
              >
                All aisles
              </Link>
            </div>

            {/* Aisle Selector Tabs */}
            <div
              role="tablist"
              aria-label="Select product aisle"
              className="flex flex-wrap gap-1.5 border-b border-border bg-secondary/35 px-4 py-3"
            >
              {data.aisles.slice(0, 8).map((aisle) => {
                const selected = activeAisle?.id === aisle.id;
                return (
                  <button
                    key={aisle.id}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => setSelectedAisleId(aisle.id)}
                    className={cn(
                      "stall-chip-sm inline-flex cursor-pointer items-baseline gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors",
                      selected
                        ? "bg-board text-chalk"
                        : "bg-card text-foreground ring-1 ring-border hover:bg-secondary",
                    )}
                  >
                    <span>{aisle.label}</span>
                    <span
                      className={cn(
                        "type-nums text-sm",
                        selected ? "text-chalk/80" : "text-stamp",
                      )}
                    >
                      {aisle.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Featured Active Aisle Crate Spotlight */}
            {activeAisle ? (
              <div className="p-4 sm:p-5">
                <div className="grid gap-4 sm:grid-cols-[200px_minmax(0,1fr)] sm:items-start">
                  <Link href={`/products?aisle=${activeAisle.id}`} className="block">
                    <ProductPhotoFrame
                      name={activeAisle.label}
                      decorative
                      photo={
                        activeAisle.photoUrl
                          ? {
                              url: activeAisle.photoUrl,
                              alt: activeAisle.photoAlt ?? activeAisle.label,
                            }
                          : null
                      }
                      className="h-40 w-full aspect-auto border border-border"
                    />
                  </Link>
                  <div className="flex flex-col justify-between">
                    <div>
                      <div className="flex items-baseline justify-between gap-2">
                        <h3>
                          <Link
                            href={`/products?aisle=${activeAisle.id}`}
                            className="hover:underline"
                          >
                            {activeAisle.label}
                          </Link>
                        </h3>
                        <span className="type-nums text-sm font-medium text-stamp">
                          {activeAisle.count} product guides
                        </span>
                      </div>
                      <p className="mt-1.5 text-base leading-snug text-muted-foreground">
                        {activeAisle.line}
                      </p>

                      {activeAisle.sampleTerms.length > 0 ? (
                        <div className="mt-3">
                          <p className="type-kicker text-muted-foreground">
                            Popular tables in this aisle:
                          </p>
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {activeAisle.sampleTerms.map((term) => (
                              <Link
                                key={term.slug}
                                href={`/find/${term.slug}`}
                                className="stall-chip-sm bg-secondary px-3 py-1 text-sm font-medium text-foreground hover:bg-primary hover:text-primary-foreground"
                              >
                                {term.term}
                              </Link>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-3">
                      <Link
                        href={`/products?aisle=${activeAisle.id}`}
                        className="stall-chip-sm inline-flex h-9 items-center bg-primary px-3.5 text-sm font-medium text-primary-foreground hover:brightness-110"
                      >
                        Explore {activeAisle.label.toLowerCase()}
                      </Link>
                      <Link
                        href={`/markets?q=${encodeURIComponent(activeAisle.label)}`}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        Find markets with {activeAisle.label.toLowerCase()}
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Secondary 4-Card Aisle Strip */}
                <div className="mt-5 border-t border-border pt-4">
                  <p className="type-kicker mb-2.5 text-muted-foreground">
                    More crates on the market floor
                  </p>
                  <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {data.aisles
                      .filter((a) => a.id !== activeAisle.id)
                      .slice(0, 4)
                      .map((aisle) => (
                        <li
                          key={aisle.id}
                          className="bg-secondary/45 p-2.5 ring-1 ring-border transition-colors hover:bg-secondary"
                        >
                          <button
                            type="button"
                            onClick={() => setSelectedAisleId(aisle.id)}
                            className="w-full cursor-pointer text-left"
                          >
                            <ProductPhotoFrame
                              name={aisle.label}
                              decorative
                              photo={
                                aisle.photoUrl
                                  ? {
                                      url: aisle.photoUrl,
                                      alt: aisle.photoAlt ?? aisle.label,
                                    }
                                  : null
                              }
                              className="mb-2 h-16 w-full aspect-auto border border-border/70"
                            />
                            <p className="text-sm font-medium text-foreground">{aisle.label}</p>
                            <p className="type-nums text-sm text-stamp">{aisle.count} items</p>
                          </button>
                        </li>
                      ))}
                  </ul>
                </div>
              </div>
            ) : null}
          </div>

          {/* Right 6 Columns: Live Interactive Neighbourhood Atlas + Circuit Inspector */}
          <div className="bg-card ring-1 ring-board lg:col-span-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b-2 border-board bg-secondary px-4 py-3">
              <div className="flex items-center gap-2.5">
                <span className="stall-chip-sm flex size-8 shrink-0 items-center justify-center bg-board text-chalk">
                  <BlocksMark className="size-4" />
                </span>
                <div>
                  <p className="type-kicker text-muted-foreground">
                    {formatCensus(data.census.markets)} halls pinned across {LAUNCH_CITY}
                  </p>
                  <h2>Live Neighbourhood Atlas</h2>
                </div>
              </div>
              <Link
                href="/markets"
                className="text-sm font-medium text-primary underline underline-offset-4"
              >
                Full screen map
              </Link>
            </div>

            {/* Live Map Above the Fold */}
            <div className="border-b border-border">
              <MarketMapLazy load="visible" className="h-60 w-full overflow-hidden" />
            </div>

            {/* Neighbourhood Circuit Selector Strip */}
            <div className="border-b border-border bg-secondary/40 px-4 py-3">
              <p className="type-kicker mb-2 text-muted-foreground">
                Inspect a neighbourhood market walk:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {data.neighbourhoodCircuits.slice(0, 7).map((circuit, idx) => {
                  const selected = idx === selectedCircuitIndex;
                  return (
                    <button
                      key={circuit.label}
                      type="button"
                      onClick={() => setSelectedCircuitIndex(idx)}
                      className={cn(
                        "stall-chip-sm inline-flex cursor-pointer items-baseline gap-1.5 px-3 py-1 text-sm font-medium transition-colors",
                        selected
                          ? "bg-board text-chalk"
                          : "bg-card text-foreground ring-1 ring-border hover:bg-secondary",
                      )}
                    >
                      <span>{circuit.label}</span>
                      <span
                        className={cn(
                          "type-nums text-sm",
                          selected ? "text-chalk/80" : "text-muted-foreground",
                        )}
                      >
                        {circuit.marketCount}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active Neighbourhood Circuit Hall List */}
            {activeCircuit ? (
              <div>
                <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-4 py-2.5">
                  <div className="flex items-baseline gap-2">
                    <h3>{activeCircuit.label}</h3>
                    <span className="type-nums text-sm text-muted-foreground">
                      {activeCircuit.vendorCount > 0
                        ? `${activeCircuit.vendorCount} stalls registered`
                        : `${activeCircuit.marketCount} hall`}
                    </span>
                  </div>
                  <Link
                    href={`/markets?area=${encodeURIComponent(activeCircuit.q)}`}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    Filter directory to {activeCircuit.label}
                  </Link>
                </div>

                <ul className="divide-y divide-border">
                  {[
                    ...activeCircuit.topMarkets,
                    ...data.directoryMarkets.filter(
                      (m) => !activeCircuit.topMarkets.some((tm) => tm.id === m.id),
                    ),
                  ]
                    .slice(0, 3)
                    .map((market, idx) => {
                      const isPrimary = idx < activeCircuit.topMarkets.length;
                      return (
                        <li key={market.id} className="px-4 py-3 hover:bg-secondary/40">
                          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3">
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
                                {!isPrimary ? (
                                  <span className="ml-2 text-sm text-muted-foreground">
                                    · Nearby ({market.neighbourhood})
                                  </span>
                                ) : null}
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
                            </div>

                            <div className="flex shrink-0 items-center gap-3">
                              <div className="text-right">
                                {market.open ? (
                                  <NowLabel>Open now</NowLabel>
                                ) : (
                                  <span className="type-nums whitespace-nowrap text-sm font-medium text-foreground">
                                    {market.nextOpen}
                                  </span>
                                )}
                                <p className="type-nums whitespace-nowrap text-sm text-muted-foreground">
                                  {market.scheduleSummary}
                                </p>
                              </div>
                              <SaveButton kind="market" slug={market.slug} name={market.name} />
                            </div>
                          </div>
                        </li>
                      );
                    })}
                </ul>
              </div>
            ) : null}
          </div>
        </section>

        {/* Full-Width Section: Toronto Neighbourhood Market Walks (6 District Cards) */}
        <section
          aria-label="Neighbourhood market walks"
          className="mt-10 border-t-2 border-board pt-8"
        >
          <div className="flex flex-wrap items-end justify-between gap-3 pb-5">
            <div className="flex items-start gap-3">
              <span className="stall-chip-sm mt-0.5 flex size-9 shrink-0 items-center justify-center bg-primary text-primary-foreground">
                <PlateMark className="size-5" />
              </span>
              <div>
                <p className="type-kicker text-muted-foreground">
                  Every major market district in {LAUNCH_CITY} &amp; the GTA
                </p>
                <h2>Neighbourhood Market Walks</h2>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {data.setupOptions.slice(0, 4).map((tag) => (
                <Link
                  key={tag}
                  href={`/markets?tag=${encodeURIComponent(tag)}`}
                  className="stall-chip-sm bg-secondary px-3 py-1 text-sm font-medium text-foreground hover:bg-board hover:text-chalk"
                >
                  {tagLabel(tag)}
                </Link>
              ))}
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {data.neighbourhoodCircuits.slice(0, 6).map((circuit) => (
              <div
                key={circuit.label}
                className="flex flex-col justify-between bg-card ring-1 ring-border"
              >
                <div>
                  <div className="flex items-baseline justify-between gap-2 border-b border-border bg-secondary/55 px-4 py-3">
                    <h3>
                      <Link
                        href={`/markets?area=${encodeURIComponent(circuit.q)}`}
                        className="hover:underline"
                      >
                        {circuit.label}
                      </Link>
                    </h3>
                    <span className="type-nums text-sm font-medium text-primary">
                      {circuit.vendorCount > 0
                        ? `${circuit.vendorCount} stalls`
                        : `${circuit.marketCount} ${circuit.marketCount === 1 ? "market" : "markets"}`}
                    </span>
                  </div>

                  <ul className="divide-y divide-border/70">
                    {circuit.topMarkets.slice(0, 2).map((market) => (
                      <li key={market.id} className="px-4 py-3 hover:bg-secondary/35">
                        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3">
                          <div className="min-w-0">
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
                              className="ml-1.5 text-stamp"
                            />
                            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
                              {market.open ? <NowLabel>Open</NowLabel> : null}
                              <span className="type-nums whitespace-nowrap">
                                {market.scheduleSummary}
                              </span>
                            </p>
                          </div>
                          <SaveButton kind="market" slug={market.slug} name={market.name} />
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex items-center justify-between border-t border-border bg-secondary/25 px-4 py-2.5 text-sm">
                  <span className="text-muted-foreground">
                    {circuit.marketCount} {circuit.marketCount === 1 ? "hall" : "halls"} in area
                  </span>
                  <Link
                    href={`/markets?area=${encodeURIComponent(circuit.q)}`}
                    className="font-medium text-primary hover:underline"
                  >
                    Explore {circuit.label}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Bottom 12-Col Spread: 8-Col Stalls & Regulars Showcase + 4-Col Timetable & Saved Rail */}
        <section
          aria-label="Stalls, notes, and upcoming timetable"
          className="mt-10 border-t-2 border-board pt-8 pb-4"
        >
          <div className="grid gap-8 lg:grid-cols-12 lg:items-start">
            {/* Left 8 Columns: Active Stalls + Top 5 This Week + Shopper Notes */}
            <div className="flex flex-col gap-6 lg:col-span-8">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Active Vendors Today */}
                <div className="bg-card ring-1 ring-border">
                  <div className="flex items-start justify-between gap-2 border-b border-border bg-secondary/50 px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="stall-chip-sm flex size-8 shrink-0 items-center justify-center bg-stamp/15 text-stamp">
                        <CrateMark className="size-4" />
                      </span>
                      <div>
                        <p className="type-kicker text-muted-foreground">Selling today</p>
                        <h3>Stalls on the floor</h3>
                      </div>
                    </div>
                    <span className="type-nums text-sm font-medium text-primary">
                      {data.sellingToday.length} active
                    </span>
                  </div>
                  <ul>
                    {data.sellingToday.slice(0, 5).map((row) => (
                      <VendorTodayItem
                        key={`${row.vendorSlug}-${row.marketSlug}`}
                        row={row}
                      />
                    ))}
                  </ul>
                </div>

                {/* Top 5 Stalls This Week */}
                <div className="bg-card ring-1 ring-border">
                  <div className="flex items-start justify-between gap-2 border-b border-border bg-secondary/50 px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="stall-chip-sm flex size-8 shrink-0 items-center justify-center bg-foreground text-receipt">
                        <TallyMark className="size-4" />
                      </span>
                      <div>
                        <p className="type-kicker text-muted-foreground">Regulars&apos; picks</p>
                        <h3>Top 5 stalls this week</h3>
                      </div>
                    </div>
                    <Link
                      href="/markets#directory-vendors"
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      All stalls
                    </Link>
                  </div>
                  <ol>
                    {data.weekVendors.slice(0, 5).map((pick, index) => (
                      <VendorWeekItem key={pick.vendorSlug} pick={pick} index={index} />
                    ))}
                  </ol>
                </div>
              </div>

              {/* Recent Shopper Notes From the Floor */}
              <div className="bg-card ring-1 ring-border">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-secondary/50 px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <span className="stall-chip-sm flex size-8 shrink-0 items-center justify-center bg-board text-chalk">
                      <AsteriskMark className="size-4" />
                    </span>
                    <div>
                      <p className="type-kicker text-muted-foreground">
                        Live from the group chat at the stalls
                      </p>
                      <h3>Recent shopper notes &amp; finds</h3>
                    </div>
                  </div>
                  <Link href="/feed" className="text-sm font-medium text-primary hover:underline">
                    View all posts
                  </Link>
                </div>
                <ol className="grid divide-y divide-border md:grid-cols-2 md:divide-x md:divide-y-0">
                  {data.tape.slice(0, 2).map((item) => (
                    <ReviewCard key={item.id} item={item} />
                  ))}
                </ol>
              </div>
            </div>

            {/* Right 4 Columns: Saved Rail + Compact Upcoming Timetable + Field Dispatch */}
            <aside className="flex flex-col gap-6 lg:col-span-4">
              <SavedRail />

              {/* Compact Next Market Sessions Card */}
              <div className="bg-card ring-1 ring-border">
                <div className="flex items-center justify-between gap-2 border-b border-border bg-secondary/50 px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <span className="stall-chip-sm flex size-8 shrink-0 items-center justify-center bg-primary text-primary-foreground">
                      <WeekMark className="size-4" />
                    </span>
                    <div>
                      <p className="type-kicker text-muted-foreground">Next on the calendar</p>
                      <h2 className="type-column">Upcoming sessions</h2>
                    </div>
                  </div>
                  <Link href="/events" className="text-sm font-medium text-primary hover:underline">
                    Calendar
                  </Link>
                </div>

                <div className="divide-y divide-border">
                  {data.fullWeek
                    .filter((g) => g.slots.length > 0)
                    .slice(0, 3)
                    .map((group) => (
                      <div key={group.id} className="p-3.5">
                        <div className="flex items-baseline justify-between gap-2">
                          <h3>{group.label}</h3>
                          <span className="type-nums text-sm text-primary">{group.date}</span>
                        </div>
                        <ul className="mt-2 space-y-2">
                          {group.slots.slice(0, 3).map((slot) => (
                            <li
                              key={slot.id}
                              className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3"
                            >
                              <Link
                                href={`/markets/${slot.slug}`}
                                className="text-base font-medium hover:underline"
                              >
                                <VerifiedName slug={slot.slug} name={slot.name} />
                              </Link>
                              <Hours
                                value={slot.hours}
                                className={
                                  slot.open ? "font-medium text-stamp" : "text-muted-foreground"
                                }
                              />
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                </div>
              </div>

              {/* Editorial Field Note Card */}
              {data.weeklyNote ? (
                <div className="bg-card p-4 ring-1 ring-board">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                      <SignMark className="size-4" />
                      <span>{data.weeklyNote.kicker ?? "Field note"}</span>
                    </span>
                    <SaveButton
                      kind="blog"
                      slug={data.weeklyNote.slug}
                      name={data.weeklyNote.title}
                    />
                  </div>
                  <h3 className="mt-2">
                    <Link href={`/blog/${data.weeklyNote.slug}`} className="hover:underline">
                      {data.weeklyNote.title}
                    </Link>
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {data.weeklyNote.description}
                  </p>
                </div>
              ) : null}
            </aside>
          </div>
        </section>
      </div>

      {standalone ? (
        <div className="fixed right-4 bottom-4 z-50">
          <Link
            href="/preview?design=3"
            className="find-go stall-chip inline-flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-receipt shadow-lg hover:brightness-110"
          >
            <span>Compare all 3 concepts</span>
          </Link>
        </div>
      ) : null}
    </div>
  );
}
