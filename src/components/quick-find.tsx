"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { SearchField } from "@/components/search-field";
import { useGeo } from "@/components/geo-provider";
import { SEARCH_LABEL, SEARCH_PLACEHOLDER } from "@/lib/constants";
import { marketsHref, tagLabel, whenOptions, type HomeAreas } from "@/lib/find-paths";
import { cn } from "@/lib/utils";

const chipIdle =
  "find-chip inline-flex h-11 w-full items-center justify-center border border-[color-mix(in_srgb,var(--chalk)_78%,transparent)] bg-[color-mix(in_srgb,var(--chalk)_8%,var(--primary))] px-3 text-base font-medium text-primary-foreground hover:brightness-110 sm:h-10 sm:w-auto sm:justify-start sm:px-3.5";
const chipOn =
  "find-chip inline-flex h-11 w-full items-center justify-center border border-[color-mix(in_srgb,var(--foreground)_22%,transparent)] bg-card px-3 text-base font-medium text-primary hover:bg-card sm:h-10 sm:w-auto sm:justify-start sm:px-3.5";

function ToggleChip({
  pressed,
  onClick,
  children,
  tone,
}: {
  pressed: boolean;
  onClick: () => void;
  children: ReactNode;
  tone?: "open";
}) {
  const selected =
    tone === "open"
      ? "find-chip inline-flex h-11 w-full items-center justify-center border border-[color-mix(in_srgb,var(--chalk)_40%,var(--stamp))] bg-stamp px-3 text-base font-medium text-chalk hover:bg-stamp sm:h-10 sm:w-auto sm:justify-start sm:px-3.5"
      : chipOn;
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={pressed ? selected : chipIdle}
    >
      {children}
    </button>
  );
}

function ChipRow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-2 gap-2 sm:flex sm:flex-wrap", className)}>{children}</div>
  );
}

function FindGroup({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <p className="type-kicker text-chalk">{label}</p>
      <ChipRow className="mt-1.5">{children}</ChipRow>
    </div>
  );
}

export function QuickFind({
  areas,
  sellOptions,
  cuisineOptions,
  setup,
  today,
}: {
  areas: HomeAreas;
  sellOptions: string[];
  cuisineOptions: string[];
  setup: string[];
  today: number;
}) {
  const router = useRouter();
  const { coords, error, requestAsync } = useGeo();
  const when = whenOptions(today);

  const [q, setQ] = useState("");
  const [whenId, setWhenId] = useState<string | null>(null);
  const [areaQ, setAreaQ] = useState<string | null>(null);
  const [productTags, setProductTags] = useState<string[]>([]);
  const [originTags, setOriginTags] = useState<string[]>([]);
  const [setupTag, setSetupTag] = useState<string | null>(null);
  const [askingGeo, setAskingGeo] = useState(false);
  const [more, setMore] = useState(false);
  const [allPlaces, setAllPlaces] = useState(false);

  const selectedWhen = when.find((item) => item.id === whenId);
  const query = q.trim();
  const extraOn = Boolean(areaQ || productTags.length || originTags.length || setupTag);
  const placeChips = allPlaces ? [...areas.primary, ...areas.rest] : areas.primary;
  const canMore = Boolean(
    placeChips.length || sellOptions.length || cuisineOptions.length || setup.length,
  );

  function toggleWhen(id: string) {
    setWhenId((current) => (current === id ? null : id));
  }

  async function goNear() {
    if (askingGeo) return;
    setAskingGeo(true);
    const here = coords ?? (await requestAsync());
    setAskingGeo(false);
    if (!here) return;
    const tags = [...productTags, ...originTags];
    router.push(
      marketsHref({
        q: query || undefined,
        weekdays:
          selectedWhen?.weekday != null && !selectedWhen.openNow
            ? [selectedWhen.weekday]
            : undefined,
        openNow: selectedWhen?.openNow || undefined,
        areas: areaQ ? [areaQ] : undefined,
        tags: tags.length ? tags : undefined,
        setup: setupTag || undefined,
        lat: String(here.lat),
        lng: String(here.lng),
        sort: "near",
      }),
    );
  }

  return (
    <form action="/markets" className="grid gap-3 sm:gap-4">
      <div className="order-1">
        <label className="sr-only" htmlFor="home-search">
          {SEARCH_LABEL}
        </label>
        <SearchField
          id="home-search"
          value={q}
          onChange={(next) => {
            setQ(next);
            setAreaQ((current) => (current && next.trim() !== current ? null : current));
          }}
          placeholder={SEARCH_PLACEHOLDER}
          className="h-12 border-transparent bg-card px-3.5 text-base text-foreground focus-visible:border-foreground/20 focus-visible:ring-foreground/20"
        />
        {query ? <input type="hidden" name="q" value={query} /> : null}
      </div>

      <div className="order-3 sm:order-2">
        <FindGroup label="When you can go">
          {when.map((item) => (
            <ToggleChip
              key={item.id}
              pressed={whenId === item.id}
              tone={item.tone}
              onClick={() => toggleWhen(item.id)}
            >
              {item.label}
            </ToggleChip>
          ))}
        </FindGroup>
        {selectedWhen?.openNow ? <input type="hidden" name="openNow" value="1" /> : null}
        {selectedWhen?.weekday != null && !selectedWhen.openNow ? (
          <input type="hidden" name="weekday" value={selectedWhen.weekday} />
        ) : null}
      </div>

      <div className="order-4 sm:order-3">
        <p className="type-kicker text-chalk">Where you go</p>
        <div className="mt-1.5 flex flex-col items-stretch gap-2 sm:items-start">
          <ToggleChip pressed={askingGeo} onClick={() => void goNear()}>
            {askingGeo ? "Locating…" : "Near me"}
          </ToggleChip>
          {error && !coords ? <span className="text-sm text-chalk">{error}</span> : null}
          {placeChips.length ? (
            <div id="home-find-areas" className={cn(!more && "max-sm:hidden")}>
              <ChipRow>
                {placeChips.map((area) => (
                  <ToggleChip
                    key={area.q}
                    pressed={areaQ === area.q}
                    onClick={() => {
                      if (areaQ === area.q) {
                        setAreaQ(null);
                        if (q === area.q) setQ("");
                        return;
                      }
                      setAreaQ(area.q);
                      setQ(area.q);
                    }}
                  >
                    {area.label}
                  </ToggleChip>
                ))}
                {areas.rest.length ? (
                  <button
                    type="button"
                    aria-expanded={allPlaces}
                    onClick={() => setAllPlaces((open) => !open)}
                    className={chipIdle}
                  >
                    {allPlaces ? "Fewer places" : `${areas.rest.length} more places`}
                  </button>
                ) : null}
              </ChipRow>
            </div>
          ) : (
            <div id="home-find-areas" hidden />
          )}
        </div>
      </div>
      <div
        id="home-find-filters"
        className={cn("order-5 sm:order-4 grid gap-3 sm:gap-4", !more && "max-sm:hidden")}
      >
        {sellOptions.length ? (
          <FindGroup label="What they sell">
            {sellOptions.map((item) => (
              <ToggleChip
                key={item}
                pressed={productTags.includes(item)}
                onClick={() =>
                  setProductTags((current) =>
                    current.includes(item)
                      ? current.filter((tag) => tag !== item)
                      : [...current, item],
                  )
                }
              >
                {tagLabel(item)}
              </ToggleChip>
            ))}
          </FindGroup>
        ) : null}

        {cuisineOptions.length ? (
          <FindGroup label="Cuisine">
            {cuisineOptions.map((item) => (
              <ToggleChip
                key={item}
                pressed={originTags.includes(item)}
                onClick={() =>
                  setOriginTags((current) =>
                    current.includes(item)
                      ? current.filter((tag) => tag !== item)
                      : [...current, item],
                  )
                }
              >
                {tagLabel(item)}
              </ToggleChip>
            ))}
          </FindGroup>
        ) : null}

        {setup.length ? (
          <FindGroup label="Indoor or outdoor">
            {setup.map((item) => (
              <ToggleChip
                key={item}
                pressed={setupTag === item}
                onClick={() => setSetupTag((current) => (current === item ? null : item))}
              >
                {tagLabel(item)}
              </ToggleChip>
            ))}
          </FindGroup>
        ) : null}
      </div>
      {areaQ ? <input type="hidden" name="area" value={areaQ} /> : null}
      {productTags.map((tag) => (
        <input key={tag} type="hidden" name="tag" value={tag} />
      ))}
      {originTags.map((tag) => (
        <input key={`origin-${tag}`} type="hidden" name="tag" value={tag} />
      ))}
      {setupTag ? <input type="hidden" name="setup" value={setupTag} /> : null}

      {canMore ? (
        <button
          type="button"
          className="order-6 text-left text-sm font-medium text-chalk underline underline-offset-4 sm:hidden"
          aria-expanded={more}
          aria-controls="home-find-areas home-find-filters"
          onClick={() => setMore((open) => !open)}
        >
          {more ? "Fewer filters" : extraOn ? "All filters · on" : "All filters"}
        </button>
      ) : null}

      <div className="order-2 border-t border-primary-foreground/25 pt-3 sm:order-5 sm:pt-4">
        <button
          type="submit"
          className="find-go stall-chip inline-flex min-h-[3.35rem] w-full cursor-pointer items-center justify-between gap-4 px-5 py-3 text-left text-receipt outline-none transition-[filter,transform] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-receipt active:translate-y-px"
        >
          <span className="type-column text-receipt">
            {query || whenId || productTags.length || originTags.length || setupTag
              ? "Search with these"
              : "Search all markets"}
          </span>
          <span
            aria-hidden
            className="shrink-0 text-base font-medium text-receipt"
          >
            Go
          </span>
        </button>
      </div>
    </form>
  );
}
