"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { FilterClearButton } from "@/components/filter-clear";
import { FilterColumn, FilterRow, type FilterOption } from "@/components/filter-column";
import { SearchField } from "@/components/search-field";
import { useGeo } from "@/components/geo-provider";
import { COUNTRY_TAGS, PRODUCT_TAGS, SEARCH_LABEL, SEARCH_PLACEHOLDER, WEEKDAYS } from "@/lib/constants";
import {
  FIND_RECORD,
  marketsHref,
  tagLabel,
  type DirectorySort,
  type MarketsSearch,
  type PlaceAreas,
} from "@/lib/find-paths";
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
  variant = "full",
}: {
  defaults?: SearchFormDefaults;
  places: PlaceAreas;
  resultCount?: number;
  /** Toronto weekday from the server so Today/Tomorrow options match first paint. */
  todayWeekday?: number;
  variant?: "full" | "mini";
}) {
  const router = useRouter();
  const { coords, requestAsync, error: geoError } = useGeo();
  const formRef = useRef<HTMLFormElement>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [geoNote, setGeoNote] = useState<string | null>(null);
  const [askingGeo, setAskingGeo] = useState(false);
  const [draft, setDraft] = useState<BrowseState>(() => fromDefaults(defaults));
  const applied = fromDefaults(defaults);
  const live = panelOpen ? draft : applied;
  const mini = variant === "mini";
  const nearOn = Boolean(defaults?.lat && defaults?.lng);

  function typedQ() {
    if (!formRef.current) return live.q;
    return String(new FormData(formRef.current).get("q") ?? live.q);
  }

  function go(
    next: BrowseState,
    geo?: { lat?: string; lng?: string; sort?: DirectorySort },
  ) {
    const lat = geo && "lat" in geo ? geo.lat : defaults?.lat;
    const lng = geo && "lng" in geo ? geo.lng : defaults?.lng;
    router.push(
      marketsHref({
        ...toSearch(next, { ...defaults, lat, lng, sort: geo?.sort ?? defaults?.sort }),
      }),
    );
  }

  /** Compact chips always apply. All Filters is the only uncommitted draft. */
  function compact(patch: Partial<BrowseState>, geo?: { lat?: string; lng?: string; sort?: DirectorySort }) {
    setPanelOpen(false);
    go({ ...applied, q: typedQ(), ...patch }, geo);
  }

  function openPanel() {
    setDraft(applied);
    setPanelOpen((open) => !open);
  }

  async function toggleNear() {
    if (nearOn) {
      setGeoNote(null);
      compact({}, { lat: "", lng: "", sort: "next" });
      return;
    }
    setAskingGeo(true);
    setGeoNote(null);
    const here = coords ?? (await requestAsync());
    setAskingGeo(false);
    if (!here) {
      setGeoNote(geoError ?? "Allow location to sort nearby.");
      return;
    }
    compact({}, { lat: String(here.lat), lng: String(here.lng), sort: "near" });
  }

  const dayValue =
    applied.weekdays.length === 1
      ? String(applied.weekdays[0])
      : applied.weekdays.length > 1
        ? "multi"
        : "";
  const extraOn =
    Boolean(applied.setup) || applied.areas.length > 0 || applied.tags.length > 0;
  const browseOn =
    applied.weekdays.length > 0 || extraOn || applied.openNow || nearOn;
  const anythingOn = browseOn || Boolean(applied.q.trim());
  const fieldH = mini ? "h-9" : "h-10";

  const daySelect = (
    <select
      aria-label="When"
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

  return (
    <form
      ref={formRef}
      className="bg-secondary shadow-[inset_4px_0_0_var(--stamp)] ring-1 ring-border"
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
          placeholder={SEARCH_PLACEHOLDER}
          className={cn(fieldH, "bg-card")}
          aria-label={SEARCH_LABEL}
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
        {daySelect}
        <button
          type="button"
          aria-pressed={nearOn}
          disabled={askingGeo}
          onClick={() => {
            void toggleNear();
          }}
          className={cn(
            "stall-chip-sm inline-flex h-9 items-center px-3 text-sm font-medium",
            nearOn
              ? "bg-stamp text-chalk"
              : "border border-input bg-card text-foreground hover:bg-muted",
          )}
        >
          {askingGeo ? "Locating…" : "Near me"}
        </button>
        <button
          type="button"
          aria-pressed={applied.openNow}
          onClick={() =>
            compact(applied.openNow ? { openNow: false } : { openNow: true, weekdays: [] })
          }
          className={cn(
            "stall-chip-sm inline-flex h-9 items-center px-3 text-sm font-medium",
            applied.openNow
              ? "bg-stamp text-chalk"
              : "border border-input bg-card text-foreground hover:bg-muted",
          )}
        >
          Open now
        </button>
        <button
          type="button"
          className="text-sm font-medium underline underline-offset-4 hover:text-foreground"
          aria-expanded={panelOpen}
          aria-controls="all-filters"
          onClick={openPanel}
        >
          All filters
        </button>
        <FilterClearButton
          className="ml-auto"
          disabled={!anythingOn && !nearOn}
          onClick={() =>
            compact(
              { q: "", weekdays: [], setup: "", areas: [], openNow: false, tags: [] },
              { lat: "", lng: "", sort: "next" },
            )
          }
        />
        {geoNote ? <p className="basis-full text-sm text-muted-foreground">{geoNote}</p> : null}
      </div>

      {extraOn ? (
        <div
          className={cn(
            "flex flex-wrap items-center gap-2 border-t border-dashed border-border",
            mini ? "px-3 py-2 sm:px-3" : "px-3 py-3 sm:px-4",
          )}
        >
          {applied.setup ? (
            <FilterChip pressed onClick={() => compact({ setup: "" })}>
              {tagLabel(applied.setup)}
            </FilterChip>
          ) : null}
          {applied.areas.map((area) => (
            <FilterChip
              key={area}
              pressed
              onClick={() => compact({ areas: applied.areas.filter((item) => item !== area) })}
            >
              {area}
            </FilterChip>
          ))}
          {applied.tags.map((tag) => (
            <FilterChip
              key={tag}
              pressed
              onClick={() => compact({ tags: toggleIn(applied.tags, tag) })}
            >
              {tagLabel(tag)}
            </FilterChip>
          ))}
        </div>
      ) : null}

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
        <FilterColumn title="Place" lead={placeLead} options={placeOptions} pageSize={5} />
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
