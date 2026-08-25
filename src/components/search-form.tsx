"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { FilterClearButton } from "@/components/filter-clear";
import { SearchField } from "@/components/search-field";
import { COUNTRY_TAGS, PRODUCT_TAGS, WEEKDAYS } from "@/lib/constants";
import {
  FIND_AREAS,
  FIND_PRODUCTS,
  FIND_RECORD,
  FIND_SETUP,
  marketsHref,
  originChipRow,
  tagLabel,
  weekdayInToronto,
  whenOptions,
  type DirectorySort,
  type MarketsSearch,
} from "@/lib/find-paths";
import { LAUNCH_CITY } from "@/lib/launch";
import { cn } from "@/lib/utils";

export type SearchFormDefaults = {
  q?: string;
  weekdays?: number[];
  tags?: string[];
  setup?: string;
  areas?: string[];
  openNow?: boolean;
  lat?: string;
  lng?: string;
  sort?: DirectorySort;
};

type BrowseState = {
  q: string;
  weekdays: number[];
  setup: string;
  areas: string[];
  openNow: boolean;
  tags: string[];
};

const selectClass =
  "h-9 min-w-[10rem] max-w-full rounded-none border border-input bg-card px-2.5 text-sm";

function fromDefaults(defaults?: SearchFormDefaults): BrowseState {
  return {
    q: defaults?.q ?? "",
    weekdays: defaults?.weekdays ?? [],
    setup: defaults?.setup ?? "",
    areas: defaults?.areas ?? [],
    openNow: Boolean(defaults?.openNow),
    tags: defaults?.tags ?? [],
  };
}

function toSearch(state: BrowseState, defaults?: SearchFormDefaults): MarketsSearch {
  return {
    q: state.q,
    weekdays: state.weekdays,
    setup: state.setup || undefined,
    areas: state.areas,
    openNow: state.openNow,
    tags: state.tags,
    lat: defaults?.lat,
    lng: defaults?.lng,
    sort: defaults?.sort,
  };
}

function toggleIn<T>(list: T[], value: T) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

export function SearchForm({
  defaults,
  resultCount,
}: {
  defaults?: SearchFormDefaults;
  resultCount?: number;
}) {
  const router = useRouter();
  const [panelOpen, setPanelOpen] = useState(false);
  const [draft, setDraft] = useState<BrowseState>(() => fromDefaults(defaults));
  const applied = fromDefaults(defaults);
  const live = panelOpen ? draft : applied;
  const today = weekdayInToronto();
  const nextOpenChoices = whenOptions(today).filter(
    (item) => item.id === "open" || item.id === "today" || item.id === "tomorrow",
  );

  function go(next: BrowseState) {
    router.push(marketsHref(toSearch(next, defaults)));
  }

  function update(patch: Partial<BrowseState>) {
    const next = { ...live, ...patch };
    if (panelOpen) {
      setDraft(next);
      return;
    }
    go(next);
  }

  function openPanel() {
    setDraft(applied);
    setPanelOpen((open) => !open);
  }

  function nextOpenValue() {
    if (live.openNow && live.weekdays.length === 0) return "open";
    if (!live.openNow && live.weekdays.length === 1) {
      const match = nextOpenChoices.find((item) => item.weekday === live.weekdays[0]);
      if (match) return match.id;
    }
    return "";
  }

  const dayValue = live.weekdays.length === 1 ? String(live.weekdays[0]) : "";
  const areaValue = live.areas.length === 1 ? live.areas[0] : "";
  const browseOn =
    live.weekdays.length > 0 || Boolean(live.setup) || live.areas.length > 0 || live.openNow;
  const tagsOn = live.tags.length > 0;

  return (
    <form
      className="bg-secondary shadow-[inset_4px_0_0_var(--ticket)] ring-1 ring-border"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const q = String(data.get("q") ?? live.q);
        go({ ...live, q });
        setPanelOpen(false);
      }}
    >
      <div className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-stretch sm:px-4">
        <SearchField
          key={defaults?.q ?? ""}
          name="q"
          defaultValue={defaults?.q}
          placeholder="Market, vendor, cuisine, or neighbourhood"
          className="h-10 bg-card"
          aria-label="Search markets and stalls"
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
          {WEEKDAYS.map((day, index) => (
            <option key={day} value={index}>
              {day}
            </option>
          ))}
        </select>
        <select
          aria-label="Indoor or outdoor"
          className={selectClass}
          value={live.setup}
          onChange={(event) => update({ setup: event.target.value })}
        >
          <option value="">Indoor or outdoor</option>
          {FIND_SETUP.map((tag) => (
            <option key={tag} value={tag}>
              {tagLabel(tag)}
            </option>
          ))}
        </select>
        <select
          aria-label="Neighbourhood"
          className={selectClass}
          value={areaValue}
          onChange={(event) => {
            const value = event.target.value;
            update({ areas: value ? [value] : [] });
          }}
        >
          <option value="">Anywhere in {LAUNCH_CITY}</option>
          {FIND_AREAS.map((area) => (
            <option key={area.q} value={area.q}>
              {area.label}
            </option>
          ))}
        </select>
        <select
          aria-label="When it opens"
          className={selectClass}
          value={nextOpenValue()}
          onChange={(event) => {
            const id = event.target.value;
            if (id === "open") {
              update({ openNow: true });
              return;
            }
            if (id === "") {
              update({ openNow: false });
              return;
            }
            const choice = nextOpenChoices.find((item) => item.id === id);
            if (choice?.weekday != null) {
              update({ weekdays: [choice.weekday], openNow: false });
            }
          }}
        >
          <option value="">Next open</option>
          {nextOpenChoices.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          aria-pressed={live.openNow}
          onClick={() => update({ openNow: !live.openNow })}
          className={cn(
            "stall-chip-sm inline-flex h-9 items-center px-3 text-sm font-medium",
            live.openNow
              ? "bg-ticket text-foreground"
              : "border border-input bg-card text-foreground hover:bg-muted",
          )}
        >
          Open now
        </button>
        <FilterClearButton
          className="ml-auto"
          disabled={!browseOn}
          onClick={() =>
            update({ weekdays: [], setup: "", areas: [], openNow: false })
          }
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-dashed border-border px-3 py-3 sm:px-4">
        {FIND_PRODUCTS.map((tag) => {
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
        {originChipRow(live.tags).map((tag) => {
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
        <div className="ml-auto flex items-center gap-3">
          <FilterClearButton
            disabled={!tagsOn}
            onClick={() => update({ tags: [] })}
          />
          <button
            type="button"
            className="text-sm font-medium underline underline-offset-4 hover:text-foreground"
            aria-expanded={panelOpen}
            aria-controls="all-filters"
            onClick={openPanel}
          >
            All filters
          </button>
        </div>
      </div>

      {panelOpen ? (
        <AllFilters
          state={draft}
          resultCount={resultCount ?? 0}
          onChange={setDraft}
          onClear={() =>
            setDraft({
              q: draft.q,
              weekdays: [],
              setup: "",
              areas: [],
              openNow: false,
              tags: [],
            })
          }
          onApply={() => {
            go(draft);
            setPanelOpen(false);
          }}
        />
      ) : null}
    </form>
  );
}

function AllFilters({
  state,
  resultCount,
  onChange,
  onClear,
  onApply,
}: {
  state: BrowseState;
  resultCount: number;
  onChange: (next: BrowseState) => void;
  onClear: () => void;
  onApply: () => void;
}) {
  function setSetup(tag: string, on: boolean) {
    if (!on) {
      onChange({ ...state, setup: state.setup === tag ? "" : state.setup });
      return;
    }
    onChange({ ...state, setup: tag });
  }

  function setTag(tag: string, on: boolean) {
    const tags = on
      ? [...new Set([...state.tags, tag])]
      : state.tags.filter((item) => item !== tag);
    onChange({ ...state, tags });
  }

  const marketsLabel =
    resultCount === 1 ? "Show 1 market" : `Show ${resultCount} markets`;

  return (
    <div id="all-filters" className="border-t border-border bg-card p-4 sm:p-5">
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        <FilterColumn title="When">
          {WEEKDAYS.map((day, index) => (
            <FilterCheck
              key={day}
              checked={state.weekdays.includes(index)}
              onChange={(on) =>
                onChange({
                  ...state,
                  weekdays: on
                    ? [...state.weekdays, index]
                    : state.weekdays.filter((item) => item !== index),
                })
              }
            >
              {day}
            </FilterCheck>
          ))}
          <FilterCheck
            checked={state.openNow}
            onChange={(on) => onChange({ ...state, openNow: on })}
          >
            Open now
          </FilterCheck>
          <FilterCheck
            checked={state.setup === "year-round" || state.tags.includes("year-round")}
            onChange={(on) => setSetup("year-round", on)}
          >
            Year-round
          </FilterCheck>
        </FilterColumn>

        <FilterColumn title="Place">
          {(["indoor", "outdoor"] as const).map((tag) => (
            <FilterCheck
              key={tag}
              checked={state.setup === tag}
              onChange={(on) => setSetup(tag, on)}
            >
              {tagLabel(tag)}
            </FilterCheck>
          ))}
          {FIND_AREAS.map((area) => (
            <FilterCheck
              key={area.q}
              checked={state.areas.includes(area.q)}
              onChange={(on) =>
                onChange({
                  ...state,
                  areas: on
                    ? [...state.areas, area.q]
                    : state.areas.filter((item) => item !== area.q),
                })
              }
            >
              {area.label}
            </FilterCheck>
          ))}
        </FilterColumn>

        <FilterColumn title="Sells">
          {PRODUCT_TAGS.map((tag) => (
            <FilterCheck
              key={tag}
              checked={state.tags.includes(tag)}
              onChange={(on) => setTag(tag, on)}
            >
              {tagLabel(tag)}
            </FilterCheck>
          ))}
        </FilterColumn>

        <FilterColumn title="Cuisine">
          {COUNTRY_TAGS.map((tag) => (
            <FilterCheck
              key={tag}
              checked={state.tags.includes(tag)}
              onChange={(on) => setTag(tag, on)}
            >
              {tagLabel(tag)}
            </FilterCheck>
          ))}
        </FilterColumn>

        <FilterColumn title="On the record">
          {FIND_RECORD.map((tag) => (
            <FilterCheck
              key={tag}
              checked={state.tags.includes(tag)}
              onChange={(on) => setTag(tag, on)}
            >
              {tagLabel(tag)}
            </FilterCheck>
          ))}
        </FilterColumn>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3 border-t border-border pt-4">
        <FilterClearButton onClick={onClear} />
        <Button type="button" className="h-9 px-4" onClick={onApply}>
          {marketsLabel}
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
