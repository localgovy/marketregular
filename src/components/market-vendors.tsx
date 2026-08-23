"use client";

import { useMemo, useState, type ReactNode } from "react";
import { VendorCard } from "@/components/vendor-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PRODUCT_TAGS, WEEKDAYS } from "@/lib/constants";
import {
  FIND_PRODUCTS,
  FIND_RECORD,
  tagLabel,
  tagsPresent,
  weekdayInToronto,
} from "@/lib/find-paths";
import { cn } from "@/lib/utils";
import type { MarketDetail } from "@/types/database";

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
  const hay = fold(
    [
      vendor.name,
      vendor.stall,
      vendor.about,
      vendor.tags.join(" "),
      vendor.days.map((day) => WEEKDAYS[day] ?? "").join(" "),
    ]
      .filter(Boolean)
      .join(" "),
  );
  return tokens.every((token) => hay.includes(token));
}

function stallFits(vendor: MarketStall, find: StallBrowse, today: number) {
  if (!stallMatches(vendor, find.q)) return false;
  if (find.hereToday && !vendor.days.includes(today)) return false;
  if (
    find.weekdays.length &&
    !find.weekdays.some((day) => vendor.days.includes(day))
  ) {
    return false;
  }
  if (find.tags.length && !find.tags.some((tag) => vendor.tags.includes(tag))) {
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

export function MarketVendors({ vendors }: { vendors: MarketStall[] }) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [applied, setApplied] = useState<StallBrowse>(EMPTY_BROWSE);
  const [draft, setDraft] = useState<StallBrowse>(EMPTY_BROWSE);
  const live = panelOpen ? draft : applied;
  const today = weekdayInToronto();
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
  const sellTags = useMemo(() => tagsPresent(vendors, PRODUCT_TAGS), [vendors]);
  const recordTags = useMemo(() => tagsPresent(vendors, FIND_RECORD), [vendors]);
  const matches = useMemo(
    () => vendors.filter((vendor) => stallFits(vendor, applied, today)),
    [vendors, applied, today],
  );
  const draftCount = useMemo(
    () => vendors.filter((vendor) => stallFits(vendor, live, today)).length,
    [vendors, live, today],
  );
  const filtering = browseActive(applied);
  const canAllFilters =
    stallDays.length > 0 || sellTags.length > 0 || recordTags.length > 0;
  const dayValue = live.weekdays.length === 1 ? String(live.weekdays[0]) : "";

  function go(next: StallBrowse) {
    setApplied(next);
    setPanelOpen(false);
  }

  function update(patch: Partial<StallBrowse>) {
    const next = { ...live, ...patch };
    if (panelOpen) {
      setDraft(next);
      return;
    }
    setApplied(next);
  }

  function openPanel() {
    setDraft(applied);
    setPanelOpen((open) => !open);
  }

  return (
    <section id="vendors">
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
            className="mt-4 bg-secondary shadow-[inset_4px_0_0_var(--ticket)] ring-1 ring-border"
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              const q = String(data.get("q") ?? live.q);
              go({ ...live, q });
            }}
          >
            <div className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-stretch sm:px-4">
              <Input
                key={applied.q}
                name="q"
                defaultValue={applied.q}
                placeholder="Stall, bakery, or tomato"
                className="h-10 flex-1 bg-card"
                aria-label="Search stalls"
                autoComplete="off"
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
                    update({
                      weekdays: value === "" ? [] : [Number(value)],
                    });
                  }}
                >
                  <option value="">Any day</option>
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
                    onClick={() => update({ hereToday: !live.hereToday })}
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
              </div>
            ) : null}
            {productChips.length || canAllFilters ? (
              <div className="flex flex-wrap items-center gap-2 border-t border-dashed border-border px-3 py-3 sm:px-4">
                {productChips.map((tag) => {
                  const on = live.tags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      aria-pressed={on}
                      onClick={() => update({ tags: toggleIn(live.tags, tag) })}
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
                {canAllFilters ? (
                  <button
                    type="button"
                    className="ml-auto text-sm font-medium underline underline-offset-4 hover:text-foreground"
                    aria-expanded={panelOpen}
                    aria-controls="stall-filters"
                    onClick={openPanel}
                  >
                    All filters
                  </button>
                ) : null}
              </div>
            ) : null}
            {panelOpen ? (
              <StallAllFilters
                state={draft}
                stallDays={stallDays}
                sellTags={sellTags}
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
                onApply={() => go(draft)}
              />
            ) : null}
          </form>
          {matches.length ? (
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {matches.map((vendor) => (
                <VendorCard
                  key={vendor.id}
                  vendor={vendor}
                  stall={vendor.stall}
                  days={vendor.days}
                  halls={vendor.halls}
                />
              ))}
            </div>
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
  recordTags: string[];
  showHereToday: boolean;
  resultCount: number;
  onChange: (next: StallBrowse) => void;
  onClear: () => void;
  onApply: () => void;
}) {
  const stallsLabel =
    resultCount === 1 ? "Show 1 stall" : `Show ${resultCount} stalls`;

  return (
    <div id="stall-filters" className="border-t border-border bg-card p-4 sm:p-5">
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {stallDays.length ? (
          <FilterColumn title="When">
            {stallDays.map((day) => (
              <FilterCheck
                key={day}
                checked={state.weekdays.includes(day)}
                onChange={(on) =>
                  onChange({
                    ...state,
                    weekdays: on
                      ? [...state.weekdays, day]
                      : state.weekdays.filter((item) => item !== day),
                  })
                }
              >
                {WEEKDAYS[day]}
              </FilterCheck>
            ))}
            {showHereToday ? (
              <FilterCheck
                checked={state.hereToday}
                onChange={(on) => onChange({ ...state, hereToday: on })}
              >
                Here today
              </FilterCheck>
            ) : null}
          </FilterColumn>
        ) : null}
        {sellTags.length ? (
          <FilterColumn title="Sells">
            {sellTags.map((tag) => (
              <FilterCheck
                key={tag}
                checked={state.tags.includes(tag)}
                onChange={(on) =>
                  onChange({
                    ...state,
                    tags: on
                      ? [...new Set([...state.tags, tag])]
                      : state.tags.filter((item) => item !== tag),
                  })
                }
              >
                {tagLabel(tag)}
              </FilterCheck>
            ))}
          </FilterColumn>
        ) : null}
        {recordTags.length ? (
          <FilterColumn title="On the record">
            {recordTags.map((tag) => (
              <FilterCheck
                key={tag}
                checked={state.tags.includes(tag)}
                onChange={(on) =>
                  onChange({
                    ...state,
                    tags: on
                      ? [...new Set([...state.tags, tag])]
                      : state.tags.filter((item) => item !== tag),
                  })
                }
              >
                {tagLabel(tag)}
              </FilterCheck>
            ))}
          </FilterColumn>
        ) : null}
      </div>
      <div className="mt-6 flex items-center justify-between gap-3 border-t border-border pt-4">
        <button
          type="button"
          className="text-sm underline underline-offset-4 hover:text-foreground"
          onClick={onClear}
        >
          Clear
        </button>
        <Button type="button" className="h-9 px-4" onClick={onApply}>
          {stallsLabel}
        </Button>
      </div>
    </div>
  );
}

function FilterColumn({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-3 text-sm font-medium">{title}</legend>
      <div className="grid gap-2">{children}</div>
    </fieldset>
  );
}

function FilterCheck({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (on: boolean) => void;
  children: ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2 text-sm text-stamp">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 size-4 shrink-0 accent-primary"
      />
      <span>{children}</span>
    </label>
  );
}
