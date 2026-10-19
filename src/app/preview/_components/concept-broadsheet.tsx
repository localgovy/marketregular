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
  RulesMark,
  SignMark,
  SlatsMark,
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
import { marketsHref, tagLabel, whenOptions } from "@/lib/find-paths";
import { LAUNCH_CITY } from "@/lib/launch";
import { cn } from "@/lib/utils";

function formatCensus(n: number) {
  return n.toLocaleString("en-CA");
}

export function ConceptBroadsheet({
  data,
  standalone = false,
}: {
  data: HomePreviewData;
  standalone?: boolean;
}) {
  const router = useRouter();
  const { coords, requestAsync } = useGeo();

  const nonEmptyDays = data.fullWeek.filter((g) => g.slots.length > 0);
  const weekdayGroups = nonEmptyDays.filter((g) => g.id !== "open");
  // Default to "all" (2-column 7-day spread) since "Open now" is already highlighted in the Masthead ribbon
  const [activeDayId, setActiveDayId] = useState<string>("all");

  // Streamlined Finder state
  const [q, setQ] = useState("");
  const [whenId, setWhenId] = useState<string | null>(null);
  const [areaQ, setAreaQ] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [drawerTab, setDrawerTab] = useState<"none" | "areas" | "products" | "cuisine">("none");
  const [locating, setLocating] = useState(false);

  const whenList = whenOptions(data.todayWeekday);
  const selectedWhen = whenList.find((item) => item.id === whenId);

  const activeGroup =
    activeDayId === "all"
      ? null
      : (nonEmptyDays.find((g) => g.id === activeDayId) ?? nonEmptyDays[0] ?? null);

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag],
    );
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
        weekdays:
          selectedWhen?.weekday != null && !selectedWhen.openNow
            ? [selectedWhen.weekday]
            : undefined,
        openNow: selectedWhen?.openNow || undefined,
        areas: areaQ ? [areaQ] : undefined,
        tags: selectedTags.length ? selectedTags : undefined,
        lat: String(here.lat),
        lng: String(here.lng),
        sort: "near",
      }),
    );
  }

  return (
    <div className="bg-background text-foreground">
      {/* Top Broadsheet Almanac Strip */}
      <div className="border-b border-board bg-secondary/80">
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
              {LAUNCH_CITY} edition · {data.todayFormatted}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            {data.openNowSlots.length > 0 ? (
              <Link href="/markets/open-today" className="hover:underline">
                <NowLabel>
                  <span>
                    <span className="type-nums">{data.openNowSlots.length}</span>{" "}
                    {data.openNowSlots.length === 1 ? "market open now" : "markets open now"}
                  </span>
                </NowLabel>
              </Link>
            ) : (
              <span className="text-muted-foreground">
                Next sessions listed in the timetable below
              </span>
            )}
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
        {/* Broadsheet Masthead & Punched Census Ledger */}
        <header className="border-b-2 border-board pb-6">
          <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-7">
              <p className="type-kicker font-medium text-primary">
                The weekly directory and live floor guide
              </p>
              <h1 className="mt-1">{LAUNCH_CITY} farmers&apos; markets</h1>
              <p className="type-lede mt-2 max-w-2xl text-muted-foreground">
                Find out everything you want to know about farmers&apos; markets in {LAUNCH_CITY} —
                weekly hours, neighbourhood halls, active stalls, and what is in season.
              </p>
            </div>

            <div className="lg:col-span-5">
              <nav
                aria-label="On the directory"
                className="bg-board text-chalk ring-1 ring-board"
              >
                <div className="awning-board h-[7px] w-full" aria-hidden />
                <div className="grid grid-cols-3 divide-x divide-chalk/20">
                  <Link
                    href="/markets"
                    className="flex flex-col justify-between px-3.5 py-3 transition-colors hover:bg-white/10"
                  >
                    <span className="type-kicker text-chalk/80">Halls</span>
                    <span className="type-census mt-1 text-3xl leading-none sm:text-4xl">
                      {formatCensus(data.census.markets)}
                    </span>
                    <span className="mt-1 text-sm font-medium text-chalk">markets</span>
                  </Link>
                  <Link
                    href="/markets#directory-vendors"
                    className="flex flex-col justify-between px-3.5 py-3 transition-colors hover:bg-white/10"
                  >
                    <span className="type-kicker text-chalk/80">Stalls</span>
                    <span className="type-census mt-1 text-3xl leading-none sm:text-4xl">
                      {formatCensus(data.census.vendors)}
                    </span>
                    <span className="mt-1 text-sm font-medium text-chalk">vendors</span>
                  </Link>
                  <Link
                    href="/products"
                    className="flex flex-col justify-between px-3.5 py-3 transition-colors hover:bg-white/10"
                  >
                    <span className="type-kicker text-chalk/80">Listed</span>
                    <span className="type-census mt-1 text-3xl leading-none sm:text-4xl">
                      {formatCensus(data.census.menus)}
                    </span>
                    <span className="mt-1 text-sm font-medium text-chalk">menu items</span>
                  </Link>
                </div>
              </nav>
            </div>
          </div>

          {/* Live Open Now Ribbon inside the Masthead */}
          {data.openNowSlots.length > 0 ? (
            <div className="mt-5 bg-card shadow-[inset_4px_0_0_var(--stamp)] ring-1 ring-border">
              <div className="grid gap-3 px-4 py-3 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-center">
                <div className="flex items-center gap-2 pr-2 lg:border-r lg:border-border lg:pr-4">
                  <NowLabel className="text-base">
                    <span>
                      <span className="type-nums">{data.openNowSlots.length}</span>{" "}
                      {data.openNowSlots.length === 1 ? "hall open now" : "halls open now"}
                    </span>
                  </NowLabel>
                </div>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {data.openNowSlots.map((slot) => (
                    <li
                      key={slot.id}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 border-b border-border/60 pb-2 last:border-b-0 last:pb-0 sm:border-b-0 sm:pb-0"
                    >
                      <div className="min-w-0">
                        <Link
                          href={`/markets/${slot.slug}`}
                          className="text-base font-medium hover:underline"
                        >
                          <VerifiedName slug={slot.slug} name={slot.name} />
                        </Link>
                        <ListingScore
                          parens
                          ratingAvg={slot.rating_avg}
                          reviewCount={slot.review_count}
                          className="ml-2 text-stamp"
                        />
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
                          <span>{slot.neighbourhood}</span>
                          <span aria-hidden>·</span>
                          <Hours value={slot.hours} className="text-stamp" />
                        </p>
                      </div>
                      <SaveButton kind="market" slug={slot.slug} name={slot.name} />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}
        </header>

        {/* Streamlined Horizontal Enamel Finder Bar */}
        <section
          aria-label="Quick Market Finder"
          className="mt-6 bg-panel-find text-primary-foreground ring-1 ring-board"
        >
          <div className="awning-leaf h-[7px] w-full" aria-hidden />
          <form action="/markets" className="p-4 sm:p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="stall-chip-sm flex size-8 shrink-0 items-center justify-center bg-primary-foreground/15 text-primary-foreground">
                  <SlatsMark className="size-4" />
                </span>
                <div>
                  <p className="type-kicker text-chalk">Search by day, neighbourhood, or stall</p>
                  <h2>Quick Market Finder</h2>
                </div>
              </div>
              <p className="text-sm text-chalk">
                Pick a time window or open a filter drawer below, then press Go.
              </p>
            </div>

            <div className="grid gap-3 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1.4fr)_auto] lg:items-center">
              <div>
                <label className="sr-only" htmlFor="broadsheet-search">
                  {SEARCH_LABEL}
                </label>
                <SearchField
                  id="broadsheet-search"
                  value={q}
                  onChange={setQ}
                  placeholder={SEARCH_PLACEHOLDER}
                />
                {q.trim() ? <input type="hidden" name="q" value={q.trim()} /> : null}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {whenList.map((item) => {
                  const active = whenId === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setWhenId((cur) => (cur === item.id ? null : item.id))}
                      className={cn(
                        "find-chip inline-flex h-10 cursor-pointer items-center justify-center border px-3 text-sm font-medium transition-colors",
                        active
                          ? item.tone === "open"
                            ? "border-chalk/50 bg-stamp text-chalk"
                            : "border-foreground/20 bg-card text-primary"
                          : "border-chalk/65 bg-chalk/10 text-primary-foreground hover:bg-chalk/20",
                      )}
                    >
                      {item.label}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => void handleNearMe()}
                  className="find-chip inline-flex h-10 cursor-pointer items-center justify-center border border-chalk/65 bg-chalk/10 px-3 text-sm font-medium text-primary-foreground hover:bg-chalk/20"
                >
                  {locating ? "Locating…" : "Near me"}
                </button>
              </div>

              <button
                type="submit"
                className="find-go stall-chip inline-flex h-12 shrink-0 cursor-pointer items-center justify-between gap-4 px-5 text-receipt hover:brightness-110"
              >
                <span className="type-column text-receipt">
                  {q.trim() || whenId || areaQ || selectedTags.length ? "Search these" : "Search all"}
                </span>
                <span className="text-base font-medium text-receipt">Go</span>
              </button>
            </div>

            {/* Expandable Drawer Tabs for Neighbourhood, Product, Cuisine */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-primary-foreground/20 pt-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="type-kicker text-chalk">Narrow by:</span>
                {(
                  [
                    {
                      id: "areas",
                      label: areaQ ? `Neighbourhood: ${areaQ}` : "Neighbourhoods",
                    },
                    {
                      id: "products",
                      label:
                        selectedTags.length > 0
                          ? `Products & cuisine (${selectedTags.length})`
                          : "What they sell",
                    },
                    { id: "cuisine", label: "Cuisine" },
                  ] as const
                ).map((tab) => {
                  const open = drawerTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      aria-expanded={open}
                      onClick={() => setDrawerTab((cur) => (cur === tab.id ? "none" : tab.id))}
                      className={cn(
                        "stall-chip-sm cursor-pointer px-3 py-1 text-sm font-medium",
                        open
                          ? "bg-card text-primary"
                          : "bg-primary-foreground/15 text-primary-foreground hover:bg-primary-foreground/25",
                      )}
                    >
                      {tab.label}
                    </button>
                  );
                })}
                {(whenId || areaQ || selectedTags.length > 0 || q.trim()) && (
                  <button
                    type="button"
                    onClick={() => {
                      setQ("");
                      setWhenId(null);
                      setAreaQ(null);
                      setSelectedTags([]);
                    }}
                    className="text-sm font-medium text-chalk underline underline-offset-4"
                  >
                    Reset filters
                  </button>
                )}
              </div>
              <Link
                href="/products"
                className="text-sm font-medium text-chalk underline underline-offset-4 hover:text-white"
              >
                Or browse all {formatCensus(data.census.menus)} menu items by aisle
              </Link>
            </div>

            {drawerTab === "areas" ? (
              <div className="mt-3 flex flex-wrap gap-1.5 border-t border-primary-foreground/20 pt-3">
                {data.areas.primary.map((area) => {
                  const on = areaQ === area.q;
                  return (
                    <button
                      key={area.q}
                      type="button"
                      onClick={() => setAreaQ(on ? null : area.q)}
                      className={cn(
                        "find-chip cursor-pointer border px-3 py-1.5 text-sm font-medium",
                        on
                          ? "border-foreground/20 bg-card text-primary"
                          : "border-chalk/60 bg-chalk/10 text-primary-foreground hover:bg-chalk/20",
                      )}
                    >
                      {area.label}
                    </button>
                  );
                })}
              </div>
            ) : null}

            {drawerTab === "products" ? (
              <div className="mt-3 flex flex-wrap gap-1.5 border-t border-primary-foreground/20 pt-3">
                {data.sellOptions.map((tag) => {
                  const on = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={cn(
                        "find-chip cursor-pointer border px-3 py-1.5 text-sm font-medium",
                        on
                          ? "border-foreground/20 bg-card text-primary"
                          : "border-chalk/60 bg-chalk/10 text-primary-foreground hover:bg-chalk/20",
                      )}
                    >
                      {tagLabel(tag)}
                    </button>
                  );
                })}
              </div>
            ) : null}

            {drawerTab === "cuisine" ? (
              <div className="mt-3 flex flex-wrap gap-1.5 border-t border-primary-foreground/20 pt-3">
                {data.cuisineOptions.map((tag) => {
                  const on = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={cn(
                        "find-chip cursor-pointer border px-3 py-1.5 text-sm font-medium",
                        on
                          ? "border-foreground/20 bg-card text-primary"
                          : "border-chalk/60 bg-chalk/10 text-primary-foreground hover:bg-chalk/20",
                      )}
                    >
                      {tagLabel(tag)}
                    </button>
                  );
                })}
              </div>
            ) : null}

            {selectedWhen?.openNow ? <input type="hidden" name="openNow" value="1" /> : null}
            {selectedWhen?.weekday != null && !selectedWhen.openNow ? (
              <input type="hidden" name="weekday" value={selectedWhen.weekday} />
            ) : null}
            {areaQ ? <input type="hidden" name="area" value={areaQ} /> : null}
            {selectedTags.map((tag) => (
              <input key={tag} type="hidden" name="tag" value={tag} />
            ))}
          </form>
        </section>

        {/* Main 2-Column Editorial Spread with Vertical Column Rule */}
        <div className="mt-8 grid gap-8 lg:grid-cols-12 lg:items-start">
          {/* Left 7 cols: Interactive 7-Day Broadsheet Timetable + Neighbourhood Index */}
          <div className="flex flex-col gap-8 lg:col-span-7 lg:border-r lg:border-board lg:pr-8">
            <section id="week">
              <div className="flex flex-wrap items-end justify-between gap-3 border-b-2 border-board pb-3">
                <div className="flex items-start gap-3">
                  <span className="stall-chip-sm mt-0.5 flex size-9 shrink-0 items-center justify-center bg-primary text-primary-foreground">
                    <WeekMark className="size-5" />
                  </span>
                  <div>
                    <p className="type-kicker text-muted-foreground">Seven-day schedule</p>
                    <h2>This week&apos;s market timetable</h2>
                  </div>
                </div>
                <Link
                  href="/events"
                  className="text-base font-medium text-primary underline underline-offset-4"
                >
                  Full month calendar
                </Link>
              </div>

              <p className="mt-2.5 text-base text-muted-foreground">
                Browse the full 7-day ledger side by side, or select a single day tab to see every
                market session in full.
              </p>

              {/* Day Tab Strip */}
              <div
                role="tablist"
                aria-label="Filter timetable by day"
                className="mt-4 flex flex-wrap gap-1.5 border-b border-border pb-3"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeDayId === "all"}
                  onClick={() => setActiveDayId("all")}
                  className={cn(
                    "stall-chip-sm inline-flex cursor-pointer items-baseline gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors",
                    activeDayId === "all"
                      ? "bg-board text-chalk"
                      : "bg-secondary text-foreground hover:bg-border",
                  )}
                >
                  <span>All 7 days</span>
                </button>
                {nonEmptyDays.map((group) => {
                  const selected = activeDayId === group.id;
                  return (
                    <button
                      key={group.id}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      onClick={() => setActiveDayId(group.id)}
                      className={cn(
                        "stall-chip-sm inline-flex cursor-pointer items-baseline gap-2 px-3 py-1.5 text-sm font-medium transition-colors",
                        selected
                          ? group.open
                            ? "bg-stamp text-chalk"
                            : "bg-board text-chalk"
                          : "bg-secondary text-foreground hover:bg-border",
                      )}
                    >
                      <span>{group.label}</span>
                      <span
                        className={cn(
                          "type-nums text-sm",
                          selected ? "text-chalk/85" : "text-muted-foreground",
                        )}
                      >
                        {group.date} · {group.slots.length}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Active Day Receipt Table OR Full 2-Column Week Grid */}
              {activeDayId !== "all" && activeGroup ? (
                <div className="mt-4 bg-card ring-1 ring-border">
                  <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border bg-secondary/55 px-4 py-2.5">
                    <div className="flex items-baseline gap-2.5">
                      <h3>{activeGroup.label}</h3>
                      <span className="type-kicker text-muted-foreground">{activeGroup.hint}</span>
                    </div>
                    <span className="type-nums text-sm font-medium text-primary">
                      {activeGroup.date} · {activeGroup.slots.length}{" "}
                      {activeGroup.slots.length === 1 ? "market" : "markets"}
                    </span>
                  </div>

                  <ul className="divide-y divide-border">
                    {activeGroup.slots.map((slot) => (
                      <li key={slot.id} className="px-4 py-3 hover:bg-secondary/40">
                        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3">
                          <div className="min-w-0">
                            <p className="min-w-0">
                              <Link
                                href={`/markets/${slot.slug}`}
                                className="text-base font-medium hover:underline"
                              >
                                <VerifiedName slug={slot.slug} name={slot.name} />
                              </Link>
                              <ListingScore
                                parens
                                ratingAvg={slot.rating_avg}
                                reviewCount={slot.review_count}
                                className="ml-2 text-stamp"
                              />
                            </p>
                            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-muted-foreground">
                              <span className="font-medium text-foreground/80">
                                {slot.neighbourhood}
                              </span>
                              {slot.address ? (
                                <>
                                  <span aria-hidden>·</span>
                                  <span>{slot.address}</span>
                                </>
                              ) : null}
                              {slot.vendorCount > 0 ? (
                                <>
                                  <span aria-hidden>·</span>
                                  <span>
                                    <span className="type-nums">{slot.vendorCount}</span> stalls
                                  </span>
                                </>
                              ) : null}
                            </p>
                          </div>

                          <div className="flex shrink-0 items-center gap-3">
                            <div className="text-right">
                              {slot.open ? (
                                <div className="mb-0.5 flex justify-end">
                                  <NowLabel>Open</NowLabel>
                                </div>
                              ) : null}
                              <Hours
                                value={slot.hours}
                                className={slot.open ? "font-medium text-stamp" : "text-foreground"}
                              />
                            </div>
                            <SaveButton kind="market" slug={slot.slug} name={slot.name} />
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {weekdayGroups.slice(0, 6).map((group) => (
                    <div key={group.id} className="bg-card ring-1 ring-border">
                      <div className="flex items-baseline justify-between gap-2 border-b border-border bg-secondary/50 px-3.5 py-2">
                        <h3>{group.label}</h3>
                        <span className="type-nums text-sm font-medium text-primary">
                          {group.date}
                        </span>
                      </div>
                      <ul className="divide-y divide-border/70">
                        {group.slots.slice(0, 5).map((slot) => (
                          <li key={slot.id} className="px-3.5 py-2.5 hover:bg-secondary/40">
                            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3">
                              <div className="min-w-0">
                                <Link
                                  href={`/markets/${slot.slug}`}
                                  className="text-base font-medium hover:underline"
                                >
                                  <VerifiedName slug={slot.slug} name={slot.name} />
                                </Link>
                                <ListingScore
                                  parens
                                  ratingAvg={slot.rating_avg}
                                  reviewCount={slot.review_count}
                                  className="ml-1.5 text-stamp"
                                />
                                <p className="mt-0.5 flex flex-wrap items-center gap-x-2">
                                  {slot.open ? <NowLabel>Open</NowLabel> : null}
                                  <Hours
                                    value={slot.hours}
                                    className={
                                      slot.open ? "text-stamp" : "text-muted-foreground"
                                    }
                                  />
                                </p>
                              </div>
                              <SaveButton kind="market" slug={slot.slug} name={slot.name} />
                            </div>
                          </li>
                        ))}
                      </ul>
                      {group.slots.length > 5 ? (
                        <div className="border-t border-border px-3.5 py-2">
                          <button
                            type="button"
                            onClick={() => setActiveDayId(group.id)}
                            className="cursor-pointer text-sm font-medium text-primary hover:underline"
                          >
                            Show all {group.slots.length} markets on {group.label}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Right 5 cols: Editorial Field Dispatch + Shop the Aisles + Saved Rail */}
          <aside className="flex flex-col gap-6 lg:col-span-5">
            <SavedRail />

            {/* Featured Field Note / Blog Dispatch */}
            {data.weeklyNote ? (
              <section className="bg-card ring-1 ring-board">
                <div className="flex items-center justify-between gap-2 border-b border-border bg-secondary px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="stall-chip-sm flex size-7 items-center justify-center bg-board text-chalk">
                      <SignMark className="size-4" />
                    </span>
                    <p className="type-kicker font-medium text-board">
                      {data.weeklyNote.kicker ?? "Field note"}
                    </p>
                  </div>
                  <SaveButton
                    kind="blog"
                    slug={data.weeklyNote.slug}
                    name={data.weeklyNote.title}
                  />
                </div>
                <div className="p-4 sm:p-5">
                  <h2>
                    <Link
                      href={`/blog/${data.weeklyNote.slug}`}
                      className="hover:underline"
                    >
                      {data.weeklyNote.title}
                    </Link>
                  </h2>
                  <p className="mt-2.5 text-base leading-relaxed text-muted-foreground">
                    {data.weeklyNote.description}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
                    <Link
                      href={`/blog/${data.weeklyNote.slug}`}
                      className="stall-chip-sm inline-flex h-9 items-center bg-primary px-3.5 text-sm font-medium text-primary-foreground hover:brightness-110"
                    >
                      Read the dispatch
                    </Link>
                    <Link
                      href="/blog"
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      All market notes
                    </Link>
                  </div>

                  {data.recentNotes.length > 1 ? (
                    <div className="mt-4 border-t border-border pt-3">
                      <p className="type-kicker text-muted-foreground">More from the notebook</p>
                      <ul className="mt-2 divide-y divide-border/60">
                        {data.recentNotes.slice(1, 3).map((note) => (
                          <li key={note.slug} className="py-2 first:pt-0 last:pb-0">
                            <Link
                              href={`/blog/${note.slug}`}
                              className="text-base font-medium hover:underline"
                            >
                              {note.title}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </section>
            ) : null}

            {/* Shop by Craving / Produce Crate Grid with Visual Plates */}
            <section className="bg-card ring-1 ring-border">
              <div className="flex items-baseline justify-between gap-2 border-b border-border px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <span className="stall-chip-sm flex size-8 shrink-0 items-center justify-center bg-foreground text-receipt">
                    <TagMark className="size-4" />
                  </span>
                  <div>
                    <p className="type-kicker text-muted-foreground">
                      {formatCensus(data.census.menus)} items on the tables
                    </p>
                    <h2 className="type-column">Shop by aisle &amp; craving</h2>
                  </div>
                </div>
                <Link
                  href="/products"
                  className="text-sm font-medium text-primary hover:underline"
                >
                  All aisles
                </Link>
              </div>

              <ul className="grid grid-cols-2 divide-x divide-y divide-border">
                {data.aisles.slice(0, 4).map((aisle) => (
                  <li key={aisle.id} className="flex flex-col justify-between p-3 hover:bg-secondary/45">
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
                          className="mb-2 h-16 w-full aspect-auto border border-border/70"
                        />
                        <div className="flex items-baseline justify-between gap-2">
                          <h3 className="text-base font-medium text-foreground hover:underline">
                            {aisle.label}
                          </h3>
                          <span className="type-nums text-sm text-stamp">{aisle.count}</span>
                        </div>
                        <p className="mt-1 text-sm leading-snug text-muted-foreground">
                          {aisle.line}
                        </p>
                      </Link>
                    </div>
                    {aisle.sampleTerms.length ? (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {aisle.sampleTerms.slice(0, 2).map((term) => (
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
                  </li>
                ))}
              </ul>
            </section>
          </aside>
        </div>

        {/* Full-Width Neighbourhood Circuit Strip */}
        <section aria-label="Neighbourhood halls" className="mt-10 border-t-2 border-board pt-8">
          <div className="flex flex-wrap items-end justify-between gap-3 pb-4">
            <div className="flex items-start gap-3">
              <span className="stall-chip-sm mt-0.5 flex size-9 shrink-0 items-center justify-center bg-secondary text-primary">
                <PlateMark className="size-5" />
              </span>
              <div>
                <p className="type-kicker text-muted-foreground">Where the regulars go</p>
                <h2>Neighbourhood market circuits</h2>
              </div>
            </div>
            <Link
              href="/markets"
              className="text-base font-medium text-primary underline underline-offset-4"
            >
              Browse all areas
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.neighbourhoodCircuits.slice(0, 6).map((circuit) => {
              const lead = circuit.topMarkets[0];
              return (
                <div
                  key={circuit.label}
                  className="flex flex-col justify-between bg-card p-4 ring-1 ring-border"
                >
                  <div>
                    <div className="flex items-baseline justify-between gap-2">
                      <h3>
                        <Link
                          href={`/markets?area=${encodeURIComponent(circuit.q)}`}
                          className="hover:underline"
                        >
                          {circuit.label}
                        </Link>
                      </h3>
                      <span className="type-nums text-sm text-muted-foreground">
                        {circuit.vendorCount > 0
                          ? `${circuit.vendorCount} stalls`
                          : `${circuit.marketCount} hall`}
                      </span>
                    </div>
                    {lead ? (
                      <div className="mt-2.5 border-t border-border/70 pt-2.5">
                        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-2">
                          <div className="min-w-0">
                            <Link
                              href={`/markets/${lead.slug}`}
                              className="text-base font-medium hover:underline"
                            >
                              <VerifiedName slug={lead.slug} name={lead.name} />
                            </Link>
                            <ListingScore
                              parens
                              ratingAvg={lead.rating_avg}
                              reviewCount={lead.review_count}
                              className="ml-1.5 text-stamp"
                            />
                            <p className="mt-0.5 text-sm text-muted-foreground">
                              <span className="type-nums">{lead.scheduleSummary}</span>
                            </p>
                          </div>
                          <SaveButton kind="market" slug={lead.slug} name={lead.name} />
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Full-Width 3-Column Broadsheet Gazette: Selling Today + Top 5 This Week + Live Floor Reviews */}
        <section aria-label="Stalls and reviews" className="mt-10 border-t-2 border-board pt-8">
          <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <p className="type-kicker text-muted-foreground">On the stalls and in the aisles</p>
              <h2>The Stall &amp; Table Gazette</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Who is setting up today, the five busiest stalls of the week, and live notes from
              regulars.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3 lg:items-start">
            {/* Column 1: Vendors Selling Today */}
            <div className="bg-card ring-1 ring-border">
              <div className="flex items-start justify-between gap-2 border-b border-border bg-secondary/45 px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <span className="stall-chip-sm flex size-8 shrink-0 items-center justify-center bg-stamp/15 text-stamp">
                    <CrateMark className="size-4" />
                  </span>
                  <div>
                    <p className="type-kicker text-muted-foreground">Vendors at market</p>
                    <h3>Vendors today</h3>
                  </div>
                </div>
                <span className="type-nums text-sm font-medium text-primary">
                  {data.sellingToday.length} listed
                </span>
              </div>
              {data.sellingToday.length ? (
                <ul>
                  {data.sellingToday.slice(0, 5).map((row) => (
                    <VendorTodayItem key={`${row.vendorSlug}-${row.marketSlug}`} row={row} />
                  ))}
                </ul>
              ) : (
                <p className="p-4 text-sm text-muted-foreground">
                  Today&apos;s stalls have wrapped up. Check this week&apos;s top vendors in the next
                  column.
                </p>
              )}
            </div>

            {/* Column 2: Top 5 Stalls This Week */}
            <div className="bg-card ring-1 ring-border">
              <div className="flex items-start justify-between gap-2 border-b border-border bg-secondary/45 px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <span className="stall-chip-sm flex size-8 shrink-0 items-center justify-center bg-foreground text-receipt">
                    <TallyMark className="size-4" />
                  </span>
                  <div>
                    <p className="type-kicker text-muted-foreground">This week&apos;s vendors</p>
                    <h3>Top 5 this week</h3>
                  </div>
                </div>
                <Link
                  href="/markets#directory-vendors"
                  className="text-sm font-medium text-primary hover:underline"
                >
                  All vendors
                </Link>
              </div>
              {data.weekVendors.length ? (
                <ol>
                  {data.weekVendors.slice(0, 5).map((pick, index) => (
                    <VendorWeekItem key={pick.vendorSlug} pick={pick} index={index} />
                  ))}
                </ol>
              ) : (
                <p className="p-4 text-sm text-muted-foreground">
                  Vendor schedules for this week are being updated.
                </p>
              )}
            </div>

            {/* Column 3: Live Shopper Notes (Reviews) */}
            <div className="bg-card ring-1 ring-border">
              <div className="flex items-start justify-between gap-2 border-b border-border bg-secondary/45 px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <span className="stall-chip-sm flex size-8 shrink-0 items-center justify-center bg-board text-chalk">
                    <AsteriskMark className="size-4" />
                  </span>
                  <div>
                    <p className="type-kicker text-muted-foreground">Word from the floor</p>
                    <h3>Recent shopper notes</h3>
                  </div>
                </div>
                <Link href="/feed" className="text-sm font-medium text-primary hover:underline">
                  All posts
                </Link>
              </div>
              <ol>
                {data.tape.slice(0, 4).map((item) => (
                  <ReviewCard key={item.id} item={item} />
                ))}
              </ol>
              <div className="border-t border-border px-4 py-3">
                <Link
                  href="/feed"
                  className="stall-chip-sm inline-flex h-9 w-full items-center justify-center bg-secondary text-sm font-medium text-foreground hover:bg-border"
                >
                  Write a note or read the live feed
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Bottom Spread: Map + Short Directory Table */}
        <section
          aria-label="Map and directory"
          className="mt-10 border-t-2 border-board pt-8 pb-4"
        >
          <div className="grid gap-8 lg:grid-cols-12 lg:items-start">
            <div className="lg:col-span-5">
              <div className="bg-card ring-1 ring-border">
                <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <span className="stall-chip-sm flex size-8 shrink-0 items-center justify-center bg-secondary text-primary">
                      <BlocksMark className="size-4" />
                    </span>
                    <div>
                      <p className="type-kicker text-muted-foreground">Around {LAUNCH_CITY}</p>
                      <h2 className="type-column">Map of {LAUNCH_CITY} markets</h2>
                    </div>
                  </div>
                  <Link
                    href="/markets"
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    Full map
                  </Link>
                </div>
                <p className="px-4 py-2.5 text-sm text-muted-foreground">
                  Click any pin or cluster for the hall name, hours, and street address.
                </p>
                <MarketMapLazy load="visible" className="h-80 w-full overflow-hidden" />
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="bg-card ring-1 ring-border">
                <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <span className="stall-chip-sm flex size-8 shrink-0 items-center justify-center bg-secondary text-muted-foreground">
                      <RulesMark className="size-4" />
                    </span>
                    <div>
                      <p className="type-kicker text-muted-foreground">A short list</p>
                      <h2 className="type-column">Directory of {LAUNCH_CITY} halls</h2>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-x-4 text-sm font-medium text-primary">
                    <Link href="/products" className="hover:underline">
                      Browse by product
                    </Link>
                    <Link href="/markets" className="hover:underline">
                      All {data.census.markets} markets
                    </Link>
                  </div>
                </div>

                <ul className="divide-y divide-border">
                  {data.directoryMarkets.slice(0, 8).map((market) => (
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
                              <span className="type-nums whitespace-nowrap text-sm text-muted-foreground">
                                {market.nextOpen}
                              </span>
                            )}
                            {market.open && market.hours ? (
                              <div className="mt-0.5">
                                <Hours value={market.hours} className="text-muted-foreground" />
                              </div>
                            ) : null}
                          </div>
                          <SaveButton kind="market" slug={market.slug} name={market.name} />
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>
      </div>

      {standalone ? (
        <div className="fixed right-4 bottom-4 z-50">
          <Link
            href="/preview?design=1"
            className="find-go stall-chip inline-flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-receipt shadow-lg hover:brightness-110"
          >
            <span>Compare all 3 concepts</span>
          </Link>
        </div>
      ) : null}
    </div>
  );
}
