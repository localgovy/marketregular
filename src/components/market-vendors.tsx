"use client";

import { useMemo, useRef, useState } from "react";
import { VendorCard } from "@/components/vendor-card";
import { Button } from "@/components/ui/button";
import { FilterClearButton } from "@/components/filter-clear";
import { FilterColumn, FilterRow, type FilterOption } from "@/components/filter-column";
import { SearchField } from "@/components/search-field";
import { ShowMore } from "@/components/show-more";
import { COUNTRY_TAGS, PRODUCT_TAGS, WEEKDAYS } from "@/lib/constants";
import { countryTagsFromQuery } from "@/lib/country-tags";
import {
  FIND_PRODUCTS,
  FIND_RECORD,
  originChipRow,
  tagLabel,
  tagsPresent,
} from "@/lib/find-paths";
import { hallFromStall } from "@/lib/day-plan";
import { vendorFilterTags } from "@/lib/vendor-tags";
import { cn } from "@/lib/utils";
import type { Market, MarketDetail, MarketSchedule } from "@/types/database";

type MarketStall = MarketDetail["vendors"][number];

type StallBrowse = {
  q: string;
  weekdays: number[];
  tags: string[];
  hereToday: boolean;
};

const EMPTY_BROWSE: StallBrowse = {
  q: "",
  weekdays: [],
  tags: [],
  hereToday: false,
};

const selectClass =
  "h-9 min-w-[10rem] max-w-full rounded-none border border-input bg-card px-2.5 text-sm";

/** Rosters run to 180+ stalls, so the grid opens on a readable slice. */
const STALL_PAGE = 24;

function fold(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function stallMatches(vendor: MarketStall, query: string) {
  const tokens = fold(query).split(" ").filter(Boolean);
  if (!tokens.length) return true;
  const searchable = vendorFilterTags(vendor);
  const hay = fold(
    [
      vendor.name,
      vendor.stall,
      vendor.about,
      searchable.join(" "),
      vendor.days.map((day) => WEEKDAYS[day] ?? "").join(" "),
    ]
      .filter(Boolean)
      .join(" "),
  );
  if (tokens.every((token) => hay.includes(token))) return true;
  return countryTagsFromQuery(query).some((tag) => searchable.includes(tag));
}

function stallFits(vendor: MarketStall, find: StallBrowse, today: number) {
  if (!stallMatches(vendor, find.q)) return false;
  if (find.hereToday) {
    if (!vendor.days.includes(today)) return false;
  } else if (
    find.weekdays.length &&
    !find.weekdays.some((day) => vendor.days.includes(day))
  ) {
    return false;
  }
  if (
    find.tags.length &&
    !find.tags.some((tag) => vendorFilterTags(vendor).includes(tag))
  ) {
    return false;
  }
  return true;
}

function toggleIn<T>(list: T[], value: T) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

function browseActive(find: StallBrowse) {
  return (
    fold(find.q).length > 0 ||
    find.weekdays.length > 0 ||
    find.tags.length > 0 ||
    find.hereToday
  );
}

export function MarketVendors({
  vendors,
  market,
  todayWeekday,
}: {
  vendors: MarketStall[];
  market: Pick<Market, "slug" | "name" | "address" | "lat" | "lng" | "province"> & {
    schedules: MarketSchedule[];
  };
  todayWeekday: number;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [applied, setApplied] = useState<StallBrowse>(EMPTY_BROWSE);
  const [draft, setDraft] = useState<StallBrowse>(EMPTY_BROWSE);
  const live = panelOpen ? draft : applied;
  const today = todayWeekday;
  const stallDays = useMemo(() => {
    const days = new Set<number>();
    for (const vendor of vendors) {
      for (const day of vendor.days) {
        if (day >= 0 && day <= 6) days.add(day);
      }
    }
    return [...days].sort((a, b) => a - b);
  }, [vendors]);
  const productChips = useMemo(
    () => tagsPresent(vendors, FIND_PRODUCTS),
    [vendors],
  );
  const cuisineChips = useMemo(
    () => tagsPresent(vendors, originChipRow(live.tags)),
    [vendors, live.tags],
  );
  const sellTags = useMemo(() => tagsPresent(vendors, PRODUCT_TAGS), [vendors]);
  const cuisineTags = useMemo(() => tagsPresent(vendors, COUNTRY_TAGS), [vendors]);
  const recordTags = useMemo(() => tagsPresent(vendors, FIND_RECORD), [vendors]);
  const matches = useMemo(
    () => vendors.filter((vendor) => stallFits(vendor, applied, today)),
    [vendors, applied, today],
  );
  const [pages, setPages] = useState(1);
  const shown = matches.slice(0, pages * STALL_PAGE);
  const draftCount = useMemo(
    () => vendors.filter((vendor) => stallFits(vendor, live, today)).length,
    [vendors, live, today],
  );
  const filtering = browseActive(applied);
  const canAllFilters =
    stallDays.length > 0 ||
    sellTags.length > 0 ||
    cuisineTags.length > 0 ||
    recordTags.length > 0;
  const dayValue =
    live.weekdays.length === 1
      ? String(live.weekdays[0])
      : live.weekdays.length > 1
        ? "multi"
        : "";
  const browseOn = live.weekdays.length > 0 || live.hereToday;
  const tagsOn = live.tags.length > 0;

  function typedQ() {
    if (!formRef.current) return live.q;
    return String(new FormData(formRef.current).get("q") ?? live.q);
  }

  function go(next: StallBrowse) {
    setApplied(next);
    setPages(1);
    setPanelOpen(false);
  }

  /** Compact chips always apply. All filters is the only uncommitted draft. */
  function compact(patch: Partial<StallBrowse>) {
    go({ ...applied, q: typedQ(), ...patch });
  }

  function openPanel() {
    setDraft(applied);
    setPanelOpen((open) => !open);
  }

  return (
    <section id="vendors" className="scroll-mt-28 lg:scroll-mt-24">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <h2>Vendors</h2>
        {vendors.length ? (
          <p className="text-sm text-muted-foreground">
            {filtering ? `${matches.length} of ${vendors.length}` : `${vendors.length} listed`}
          </p>
        ) : null}
      </div>
      {vendors.length ? (
        <>
          <p className="mt-1 text-sm text-muted-foreground">Tap a name for the menu.</p>
          <form
            ref={formRef}
            className="mt-4 bg-secondary shadow-[inset_4px_0_0_var(--ticket)] ring-1 ring-border"
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              const q = String(data.get("q") ?? live.q);
              go({ ...live, q });
            }}
          >
            <div className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-stretch sm:px-4">
              <SearchField
                key={applied.q}
                name="q"
                defaultValue={applied.q}
                placeholder="Stall, cuisine, or tomato"
                className="h-10 bg-card"
                aria-label="Search stalls"
                onClear={() => {
                  if (applied.q.trim()) go({ ...live, q: "" });
                }}
              />
              <button
                type="submit"
                className="find-go stall-chip-sm inline-flex h-10 shrink-0 items-center px-5 text-sm font-medium text-receipt outline-none hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
              >
                Find
              </button>
            </div>
            {stallDays.length ? (
              <div className="flex flex-wrap items-center gap-x-2 gap-y-2 border-t border-border px-3 py-3 sm:px-4">
                <p className="text-sm text-muted-foreground">Browse by</p>
                <select
                  aria-label="Day"
                  className={selectClass}
                  value={dayValue}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (value === "multi") return;
                    compact({
                      weekdays: value === "" ? [] : [Number(value)],
                      ...(value === "" ? {} : { hereToday: false }),
                    });
                  }}
                >
                  <option value="">Any day</option>
                  {live.weekdays.length > 1 &&
                  live.weekdays.every((day) => stallDays.includes(day)) ? (
                    <option value="multi">{live.weekdays.length} days</option>
                  ) : null}
                  {stallDays.map((day) => (
                    <option key={day} value={day}>
                      {WEEKDAYS[day]}
                    </option>
                  ))}
                </select>
                {stallDays.includes(today) ? (
                  <button
                    type="button"
                    aria-pressed={live.hereToday}
                    onClick={() =>
                      compact(
                        applied.hereToday
                          ? { hereToday: false }
                          : { hereToday: true, weekdays: [] },
                      )
                    }
                    className={cn(
                      "stall-chip-sm inline-flex h-9 items-center px-3 text-sm font-medium",
                      live.hereToday
                        ? "bg-ticket text-foreground"
                        : "border border-input bg-card text-foreground hover:bg-muted",
                    )}
                  >
                    Here today
                  </button>
                ) : null}
                <FilterClearButton
                  className="ml-auto"
                  disabled={!browseOn}
                  onClick={() => compact({ weekdays: [], hereToday: false })}
                />
              </div>
            ) : null}
            {productChips.length || cuisineChips.length || canAllFilters ? (
              <div className="flex flex-wrap items-center gap-2 border-t border-dashed border-border px-3 py-3 sm:px-4">
                {[...productChips, ...cuisineChips].map((tag) => {
                  const on = live.tags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      aria-pressed={on}
                      onClick={() => compact({ tags: toggleIn(applied.tags, tag) })}
                      className={cn(
                        "stall-chip-sm inline-flex h-9 items-center px-3 text-sm font-medium",
                        on
                          ? "bg-primary text-primary-foreground"
                          : "border border-input bg-card text-foreground hover:bg-muted",
                      )}
                    >
                      {tagLabel(tag)}
                    </button>
                  );
                })}
                <div className="ml-auto flex items-center gap-3">
                  <FilterClearButton
                    disabled={!tagsOn}
                    onClick={() => compact({ tags: [] })}
                  />
                  {canAllFilters ? (
                    <button
                      type="button"
                      className="text-sm font-medium underline underline-offset-4 hover:text-foreground"
                      aria-expanded={panelOpen}
                      aria-controls="stall-filters"
                      onClick={openPanel}
                    >
                      All filters
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}
            {panelOpen ? (
              <StallAllFilters
                state={draft}
                stallDays={stallDays}
                sellTags={sellTags}
                cuisineTags={cuisineTags}
                recordTags={recordTags}
                showHereToday={stallDays.includes(today)}
                resultCount={draftCount}
                onChange={setDraft}
                onClear={() =>
                  setDraft({
                    q: draft.q,
                    weekdays: [],
                    tags: [],
                    hereToday: false,
                  })
                }
                onApply={(next) => go({ ...next, q: typedQ() })}
              />
            ) : null}
          </form>
          {matches.length ? (
            <>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {shown.map((vendor) => (
                  <VendorCard
                    key={vendor.id}
                    vendor={vendor}
                    stall={vendor.stall}
                    days={vendor.days}
                    halls={vendor.halls}
                    punchHall={hallFromStall(market, market.schedules, vendor.days)}
                  />
                ))}
              </div>
              <ShowMore
                shown={shown.length}
                total={matches.length}
                noun="stalls"
                onMore={() => setPages((n) => n + 1)}
              />
            </>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">No stalls match that.</p>
          )}
        </>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">Vendor list is being filled in.</p>
      )}
    </section>
  );
}

function StallAllFilters({
  state,
  stallDays,
  sellTags,
  cuisineTags,
  recordTags,
  showHereToday,
  resultCount,
  onChange,
  onClear,
  onApply,
}: {
  state: StallBrowse;
  stallDays: number[];
  sellTags: string[];
  cuisineTags: string[];
  recordTags: string[];
  showHereToday: boolean;
  resultCount: number;
  onChange: (next: StallBrowse) => void;
  onClear: () => void;
  onApply: (next: StallBrowse) => void;
}) {
  const stallsLabel =
    resultCount === 1 ? "Show 1 stall" : `Show ${resultCount} stalls`;

  function setTag(tag: string, on: boolean) {
    onChange({
      ...state,
      tags: on
        ? [...new Set([...state.tags, tag])]
        : state.tags.filter((item) => item !== tag),
    });
  }

  const whenLead: FilterOption[] = stallDays.map((day) => ({
    key: String(day),
    label: WEEKDAYS[day],
    checked: state.weekdays.includes(day),
      onChange: (on) =>
        onChange({
          ...state,
          weekdays: on
            ? [...state.weekdays, day]
            : state.weekdays.filter((item) => item !== day),
          hereToday: on ? false : state.hereToday,
        }),
  }));

  const whenRest: FilterOption[] = showHereToday
    ? [
        {
          key: "here-today",
          label: "Here today",
          checked: state.hereToday,
          onChange: (on) =>
            onChange({
              ...state,
              hereToday: on,
              weekdays: on ? [] : state.weekdays,
            }),
        },
      ]
    : [];

  const sellOptions: FilterOption[] = sellTags.map((tag) => ({
    key: tag,
    label: tagLabel(tag),
    checked: state.tags.includes(tag),
    onChange: (on) => setTag(tag, on),
  }));

  const cuisineOptions: FilterOption[] = cuisineTags.map((tag) => ({
    key: tag,
    label: tagLabel(tag),
    checked: state.tags.includes(tag),
    onChange: (on) => setTag(tag, on),
  }));

  const recordOptions: FilterOption[] = recordTags.map((tag) => ({
    key: tag,
    label: tagLabel(tag),
    checked: state.tags.includes(tag),
    onChange: (on) => setTag(tag, on),
  }));

  return (
    <div id="stall-filters" className="border-t border-border bg-card px-4 py-5 sm:px-6 sm:py-6">
      <div className="grid items-start gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {whenLead.length || whenRest.length ? (
          <FilterColumn title="When" lead={whenLead} options={whenRest} />
        ) : null}
        {sellOptions.length ? <FilterColumn title="Sells" options={sellOptions} /> : null}
        {cuisineOptions.length ? (
          <FilterColumn title="Cuisine" options={cuisineOptions} />
        ) : null}
      </div>
      {recordOptions.length ? (
        <div className="mt-10 border-t border-dashed border-border pt-6">
          <FilterRow title="On the record" options={recordOptions} />
        </div>
      ) : null}
      <div className="mt-8 flex items-center justify-between gap-3 border-t border-border pt-4">
        <FilterClearButton onClick={onClear} />
        <Button type="button" className="h-9 px-4" onClick={() => onApply(state)}>
          {stallsLabel}
        </Button>
      </div>
    </div>
  );
}
