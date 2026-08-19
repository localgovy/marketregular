"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { useGeo } from "@/components/geo-provider";
import { cn } from "@/lib/utils";
import { WEEKDAYS } from "@/lib/constants";
import { distanceMeters, formatDistance } from "@/lib/geo";
import {
  FIND_PRODUCTS,
  FIND_SETUP,
  areasForMarkets,
  tagLabel,
  tagsPresent,
  whenLinks,
} from "@/lib/find-paths";
import type { Market } from "@/types/database";

function weekdayInToronto() {
  const name = new Intl.DateTimeFormat("en-CA", {
    weekday: "long",
    timeZone: "America/Toronto",
  }).format(new Date());
  return WEEKDAYS.findIndex((d) => d === name);
}

const chip =
  "inline-flex h-10 items-center rounded-md border border-primary-foreground/30 px-3 text-base text-primary-foreground hover:bg-primary-foreground/10";

function FindChip({
  href,
  children,
  tone,
}: {
  href: string;
  children: ReactNode;
  tone?: "open";
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex h-10 items-center rounded-md px-3 text-base",
        tone === "open"
          ? "bg-ticket text-receipt hover:bg-ticket/90"
          : chip
      )}
    >
      {children}
    </Link>
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
      <p className="text-sm font-medium text-primary-foreground/80">{label}</p>
      <div className="mt-1.5 flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function NearMe({ markets }: { markets: Market[] }) {
  const { coords, error, request } = useGeo();

  if (!coords) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={request} className={chip}>
          Near me
        </button>
        {error ? (
          <span className="text-sm text-primary-foreground/70">{error}</span>
        ) : (
          <span className="text-sm text-primary-foreground/70">
            Share your location to sort by distance.
          </span>
        )}
      </div>
    );
  }

  const nearest = markets
    .map((market) => ({
      market,
      distance: distanceMeters(coords, { lat: market.lat, lng: market.lng }),
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 3);

  return (
    <p className="text-base text-primary-foreground/90">
      Closest:{" "}
      {nearest.map((row, i) => (
        <span key={row.market.id}>
          {i > 0 ? <span className="text-primary-foreground/50"> · </span> : null}
          <Link href={`/markets/${row.market.slug}`} className="font-medium hover:underline">
            {row.market.name}
          </Link>
          <span className="text-primary-foreground/70"> {formatDistance(row.distance)}</span>
        </span>
      ))}
      <span className="text-primary-foreground/50"> · </span>
      <Link
        href={`/search?lat=${coords.lat}&lng=${coords.lng}`}
        className="underline-offset-2 hover:underline"
      >
        All by distance
      </Link>
    </p>
  );
}

export function QuickFind({ markets }: { markets: Market[] }) {
  const today = weekdayInToronto();
  const areas = areasForMarkets(markets);
  const products = tagsPresent(markets, FIND_PRODUCTS);
  const setup = tagsPresent(markets, FIND_SETUP);

  return (
    <div className="grid gap-4">
      <form action="/search" className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
        <label className="sr-only" htmlFor="home-search">
          Search for a Toronto market, vendor, or neighbourhood
        </label>
        <Input
          id="home-search"
          name="q"
          type="search"
          placeholder="A market name, neighbourhood, or food — Wychwood, peaches…"
          className="h-12 border-transparent bg-card text-base text-foreground focus-visible:border-foreground/20 focus-visible:ring-foreground/20"
          autoComplete="off"
        />
        <button
          type="submit"
          className={cn(
            buttonVariants({ size: "lg" }),
            "h-12 shrink-0 bg-card px-6 text-base text-primary hover:bg-card/90"
          )}
        >
          Search
        </button>
      </form>

      <FindGroup label="When you can go">
        {whenLinks(today).map((chipItem) => (
          <FindChip key={chipItem.href + chipItem.label} href={chipItem.href} tone={chipItem.tone}>
            {chipItem.label}
          </FindChip>
        ))}
      </FindGroup>

      <div>
        <p className="text-sm font-medium text-primary-foreground/80">Where in the city</p>
        <div className="mt-1.5 grid gap-2">
          <NearMe markets={markets} />
          <div className="flex flex-wrap gap-2">
            {areas.map((area) => (
              <FindChip key={area.q} href={`/search?q=${encodeURIComponent(area.q)}`}>
                {area.label}
              </FindChip>
            ))}
          </div>
        </div>
      </div>

      {products.length ? (
        <FindGroup label="What they sell">
          {products.map((tag) => (
            <FindChip key={tag} href={`/search?tag=${encodeURIComponent(tag)}`}>
              {tagLabel(tag)}
            </FindChip>
          ))}
        </FindGroup>
      ) : null}

      {setup.length ? (
        <FindGroup label="Indoor or outdoor">
          {setup.map((tag) => (
            <FindChip key={tag} href={`/search?tag=${encodeURIComponent(tag)}`}>
              {tagLabel(tag)}
            </FindChip>
          ))}
        </FindGroup>
      ) : null}

      <p>
        <Link
          href="/search"
          className="text-base text-primary-foreground/80 underline-offset-4 hover:text-primary-foreground hover:underline"
        >
          All markets on one page
        </Link>
      </p>
    </div>
  );
}
