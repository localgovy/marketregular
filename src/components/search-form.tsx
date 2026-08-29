"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FilterClearButton } from "@/components/filter-clear";
import { FilterColumn, FilterRow, type FilterOption } from "@/components/filter-column";
import { SearchField } from "@/components/search-field";
import { COUNTRY_TAGS, PRODUCT_TAGS, WEEKDAYS } from "@/lib/constants";
import {
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
  type PlaceAreas,
} from "@/lib/find-paths";
import { LAUNCH_REGION } from "@/lib/launch";
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
  places,
  resultCount,
}: {
  defaults?: SearchFormDefaults;
  places: PlaceAreas;
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
          <option value="">Anywhere in the {LAUNCH_REGION}</option>
          {places.neighbourhoods.length ? (
            <optgroup label="Toronto neighbourhoods">
              {places.neighbourhoods.map((area) => (
                <option key={area.q} value={area.q}>
                  {area.label}
                </option>
              ))}
            </optgroup>
          ) : null}
          {places.cities.length ? (
            <optgroup label={`Around the ${LAUNCH_REGION}`}>
              {places.cities.map((area) => (
                <option key={area.q} value={area.q}>
                  {area.label}
                </option>
              ))}
            </optgroup>
          ) : null}
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
          places={places}
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
          onApply={(next) => {
            go(next);
            setPanelOpen(false);
          }}
        />
      ) : null}
    </form>
  );
}

function AllFilters({
  state,
  places,
  resultCount,
  onChange,
  onClear,
  onApply,
}: {
  state: BrowseState;
  places: PlaceAreas;
  resultCount: number;
  onChange: (next: BrowseState) => void;
  onClear: () => void;
  onApply: (next: BrowseState) => void;
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

  const whenLead: FilterOption[] = WEEKDAYS.map((day, index) => ({
    key: day,
    label: day,
    checked: state.weekdays.includes(index),
    onChange: (on) =>
      onChange({
        ...state,
        weekdays: on
          ? [...state.weekdays, index]
          : state.weekdays.filter((item) => item !== index),
      }),
  }));

  const whenRest: FilterOption[] = [
    {
      key: "open-now",
      label: "Open now",
      checked: state.openNow,
      onChange: (on) => onChange({ ...state, openNow: on }),
    },
    {
      key: "year-round",
      label: "Year-round",
      checked: state.setup === "year-round" || state.tags.includes("year-round"),
      onChange: (on) => setSetup("year-round", on),
    },
  ];

  const placeLead: FilterOption[] = (["indoor", "outdoor"] as const).map((tag) => ({
    key: tag,
    label: tagLabel(tag),
    checked: state.setup === tag,
    onChange: (on) => setSetup(tag, on),
  }));

  const placeOptions: FilterOption[] = [...places.neighbourhoods, ...places.cities].map(
    (area) => ({
      key: area.q,
      label: area.label,
      checked: state.areas.includes(area.q),
      onChange: (on) =>
        onChange({
          ...state,
          areas: on
            ? [...state.areas, area.q]
            : state.areas.filter((item) => item !== area.q),
        }),
    }),
  );

  const sellOptions: FilterOption[] = PRODUCT_TAGS.map((tag) => ({
    key: tag,
    label: tagLabel(tag),
    checked: state.tags.includes(tag),
    onChange: (on) => setTag(tag, on),
  }));

  const cuisineOptions: FilterOption[] = COUNTRY_TAGS.map((tag) => ({
    key: tag,
    label: tagLabel(tag),
    checked: state.tags.includes(tag),
    onChange: (on) => setTag(tag, on),
  }));

  const recordOptions: FilterOption[] = FIND_RECORD.map((tag) => ({
    key: tag,
    label: tagLabel(tag),
    checked: state.tags.includes(tag),
    onChange: (on) => setTag(tag, on),
  }));

  return (
    <div id="all-filters" className="border-t border-border bg-card px-4 py-5 sm:px-6 sm:py-6">
      <div className="grid items-start gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
        <FilterColumn title="When" lead={whenLead} options={whenRest} />
        <FilterColumn title="Place" lead={placeLead} options={placeOptions} />
        <FilterColumn title="Sells" options={sellOptions} />
        <FilterColumn title="Cuisine" options={cuisineOptions} />
      </div>

      <div className="mt-10 border-t border-dashed border-border pt-6">
        <FilterRow title="On the record" options={recordOptions} />
      </div>

      <div className="mt-8 flex items-center justify-between gap-3 border-t border-border pt-4">
        <FilterClearButton onClick={onClear} />
        <Button type="button" className="h-9 px-4" onClick={() => onApply(state)}>
          {marketsLabel}
        </Button>
      </div>
    </div>
  );
}
