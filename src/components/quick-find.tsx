"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { useGeo } from "@/components/geo-provider";
import { WEEKDAYS } from "@/lib/constants";
import { formatDistance } from "@/lib/geo";
import { distanceMeters } from "@/lib/geo";
import {
  FIND_PRODUCTS,
  FIND_SETUP,
  areasForMarkets,
  tagLabel,
  tagsPresent,
  whenOptions,
} from "@/lib/find-paths";
import type { Market } from "@/types/database";

function weekdayInToronto() {
  const name = new Intl.DateTimeFormat("en-CA", {
    weekday: "long",
    timeZone: "America/Toronto",
  }).format(new Date());
  return WEEKDAYS.findIndex((d) => d === name);
}

const chipIdle =
  "find-chip inline-flex h-10 items-center border border-[color-mix(in_srgb,var(--chalk)_78%,transparent)] bg-[color-mix(in_srgb,var(--chalk)_18%,var(--primary))] px-3.5 text-base font-medium text-primary-foreground hover:bg-[color-mix(in_srgb,var(--chalk)_26%,var(--primary))]";
const chipOn =
  "find-chip inline-flex h-10 items-center border border-[color-mix(in_srgb,var(--foreground)_22%,transparent)] bg-card px-3.5 text-base font-medium text-primary hover:bg-card";

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
      ? "find-chip inline-flex h-10 items-center border border-[color-mix(in_srgb,var(--foreground)_35%,var(--ticket))] bg-ticket px-3.5 text-base font-medium text-receipt hover:bg-ticket"
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

function FindGroup({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <p className="type-kicker text-primary-foreground/80">{label}</p>
      <div className="mt-1.5 flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export function QuickFind({ markets }: { markets: Market[] }) {
  const today = weekdayInToronto();
  const { coords, error, request } = useGeo();
  const areas = areasForMarkets(markets);
  const sellOptions = tagsPresent(markets, FIND_PRODUCTS);
  const setup = tagsPresent(markets, FIND_SETUP);
  const when = whenOptions(today);

  const [q, setQ] = useState("");
  const [whenId, setWhenId] = useState<string | null>(null);
  const [areaQ, setAreaQ] = useState<string | null>(null);
  const [productTags, setProductTags] = useState<string[]>([]);
  const [setupTag, setSetupTag] = useState<string | null>(null);
  const [near, setNear] = useState(false);

  const selectedWhen = when.find((item) => item.id === whenId);
  const query = q.trim();

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
    <form action="/markets" className="grid gap-4">
      <div>
        <label className="sr-only" htmlFor="home-search">
          Search for a Toronto market, vendor, or neighbourhood
        </label>
        <Input
          id="home-search"
          type="search"
          value={q}
          onChange={(e) => {
            const next = e.target.value;
            setQ(next);
            setAreaQ((current) => (current && next.trim() !== current ? null : current));
          }}
          placeholder="A market name, neighbourhood, or food — Wychwood, peaches…"
          className="h-12 border-transparent bg-card text-base text-foreground stall-chip focus-visible:border-foreground/20 focus-visible:ring-foreground/20"
          autoComplete="off"
        />
        {query ? <input type="hidden" name="q" value={query} /> : null}
      </div>

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

      <div>
        <p className="type-kicker text-primary-foreground/80">Where in the city</p>
        <div className="mt-1.5 grid gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <ToggleChip pressed={near} onClick={toggleNear}>
              Near me
            </ToggleChip>
            {!coords ? (
              near ? (
                <span className="text-sm text-primary-foreground/70">
                  {error ?? "Uses your location to sort the list."}
                </span>
              ) : null
            ) : near && nearest.length ? (
              <span className="text-sm text-primary-foreground/80">
                Closest: {nearest.map((row) => `${row.market.name} ${formatDistance(row.distance)}`).join(" · ")}
              </span>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
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
          </div>
        </div>
      </div>
      {near && coords ? (
        <>
          <input type="hidden" name="lat" value={coords.lat} />
          <input type="hidden" name="lng" value={coords.lng} />
        </>
      ) : null}

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
      {productTags.map((tag) => (
        <input key={tag} type="hidden" name="tag" value={tag} />
      ))}
      {setupTag ? <input type="hidden" name="setup" value={setupTag} /> : null}

      <div className="border-t border-primary-foreground/25 pt-4">
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
