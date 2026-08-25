"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { SearchField } from "@/components/search-field";
import { useGeo } from "@/components/geo-provider";
import { WEEKDAYS } from "@/lib/constants";
import { formatDistance } from "@/lib/geo";
import { distanceMeters } from "@/lib/geo";
import { tagLabel, whenOptions } from "@/lib/find-paths";
import { cn } from "@/lib/utils";

type NearMarket = {
  name: string;
  lat: number;
  lng: number;
};

function weekdayInToronto() {
  const name = new Intl.DateTimeFormat("en-CA", {
    weekday: "long",
    timeZone: "America/Toronto",
  }).format(new Date());
  return WEEKDAYS.findIndex((d) => d === name);
}

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
      ? "find-chip inline-flex h-11 w-full items-center justify-center border border-[color-mix(in_srgb,var(--foreground)_35%,var(--ticket))] bg-ticket px-3 text-base font-medium text-foreground hover:bg-ticket sm:h-10 sm:w-auto sm:justify-start sm:px-3.5"
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
  markets,
  areas,
  sellOptions,
  setup,
}: {
  markets: NearMarket[];
  areas: Array<{ label: string; q: string }>;
  sellOptions: string[];
  setup: string[];
}) {
  const today = weekdayInToronto();
  const { coords, error, request } = useGeo();
  const when = whenOptions(today);

  const [q, setQ] = useState("");
  const [whenId, setWhenId] = useState<string | null>(null);
  const [areaQ, setAreaQ] = useState<string | null>(null);
  const [productTags, setProductTags] = useState<string[]>([]);
  const [setupTag, setSetupTag] = useState<string | null>(null);
  const [near, setNear] = useState(false);
  const [more, setMore] = useState(false);

  const selectedWhen = when.find((item) => item.id === whenId);
  const query = q.trim();
  const extraOn = Boolean(areaQ || productTags.length || setupTag);
  const canMore = Boolean(areas.length || sellOptions.length || setup.length);

  const nearest =
    coords && near
      ? markets
          .map((market) => ({
            market,
            distance: distanceMeters(coords, { lat: market.lat, lng: market.lng }),
          }))
          .sort((a, b) => a.distance - b.distance)
          .slice(0, 3)
      : [];

  function toggleWhen(id: string) {
    setWhenId((current) => (current === id ? null : id));
  }

  function toggleNear() {
    if (near) {
      setNear(false);
      return;
    }
    setNear(true);
    if (!coords) request();
  }

  return (
    <form action="/markets" className="grid gap-3 sm:gap-4">
      <div className="order-1">
        <label className="sr-only" htmlFor="home-search">
          Search for a Toronto market, vendor, or neighbourhood
        </label>
        <SearchField
          id="home-search"
          value={q}
          onChange={(next) => {
            setQ(next);
            setAreaQ((current) => (current && next.trim() !== current ? null : current));
          }}
          placeholder="Market, neighbourhood, or food"
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
        <p className="type-kicker text-chalk">Where in the city</p>
        <div className="mt-1.5 flex flex-col items-stretch gap-2 sm:items-start">
          <ToggleChip pressed={near} onClick={toggleNear}>
            Near me
          </ToggleChip>
          {!coords ? (
            near ? (
              <span className="text-sm text-chalk">
                {error ?? "Uses your location to sort the list."}
              </span>
            ) : null
          ) : near && nearest.length ? (
            <span className="text-sm text-chalk">
              Closest: {nearest.map((row) => `${row.market.name} ${formatDistance(row.distance)}`).join(" · ")}
            </span>
          ) : null}
          {areas.length ? (
            <div id="home-find-areas" className={cn(!more && "max-sm:hidden")}>
              <ChipRow>
                {areas.map((area) => (
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
              </ChipRow>
            </div>
          ) : (
            <div id="home-find-areas" hidden />
          )}
        </div>
      </div>
      {near && coords ? (
        <>
          <input type="hidden" name="lat" value={coords.lat} />
          <input type="hidden" name="lng" value={coords.lng} />
        </>
      ) : null}

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
      {productTags.map((tag) => (
        <input key={tag} type="hidden" name="tag" value={tag} />
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
            {query || whenId || productTags.length || setupTag || near
              ? "Search with these"
              : "Search all markets"}
          </span>
          <span
            aria-hidden
            className="shrink-0 text-base font-medium text-ticket"
          >
            Go
          </span>
        </button>
      </div>
    </form>
  );
}
