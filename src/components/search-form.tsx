"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { FilterClearButton } from "@/components/filter-clear";
import { FilterColumn, FilterRow, type FilterOption } from "@/components/filter-column";
import { SearchField } from "@/components/search-field";
import { COUNTRY_TAGS, PRODUCT_TAGS, WEEKDAYS } from "@/lib/constants";
import {
  FIND_RECORD,
  FIND_SETUP,
  marketsHref,
  originChipRow,
  productChipRow,
  tagLabel,
  vendorsHref,
  whenOptions,
  type DirectorySort,
  type MarketsSearch,
  type PlaceAreas,
} from "@/lib/find-paths";
import { LAUNCH_COVERAGE } from "@/lib/launch";
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
  todayWeekday,
  variant = "full",
}: {
  defaults?: SearchFormDefaults;
  places: PlaceAreas;
  resultCount?: number;
  /** Toronto weekday from the server so Today/Tomorrow options match first paint. */
  todayWeekday: number;
  variant?: "full" | "mini";
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [draft, setDraft] = useState<BrowseState>(() => fromDefaults(defaults));
  const applied = fromDefaults(defaults);
  const live = panelOpen ? draft : applied;
  const mini = variant === "mini";
  const nextOpenChoices = whenOptions(todayWeekday).filter(
    (item) => item.id === "open" || item.id === "today" || item.id === "tomorrow",
  );

  function typedQ() {
    if (!formRef.current) return live.q;
    return String(new FormData(formRef.current).get("q") ?? live.q);
  }

  function go(next: BrowseState) {
    const search = toSearch(next, defaults);
    router.push(variant === "mini" ? vendorsHref(search) : marketsHref(search));
  }

  /** Compact chips always apply. All Filters is the only uncommitted draft. */
  function compact(patch: Partial<BrowseState>) {
    setPanelOpen(false);
    go({ ...applied, q: typedQ(), ...patch });
  }

  function openPanel() {
    setDraft(applied);
    setPanelOpen((open) => !open);
  }

  function nextOpenValue() {
    if (applied.openNow && applied.weekdays.length === 0) return "open";
    if (!applied.openNow && applied.weekdays.length === 1) {
      const match = nextOpenChoices.find((item) => item.weekday === applied.weekdays[0]);
      if (match) return match.id;
    }
    return "";
  }

  const dayValue =
    applied.weekdays.length === 1
      ? String(applied.weekdays[0])
      : applied.weekdays.length > 1
        ? "multi"
        : "";
  const areaValue =
    applied.areas.length === 1 ? applied.areas[0] : applied.areas.length > 1 ? "multi" : "";
  const browseOn =
    applied.weekdays.length > 0 || Boolean(applied.setup) || applied.areas.length > 0 || applied.openNow;
  const tagsOn = applied.tags.length > 0;
  const anythingOn = browseOn || tagsOn || Boolean(applied.q.trim());
  const fieldH = mini ? "h-9" : "h-10";
  const chipSize = mini ? "sm" : "md";
  const productChips = productChipRow(applied.tags);
  const productOn = new Set<string>(productChips);
  const extraMiniTags = mini ? applied.tags.filter((tag) => !productOn.has(tag)) : [];

  const daySelect = (
    <select
      aria-label="Day"
      className={selectClass}
      value={dayValue}
      onChange={(event) => {
        const value = event.target.value;
        if (value === "multi") return;
        compact({
          weekdays: value === "" ? [] : [Number(value)],
          ...(value === "" ? {} : { openNow: false }),
        });
      }}
    >
      <option value="">Any day</option>
      {applied.weekdays.length > 1 ? (
        <option value="multi">{applied.weekdays.length} days</option>
      ) : null}
      {WEEKDAYS.map((day, index) => (
        <option key={day} value={index}>
          {day}
        </option>
      ))}
    </select>
  );

  const areaSelect = (
    <select
      aria-label="Neighbourhood"
      className={selectClass}
      value={areaValue}
      onChange={(event) => {
        const value = event.target.value;
        if (value === "multi") return;
        compact({ areas: value ? [value] : [] });
      }}
    >
      <option value="">Anywhere in {LAUNCH_COVERAGE}</option>
      {applied.areas.length > 1 ? (
        <option value="multi">{applied.areas.length} places</option>
      ) : null}
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
        <optgroup label="Around Toronto">
          {places.cities.map((area) => (
            <option key={area.q} value={area.q}>
              {area.label}
            </option>
          ))}
        </optgroup>
      ) : null}
    </select>
  );

  return (
    <form
      ref={formRef}
      className="bg-secondary shadow-[inset_4px_0_0_var(--ticket)] ring-1 ring-border"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const q = String(data.get("q") ?? live.q);
        go({ ...live, q });
        setPanelOpen(false);
      }}
    >
      <div
        className={cn(
          "flex flex-col gap-2 sm:flex-row sm:items-stretch",
          mini ? "px-3 py-2 sm:px-3" : "px-3 py-3 sm:px-4",
        )}
      >
        <SearchField
          key={defaults?.q ?? ""}
          name="q"
          defaultValue={defaults?.q}
          placeholder={
            mini ? "Stall, cuisine, or market" : "Market, vendor, cuisine, or neighbourhood"
          }
          className={cn(fieldH, "bg-card")}
          aria-label={mini ? "Search stalls" : "Search markets and stalls"}
          onClear={() => {
            if (applied.q.trim()) go({ ...applied, q: "" });
          }}
        />
        <button
          type="submit"
          className={cn(
            "find-go stall-chip-sm inline-flex shrink-0 items-center px-5 text-sm font-medium text-receipt outline-none hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground",
            fieldH,
          )}
        >
          Find
        </button>
      </div>

      <div
        className={cn(
          "flex flex-wrap items-center gap-x-2 gap-y-2 border-t border-border",
          mini ? "px-3 py-2 sm:px-3" : "px-3 py-3 sm:px-4",
        )}
      >
        {mini ? null : <p className="text-sm text-muted-foreground">Browse by</p>}
        {daySelect}
        {mini ? null : (
          <select
            aria-label="Indoor or outdoor"
            className={selectClass}
            value={applied.setup}
            onChange={(event) => compact({ setup: event.target.value })}
          >
            <option value="">Indoor or outdoor</option>
            {FIND_SETUP.map((tag) => (
              <option key={tag} value={tag}>
                {tagLabel(tag)}
              </option>
            ))}
          </select>
        )}
        {areaSelect}
        {mini ? null : (
          <>
            <select
              aria-label="When it opens"
              className={selectClass}
              value={nextOpenValue()}
              onChange={(event) => {
                const id = event.target.value;
                if (id === "open") {
                  compact({ openNow: true, weekdays: [] });
                  return;
                }
                if (id === "") {
                  compact({ openNow: false, weekdays: [] });
                  return;
                }
                const choice = nextOpenChoices.find((item) => item.id === id);
                if (choice?.weekday != null) {
                  compact({ weekdays: [choice.weekday], openNow: false });
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
              aria-pressed={applied.openNow}
              onClick={() =>
                compact(applied.openNow ? { openNow: false } : { openNow: true, weekdays: [] })
              }
              className={cn(
                "stall-chip-sm inline-flex h-9 items-center px-3 text-sm font-medium",
                applied.openNow
                  ? "bg-ticket text-foreground"
                  : "border border-input bg-card text-foreground hover:bg-muted",
              )}
            >
              Open now
            </button>
          </>
        )}
        <FilterClearButton
          className="ml-auto"
          disabled={mini ? !anythingOn : !browseOn}
          onClick={() =>
            mini
              ? go({ q: "", weekdays: [], setup: "", areas: [], openNow: false, tags: [] })
              : compact({ weekdays: [], setup: "", areas: [], openNow: false })
          }
        />
      </div>

      <div
        className={cn(
          "flex flex-wrap items-center gap-2 border-t border-dashed border-border",
          mini ? "px-3 py-2 sm:px-3" : "px-3 py-3 sm:px-4",
        )}
      >
        {productChips.map((tag) => (
          <FilterChip
            key={tag}
            pressed={applied.tags.includes(tag)}
            size={chipSize}
            onClick={() => compact({ tags: toggleIn(applied.tags, tag) })}
          >
            {tagLabel(tag)}
          </FilterChip>
        ))}
        {mini
          ? extraMiniTags.map((tag) => (
              <FilterChip
                key={tag}
                pressed
                size={chipSize}
                onClick={() => compact({ tags: toggleIn(applied.tags, tag) })}
              >
                {tagLabel(tag)}
              </FilterChip>
            ))
          : originChipRow(applied.tags).map((tag) => (
              <FilterChip
                key={tag}
                pressed={applied.tags.includes(tag)}
                onClick={() => compact({ tags: toggleIn(applied.tags, tag) })}
              >
                {tagLabel(tag)}
              </FilterChip>
            ))}
        {mini ? null : (
          <div className="ml-auto flex items-center gap-3">
            <FilterClearButton
              disabled={!tagsOn}
              onClick={() => compact({ tags: [] })}
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
        )}
      </div>

      {!mini && panelOpen ? (
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
            go({ ...next, q: typedQ() });
            setPanelOpen(false);
          }}
        />
      ) : null}
    </form>
  );
}

function FilterChip({
  pressed,
  onClick,
  size = "md",
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  size?: "sm" | "md";
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "stall-chip-sm inline-flex items-center px-3 text-sm font-medium",
        size === "sm" ? "h-8" : "h-9",
        pressed
          ? "bg-primary text-primary-foreground"
          : "border border-input bg-card text-foreground hover:bg-muted",
      )}
    >
      {children}
    </button>
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
      onChange({
        ...state,
        setup: state.setup === tag ? "" : state.setup,
        tags: tag === "year-round" ? state.tags.filter((item) => item !== "year-round") : state.tags,
      });
      return;
    }
    onChange({
      ...state,
      setup: tag,
      tags: tag === "year-round" ? state.tags.filter((item) => item !== "year-round") : state.tags,
    });
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
          openNow: on ? false : state.openNow,
        }),
  }));

  const whenRest: FilterOption[] = [
    {
      key: "open-now",
      label: "Open now",
      checked: state.openNow,
      onChange: (on) =>
        onChange({
          ...state,
          openNow: on,
          weekdays: on ? [] : state.weekdays,
        }),
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
