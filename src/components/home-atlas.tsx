"use client";

import { useMemo, useState, type KeyboardEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type {
  HomeAtlasAisleCard,
  HomeAtlasData,
  HomeAtlasMarketSlot,
  HomeAtlasNeighbourhoodCircuit,
  HomeAtlasVendorSpotlight,
} from "@/lib/home-atlas-data";
import { AddressLink } from "@/components/address-link";
import { useGeo } from "@/components/geo-provider";
import { Hours } from "@/components/hours";
import { ListingScore } from "@/components/listing-score";
import {
  AsteriskMark,
  BlocksMark,
  CaretLeftMark,
  CaretRightMark,
  CrateMark,
  MapleMark,
  PlateMark,
  RulesMark,
  SignMark,
  TagMark,
  TallyMark,
  WeekMark,
} from "@/components/marks";
import { MarketMapLazy } from "@/components/market-map-lazy";
import { NowLabel } from "@/components/now-label";
import { ProductPhotoFrame } from "@/components/product-photo-frame";
import { MenuItemPhoto } from "@/components/menu-item-photo";
import { ReviewCard } from "@/components/review-card";
import { SaveButton } from "@/components/save-button";
import { SavedRail } from "@/components/saved-rail";
import { SearchField } from "@/components/search-field";
import { VerifiedName } from "@/components/verified-stamp";
import { VendorTodayItem, VendorWeekItem } from "@/components/home-vendors-item";
import { SEARCH_LABEL, SEARCH_PLACEHOLDER, WEEKDAYS } from "@/lib/constants";
import { marketsHref, tagLabel } from "@/lib/find-paths";
import { formatPrice, listingMarkSrc } from "@/lib/format";
import { LAUNCH_CITY } from "@/lib/launch";
import { cn } from "@/lib/utils";

function formatCensus(n: number) {
  return n.toLocaleString("en-CA");
}

const AISLE_GUIDE_CHIP_INITIAL = 6;
const PLACE_CARD_INITIAL = 6;
const PLACE_CARD_MARKETS = 4;
const FILTER_PAGE_SIZE = 4;

function pagedItems<T>(items: readonly T[], start: number, size: number): T[] {
  if (items.length <= size) return [...items];
  const length = items.length;
  const origin = ((start % length) + length) % length;
  return Array.from({ length: size }, (_, offset) => items[(origin + offset) % length]);
}

function pageIncludes(start: number, length: number, index: number, size: number) {
  if (index < 0 || length <= size) return true;
  const origin = ((start % length) + length) % length;
  for (let offset = 0; offset < size; offset += 1) {
    if ((origin + offset) % length === index) return true;
  }
  return false;
}

function AisleProductGuides({ terms }: { terms: HomeAtlasAisleCard["sampleTerms"] }) {
  const [expanded, setExpanded] = useState(false);
  if (terms.length === 0) return null;

  const initialCount = Math.min(AISLE_GUIDE_CHIP_INITIAL, terms.length);
  const visible = expanded ? terms : terms.slice(0, initialCount);
  const hidden = terms.length - initialCount;
  const chipClass =
    "stall-chip-sm inline-flex items-center bg-secondary px-3 py-1 text-sm font-medium text-foreground ring-1 ring-border hover:bg-primary hover:text-primary-foreground";
  const toggleClass =
    "stall-chip-sm cursor-pointer bg-card px-3 py-1 text-sm font-medium text-primary ring-1 ring-border hover:bg-secondary";

  return (
    <div className="mt-3 min-w-0">
      <p className="text-sm font-medium text-foreground">Product guides:</p>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        {visible.map((term) => (
          <Link key={term.slug} href={`/find/${term.slug}`} className={chipClass}>
            <span>{term.term}</span>
          </Link>
        ))}
        {!expanded && hidden > 0 ? (
          <button type="button" onClick={() => setExpanded(true)} className={toggleClass}>
            Show more ({hidden})
          </button>
        ) : null}
        {expanded && hidden > 0 ? (
          <button type="button" onClick={() => setExpanded(false)} className={toggleClass}>
            Show less
          </button>
        ) : null}
      </div>
    </div>
  );
}

function NeighbourhoodCircuitCard({
  circuit,
  onShowStalls,
  showStalls,
}: {
  circuit: HomeAtlasNeighbourhoodCircuit;
  onShowStalls: (label: string) => void;
  showStalls: boolean;
}) {
  const halls = circuit.topMarkets.slice(0, PLACE_CARD_MARKETS);
  const moreHalls = circuit.topMarkets.length - halls.length;
  return (
    <div className="flex flex-col justify-between bg-card ring-1 ring-border">
      <div>
        <div className="flex items-center justify-between gap-2 border-b border-border bg-secondary/55 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <StallEmblem
              src={circuit.topMarkets[0]?.logo_url}
              name={circuit.label}
              kind="market"
              size="sm"
              tone="board"
            />
            <h3>
              <Link
                href={`/markets?area=${encodeURIComponent(circuit.q)}`}
                className="hover:underline"
              >
                {circuit.label}
              </Link>
            </h3>
          </div>
          <span className="type-nums text-sm font-medium text-primary">
            {circuit.vendorCount > 0
              ? `${circuit.vendorCount} stalls`
              : `${circuit.marketCount} ${circuit.marketCount === 1 ? "market" : "markets"}`}
          </span>
        </div>

        <ul className="divide-y divide-border/70">
          {halls.map((market) => (
            <li key={market.id} className="px-4 py-3 hover:bg-secondary/35">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3">
                <div className="flex min-w-0 items-start gap-2.5">
                  <StallEmblem
                    src={market.logo_url}
                    name={market.name}
                    kind="market"
                    size="xs"
                    className="mt-0.5"
                  />
                  <div className="min-w-0">
                    <p>
                      <Link
                        href={`/markets/${market.slug}`}
                        className="text-base font-medium hover:underline"
                      >
                        <VerifiedName slug={market.slug} name={market.name} />
                      </Link>
                      <ListingScore
                        parens
                        ratingAvg={market.rating_avg}
                        reviewCount={market.review_count}
                        className="ml-1.5 text-stamp"
                      />
                    </p>
                    {market.open ? (
                      <p className="mt-0.5">
                        <NowLabel>Open</NowLabel>
                      </p>
                    ) : null}
                    <SessionLines sessions={market.sessions} align="stretch" />
                  </div>
                </div>
                <SaveButton kind="market" slug={market.slug} name={market.name} />
              </div>
            </li>
          ))}
        </ul>
        {moreHalls > 0 ? (
          <p className="border-t border-border/70 px-4 py-2.5 text-sm">
            <Link
              href={`/markets?area=${encodeURIComponent(circuit.q)}`}
              className="font-medium text-primary hover:underline"
            >
              {moreHalls} more {moreHalls === 1 ? "market" : "markets"}
            </Link>
          </p>
        ) : null}

        {circuit.topVendors.length > 0 ? (
          <div className="border-t border-dashed border-border bg-secondary/30 px-4 py-2.5">
            <p className="text-sm font-medium text-foreground">Stalls here</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {circuit.topVendors.slice(0, 3).map((v) => (
                <Link
                  key={v.slug}
                  href={`/vendors/${v.slug}`}
                  className="stall-chip-sm inline-flex items-center gap-1.5 bg-card py-1 pr-2.5 pl-1.5 text-sm font-medium text-foreground ring-1 ring-border hover:bg-primary hover:text-primary-foreground"
                >
                  <StallEmblem src={v.logoUrl} name={v.name} kind="vendor" size="xs" />
                  <span>{v.name}</span>
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div
        className={cn(
          "flex items-center gap-3 border-t border-border bg-secondary/25 px-4 py-2.5 text-sm",
          showStalls ? "justify-between" : "justify-end",
        )}
      >
        {showStalls ? (
          <button
            type="button"
            onClick={() => onShowStalls(circuit.label)}
            className="cursor-pointer font-medium text-stamp hover:underline"
          >
            Show {circuit.label} stalls above
          </button>
        ) : null}
        <Link
          href={`/markets?area=${encodeURIComponent(circuit.q)}`}
          className="font-medium text-primary hover:underline"
        >
          Explore {circuit.label}
        </Link>
      </div>
    </div>
  );
}

function PlaceCircuitGroup({
  title,
  circuits,
  onShowStalls,
  stallLabels,
}: {
  title: string;
  circuits: HomeAtlasNeighbourhoodCircuit[];
  onShowStalls: (label: string) => void;
  stallLabels: Set<string>;
}) {
  const [expanded, setExpanded] = useState(false);
  if (!circuits.length) return null;

  const initialCount = Math.min(PLACE_CARD_INITIAL, circuits.length);
  const visible = expanded ? circuits : circuits.slice(0, initialCount);
  const hidden = circuits.length - initialCount;
  const toggleClass =
    "stall-chip-sm cursor-pointer bg-card px-3 py-1.5 text-sm font-medium text-primary ring-1 ring-border hover:bg-secondary";

  return (
    <div>
      <h3 className="mb-3">{title}</h3>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((circuit) => (
          <NeighbourhoodCircuitCard
            key={circuit.q}
            circuit={circuit}
            onShowStalls={onShowStalls}
            showStalls={stallLabels.has(circuit.label.toLowerCase())}
          />
        ))}
      </div>
      {hidden > 0 ? (
        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          className={cn(toggleClass, "mt-4")}
        >
          {expanded ? "Show less" : `Show more (${hidden})`}
        </button>
      ) : null}
    </div>
  );
}

function SessionLines({
  sessions,
  highlightDay,
  align = "end",
}: {
  sessions: Array<{ day: string; hours: string }>;
  highlightDay?: string | null;
  align?: "end" | "stretch";
}) {
  if (!sessions.length) return null;
  return (
    <ul>
      {sessions.map((session) => (
        <li
          key={`${session.day}-${session.hours}`}
          className={cn(
            "grid gap-x-2",
            align === "end" ? "grid-cols-[auto_auto] justify-end" : "grid-cols-[minmax(0,1fr)_auto]",
          )}
        >
          <span className="text-sm text-muted-foreground">{session.day}</span>
          <Hours
            value={session.hours}
            className={
              highlightDay && session.day === highlightDay
                ? "font-medium text-stamp"
                : "text-muted-foreground"
            }
          />
        </li>
      ))}
    </ul>
  );
}

/**
 * Guard that guarantees an image URL never routes through Supabase's paid
 * `/storage/v1/render/image/` transform endpoint or Vercel's `/_next/image` optimizer.
 */
function directPublicImageSrc(src: string | null | undefined): string | null {
  if (!src) return null;
  if (src.includes("/storage/v1/render/image/") || src.startsWith("/_next/image")) {
    return null;
  }
  return src;
}

/**
 * Cohesive Stall / Hall Emblem Plate (`StallEmblem`).
 * Renders the listing's direct public logo inside a framed paper plate, or falls back to a
 * tactile woodcut stamp so every vendor and market row has a uniform visual anchor.
 */
function StallEmblem({
  src,
  name,
  kind = "vendor",
  size = "md",
  tone = "paper",
  className,
}: {
  src: string | null | undefined;
  name: string;
  kind?: "vendor" | "market";
  size?: "xs" | "sm" | "md" | "lg";
  tone?: "paper" | "chalk" | "board";
  className?: string;
}) {
  const url = directPublicImageSrc(listingMarkSrc(src));
  const [failed, setFailed] = useState(false);
  const showLogo = Boolean(url && !failed);

  const sizeSpec = {
    xs: { box: "size-6 p-0.5", px: 24, icon: "size-3.5" },
    sm: { box: "size-8 p-1", px: 32, icon: "size-4" },
    md: { box: "size-10 p-1", px: 40, icon: "size-5" },
    lg: { box: "size-11 p-1", px: 44, icon: "size-5" },
  }[size];

  const toneClasses = {
    paper: "bg-card text-board ring-1 ring-border",
    chalk: "bg-primary-foreground text-primary ring-1 ring-black/15",
    board: "bg-board text-chalk ring-1 ring-board",
  }[tone];

  return (
    <span
      aria-hidden
      title={name}
      className={cn(
        "stall-chip-sm inline-flex shrink-0 items-center justify-center overflow-hidden select-none",
        sizeSpec.box,
        showLogo ? "bg-primary-foreground ring-1 ring-border" : toneClasses,
        className,
      )}
    >
      {showLogo && url ? (
        <img
          src={url}
          alt=""
          width={sizeSpec.px}
          height={sizeSpec.px}
          loading="lazy"
          decoding="async"
          className="block max-h-full max-w-full object-contain object-center"
          onError={() => setFailed(true)}
        />
      ) : kind === "market" ? (
        <RulesMark className={sizeSpec.icon} />
      ) : (
        <CrateMark className={sizeSpec.icon} />
      )}
    </span>
  );
}

/**
 * Cohesive square category/aisle thumbnail (`ProductThumb`).
 * Used on aisle filter chips and craving shortcuts (never on individual menu rows).
 */
function ProductThumb({
  src,
  size = "sm",
  className,
}: {
  src: string | null | undefined;
  size?: "xs" | "sm" | "md";
  className?: string;
}) {
  const safeSrc = directPublicImageSrc(src);
  const [failed, setFailed] = useState(false);
  const show = Boolean(safeSrc && !failed);

  const spec = {
    xs: { box: "size-5", px: 20, icon: "size-3" },
    sm: { box: "size-8", px: 32, icon: "size-4" },
    md: { box: "size-12", px: 48, icon: "size-4" },
  }[size];

  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden border border-border bg-secondary text-primary",
        spec.box,
        className,
      )}
    >
      {show && safeSrc ? (
        <img
          src={safeSrc}
          alt=""
          width={spec.px}
          height={spec.px}
          loading="lazy"
          decoding="async"
          className="size-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <TagMark className={spec.icon} />
      )}
    </span>
  );
}

const CRAVING_SHORTCUTS = [
  { label: "Sourdough", slug: "sourdough-toronto", aisleId: "bread-and-bakery" },
  { label: "Butter tarts", slug: "butter-tarts-toronto", aisleId: "pies-and-sweets" },
  { label: "Farmstead cheese", slug: "cheese-toronto", aisleId: "cheese-and-dairy" },
  { label: "Heirloom tomatoes", slug: "tomatoes-toronto", aisleId: "vegetables" },
  { label: "Ontario apples", slug: "apples-toronto", aisleId: "apples-and-fruit" },
  { label: "Farm eggs", slug: "eggs-toronto", aisleId: "eggs" },
  { label: "Raw honey", slug: "honey-toronto", aisleId: "honey" },
  { label: "Maple syrup", slug: "maple-syrup-toronto", aisleId: "maple" },
] as const;

function CravingCycle({ aisles }: { aisles: HomeAtlasAisleCard[] }) {
  const [index, setIndex] = useState(0);
  const count = CRAVING_SHORTCUTS.length;
  const current = CRAVING_SHORTCUTS[index] ?? CRAVING_SHORTCUTS[0];
  const aisle = aisles.find((item) => item.id === current.aisleId);
  const term = aisle?.sampleTerms.find((item) => item.slug === current.slug);
  const siblings = (aisle?.sampleTerms ?? [])
    .filter((item) => item.slug !== current.slug)
    .slice(0, 4);
  const categoryLabel = aisle?.label ?? "";
  const categoryLower = categoryLabel.toLowerCase();

  function step(delta: number) {
    setIndex((value) => (value + delta + count) % count);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      step(-1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      step(1);
    }
  }

  const cycleButtonClass =
    "stall-chip-sm inline-flex size-8 shrink-0 cursor-pointer items-center justify-center bg-primary-foreground/15 text-primary-foreground outline-none hover:bg-card hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-chalk";

  return (
    <div
      className="mt-3.5 border-t border-primary-foreground/20 pt-3 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-chalk"
      role="group"
      aria-label="Cravings"
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="type-kicker text-chalk">Cravings</span>
        <button type="button" aria-label="Previous craving" onClick={() => step(-1)} className={cycleButtonClass}>
          <CaretLeftMark className="size-4" />
        </button>
        <Link
          href={`/find/${current.slug}`}
          className="inline-flex max-w-full items-center gap-2.5 bg-card px-2 py-1.5 text-primary outline-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-chalk"
        >
          <ProductThumb src={term?.photoUrl} size="sm" />
          <span>
            <span className="block text-base font-medium">{current.label}</span>
            {categoryLabel ? (
              <span className="block text-sm text-primary/80">
                {categoryLabel}
                {term ? (
                  <>
                    {" · "}
                    <span className="type-nums">{formatCensus(term.vendors)}</span>{" "}
                    {term.vendors === 1 ? "stall" : "stalls"}
                  </>
                ) : null}
              </span>
            ) : null}
          </span>
        </Link>
        <button type="button" aria-label="Next craving" onClick={() => step(1)} className={cycleButtonClass}>
          <CaretRightMark className="size-4" />
        </button>
        <span className="type-nums text-sm text-chalk">
          {index + 1} / {count}
        </span>
        <span className="sr-only" aria-live="polite">
          {current.label}, {index + 1} of {count}
        </span>
      </div>
      {aisle && categoryLabel ? (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-sm font-medium text-primary-foreground/85">
            Also in {categoryLower}:
          </span>
          {siblings.map((sibling) => (
            <Link
              key={sibling.slug}
              href={`/find/${sibling.slug}`}
              className="stall-chip-sm inline-flex items-center bg-primary-foreground/15 px-2.5 py-1 text-sm font-medium text-primary-foreground outline-none hover:bg-card hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-chalk"
            >
              {sibling.term}
            </Link>
          ))}
          <Link
            href={`/products?aisle=${encodeURIComponent(aisle.id)}`}
            className="text-sm font-medium text-primary-foreground underline underline-offset-4 outline-none hover:text-chalk focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-chalk"
          >
            All {categoryLower}
          </Link>
        </div>
      ) : null}
    </div>
  );
}

function VendorTableCard({
  vendor,
  todayWeekday,
  onSelectAisle,
  onSelectNeighbourhood,
}: {
  vendor: HomeAtlasVendorSpotlight;
  todayWeekday: number;
  onSelectAisle?: (aisleId: string) => void;
  onSelectNeighbourhood?: (neighbourhood: string) => void;
}) {
  const todayShort = WEEKDAYS[todayWeekday]?.slice(0, 3) ?? null;
  const shownMarkets = vendor.markets.slice(0, 2);
  const extraMarketCount = Math.max(0, vendor.markets.length - shownMarkets.length);
  const generalPhotoUrl = directPublicImageSrc(vendor.photoUrl);

  return (
    <li className="flex flex-col justify-between bg-card ring-1 ring-board">
      <div>
        {/* 1. Vendor Plate Header (Unified Stall Emblem + Name + Live Status + Save) */}
        <div className="flex items-start justify-between gap-2.5 border-b border-black/15 bg-primary px-3.5 py-3 text-primary-foreground">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <StallEmblem
              src={vendor.logoUrl}
              name={vendor.name}
              kind="vendor"
              size="lg"
              tone="chalk"
              className="mt-0.5"
            />
            <div className="min-w-0 flex-1">
              <p className="min-w-0 leading-snug">
                <Link
                  href={`/vendors/${vendor.slug}`}
                  className="text-base font-medium text-primary-foreground hover:underline"
                >
                  <VerifiedName slug={vendor.slug} name={vendor.name} />
                </Link>
                <ListingScore
                  parens
                  ratingAvg={vendor.ratingAvg}
                  reviewCount={vendor.reviewCount}
                  className="ml-1.5 text-chalk"
                />
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {vendor.openNow ? (
                  <span className="stall-chip-sm inline-flex items-center bg-stamp px-2 py-0.5 text-sm font-medium text-receipt">
                    Selling now
                  </span>
                ) : (
                  <span className="stall-chip-sm inline-flex items-center bg-board/65 px-2 py-0.5 text-sm font-medium text-chalk">
                    {vendor.badge}
                  </span>
                )}
                {vendor.aisleIds[0] && onSelectAisle ? (
                  <button
                    type="button"
                    onClick={() => onSelectAisle(vendor.aisleIds[0])}
                    className="stall-chip-sm cursor-pointer bg-primary-foreground/15 px-2 py-0.5 text-sm text-chalk hover:bg-card hover:text-primary"
                  >
                    {vendor.primaryAisleLabel}
                  </button>
                ) : (
                  <span className="text-sm text-chalk/85">{vendor.primaryAisleLabel}</span>
                )}
              </div>
            </div>
          </div>

          <span className="shrink-0">
            <SaveButton kind="vendor" slug={vendor.slug} name={vendor.name} />
          </span>
        </div>

        {/* Aisle picture for the stall, then each seeded item picture beside its name. */}
        <div className="border-b border-border bg-secondary">
          {/* General Product Banner: 1 shared category/product photo indicating what the vendor sells */}
          <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-3 border-b border-border bg-card/75 px-3.5 py-2.5">
            <Link href={`/vendors/${vendor.slug}`} className="block">
              <ProductPhotoFrame
                name={vendor.primaryAisleLabel}
                decorative
                photo={
                  generalPhotoUrl
                    ? {
                        url: generalPhotoUrl,
                        alt: vendor.photoAlt ?? vendor.primaryAisleLabel,
                      }
                    : null
                }
                className="h-12 w-[4.5rem] aspect-auto border border-border"
              />
            </Link>
            <div className="flex items-baseline justify-between gap-2">
              <div>
                <p className="type-kicker font-medium text-foreground">Menu highlights</p>
                <p className="text-sm text-muted-foreground">
                  {vendor.primaryAisleLabel}
                  {vendor.publishedMenu ? " · Published menu" : ""}
                </p>
              </div>
              <Link
                href={`/vendors/${vendor.slug}`}
                className="shrink-0 text-sm font-medium text-primary hover:underline"
              >
                Stall menu
              </Link>
            </div>
          </div>

          {vendor.publishedMenu ? (
            <ul>
              {vendor.items.slice(0, 3).map((item) => {
                const price = formatPrice(item.priceCents);
                return (
                  <li
                    key={`${vendor.slug}-${item.href}-${item.name}`}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 border-t border-dashed border-border px-3.5 py-2 text-foreground first:border-t-0"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <MenuItemPhoto url={item.imageUrl} />
                      <p className="min-w-0 text-base font-medium">
                        <Link href={item.href} className="hover:text-primary hover:underline">
                          {item.name}
                        </Link>
                      </p>
                    </div>
                    {price ? (
                      <span className="type-nums shrink-0 whitespace-nowrap text-sm font-medium text-stamp">
                        {price}
                      </span>
                    ) : (
                      <span className="type-nums shrink-0 whitespace-nowrap text-sm text-muted-foreground">
                        Guide
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="px-3.5 py-2 text-base text-foreground">
              {vendor.about?.trim() || `${vendor.primaryAisleLabel} from this stall.`}
            </p>
          )}
        </div>
      </div>

      {/* 3. Market halls & schedule hours (with market emblem) */}
      <div className="bg-card border-t border-border">
        <ul className="divide-y divide-border/70">
          {shownMarkets.map((market) => {
            return (
              <li key={market.slug} className="px-3.5 py-2.5 hover:bg-secondary/35">
                <div className="flex min-w-0 items-start gap-2">
                  <StallEmblem
                    src={market.logoUrl}
                    name={market.name}
                    kind="market"
                    size="xs"
                    tone="paper"
                    className="mt-0.5"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="min-w-0">
                      <Link
                        href={`/markets/${market.slug}`}
                        className="text-base font-medium text-foreground hover:text-primary hover:underline"
                      >
                        {market.name}
                      </Link>
                      {market.stall ? (
                        <span className="type-nums ml-1.5 text-sm text-muted-foreground">
                          · Stall {market.stall}
                        </span>
                      ) : null}
                    </p>
                    <SessionLines
                      sessions={market.hours}
                      highlightDay={market.openNow ? todayShort : null}
                      align="stretch"
                    />
                  </div>
                </div>

                {onSelectNeighbourhood && market.neighbourhood ? (
                  <div className="mt-1 flex items-center justify-between gap-2 pl-8">
                    <button
                      type="button"
                      onClick={() => onSelectNeighbourhood(market.neighbourhood)}
                      className="cursor-pointer text-sm text-primary hover:underline"
                    >
                      {market.neighbourhood}
                    </button>
                    {market.openNow ? <NowLabel>Hall open</NowLabel> : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
        {extraMarketCount > 0 ? (
          <p className="border-t border-border/70 px-3.5 py-2.5 text-end">
            <Link
              href={`/vendors/${vendor.slug}`}
              className="type-nums text-sm font-medium text-primary hover:underline"
            >
              +{extraMarketCount} more {extraMarketCount === 1 ? "hall" : "halls"}
            </Link>
          </p>
        ) : null}
      </div>
    </li>
  );
}

function LiveMarketHallCard({
  slot,
  statusBadge,
  onSelectNeighbourhood,
}: {
  slot: HomeAtlasMarketSlot;
  statusBadge: "open" | "later" | "earlier" | "upcoming";
  onSelectNeighbourhood: (area: string) => void;
}) {
  const isOpen = statusBadge === "open" || slot.open;

  return (
    <li className="flex flex-col justify-between bg-card px-3.5 py-3 transition-colors hover:bg-secondary/35">
      <div>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3">
          <div className="flex min-w-0 items-start gap-2.5">
            <StallEmblem
              src={slot.logo_url}
              name={slot.name}
              kind="market"
              size="sm"
              tone={isOpen ? "board" : "paper"}
              className="mt-0.5"
            />
            <div className="min-w-0">
              <p className="min-w-0 leading-snug">
                <Link
                  href={`/markets/${slot.slug}`}
                  className="text-base font-medium text-foreground hover:text-primary hover:underline"
                >
                  <VerifiedName slug={slot.slug} name={slot.name} />
                </Link>
                <ListingScore
                  parens
                  ratingAvg={slot.rating_avg}
                  reviewCount={slot.review_count}
                  className="ml-1.5 text-stamp"
                />
              </p>

              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                <button
                  type="button"
                  onClick={() => onSelectNeighbourhood(slot.neighbourhood)}
                  className="cursor-pointer font-medium text-primary hover:underline"
                >
                  {slot.neighbourhood}
                </button>
                {slot.indoorOutdoor ? (
                  <>
                    <span aria-hidden>·</span>
                    <span>{slot.indoorOutdoor}</span>
                  </>
                ) : null}
                {slot.vendorCount > 0 ? (
                  <>
                    <span aria-hidden>·</span>
                    <span>
                      <span className="type-nums font-medium text-foreground">
                        {slot.vendorCount}
                      </span>{" "}
                      stalls
                    </span>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-start gap-2.5">
            <div className="text-right">
              {isOpen ? (
                <div className="mb-0.5 flex justify-end">
                  <NowLabel>Open now</NowLabel>
                </div>
              ) : statusBadge === "later" ? (
                <p className="text-sm font-medium text-primary">Later today</p>
              ) : statusBadge === "earlier" ? (
                <p className="text-sm text-muted-foreground">Closed for today</p>
              ) : null}
              <Hours
                value={slot.hours}
                className={cn(
                  "whitespace-nowrap",
                  isOpen ? "font-medium text-stamp" : "text-foreground",
                )}
              />
            </div>
            <SaveButton kind="market" slug={slot.slug} name={slot.name} />
          </div>
        </div>
      </div>

      {slot.sampleVendors.length > 0 ? (
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-dashed border-border pt-2 pl-10">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm text-muted-foreground">Stalls here:</span>
            {slot.sampleVendors.slice(0, 2).map((v) => (
              <Link
                key={v.slug}
                href={`/vendors/${v.slug}`}
                className="stall-chip-sm inline-flex items-center gap-1.5 bg-secondary/70 py-0.5 pr-2 pl-1 text-sm font-medium text-foreground ring-1 ring-border hover:bg-primary hover:text-primary-foreground"
              >
                <StallEmblem src={v.logoUrl} name={v.name} kind="vendor" size="xs" />
                <span>{v.name}</span>
              </Link>
            ))}
          </div>
          <Link
            href={`/markets/${slot.slug}`}
            className="shrink-0 text-sm font-medium text-primary hover:underline"
          >
            Hall roster
          </Link>
        </div>
      ) : null}
    </li>
  );
}

function MastheadLiveFloorStrip({
  data,
  onSelectNeighbourhood,
  onFilterTodayStalls,
}: {
  data: HomeAtlasData;
  onSelectNeighbourhood: (area: string) => void;
  onFilterTodayStalls: () => void;
}) {
  const hasOpen = data.openNowSlots.length > 0;
  const hasLater = data.laterTodaySlots.length > 0;
  const nextGroup = data.nextDayGroup;

  const [tab, setTab] = useState<"live" | "next" | "earlier">("live");
  const [expanded, setExpanded] = useState(false);

  const activeMode = tab === "live" && !hasOpen && !hasLater ? "next" : tab;

  const displayedSlots: HomeAtlasMarketSlot[] =
    activeMode === "live"
      ? [...data.openNowSlots, ...data.laterTodaySlots]
      : activeMode === "earlier"
        ? data.earlierTodaySlots
        : (nextGroup?.slots ?? []);

  const badgeMode: "open" | "later" | "earlier" | "upcoming" =
    activeMode === "live"
      ? hasOpen
        ? "open"
        : "later"
      : activeMode === "earlier"
        ? "earlier"
        : "upcoming";

  const visibleSlots = expanded ? displayedSlots : displayedSlots.slice(0, 6);
  const restCount = Math.max(0, displayedSlots.length - 6);

  return (
    <nav
      aria-label="Live markets on the floor"
      className="mt-5 bg-card shadow-[inset_4px_0_0_var(--stamp)] ring-1 ring-board"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-secondary/55 px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-3">
          {hasOpen ? (
            <NowLabel className="text-base">
              <span>
                <span className="type-nums font-semibold">{data.openNowSlots.length}</span>{" "}
                {data.openNowSlots.length === 1
                  ? "market hall open right now"
                  : "market halls open right now"}
              </span>
            </NowLabel>
          ) : hasLater ? (
            <span className="inline-flex items-center gap-2 text-base font-medium text-primary">
              <WeekMark className="size-4 text-primary" />
              <span>
                <span className="type-nums">{data.laterTodaySlots.length}</span>{" "}
                {data.laterTodaySlots.length === 1
                  ? "market opening later today"
                  : "markets opening later today"}
              </span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 text-base font-medium text-board">
              <WeekMark className="size-4 text-stamp" />
              <span>
                Today&apos;s halls have wrapped up · Next up:{" "}
                <span className="text-primary">
                  {nextGroup ? `${nextGroup.label} (${nextGroup.date})` : "Upcoming schedule"}
                </span>
              </span>
            </span>
          )}

          {data.sellingTodayCount > 0 ? (
            <>
              <span aria-hidden className="text-muted-foreground">
                ·
              </span>
              <button
                type="button"
                onClick={onFilterTodayStalls}
                className="cursor-pointer text-sm font-medium text-primary hover:underline"
              >
                <span className="type-nums">{data.sellingTodayCount}</span> stalls active today
              </button>
            </>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {(hasOpen || hasLater) && (
            <button
              type="button"
              onClick={() => {
                setTab("live");
                setExpanded(false);
              }}
              className={cn(
                "stall-chip-sm cursor-pointer px-2.5 py-1 text-sm font-medium transition-colors",
                activeMode === "live"
                  ? "bg-stamp text-receipt"
                  : "bg-card text-foreground ring-1 ring-border hover:bg-secondary",
              )}
            >
              {hasOpen ? `Open now (${data.openNowSlots.length})` : "Today"}
            </button>
          )}
          {nextGroup ? (
            <button
              type="button"
              onClick={() => {
                setTab("next");
                setExpanded(false);
              }}
              className={cn(
                "stall-chip-sm cursor-pointer px-2.5 py-1 text-sm font-medium transition-colors",
                activeMode === "next"
                  ? "bg-board text-chalk"
                  : "bg-card text-foreground ring-1 ring-border hover:bg-secondary",
              )}
            >
              {nextGroup.label} ({nextGroup.slots.length})
            </button>
          ) : null}
          {data.earlierTodaySlots.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                setTab("earlier");
                setExpanded(false);
              }}
              className={cn(
                "stall-chip-sm cursor-pointer px-2.5 py-1 text-sm font-medium transition-colors",
                activeMode === "earlier"
                  ? "bg-board text-chalk"
                  : "bg-card text-foreground ring-1 ring-border hover:bg-secondary",
              )}
            >
              Earlier today ({data.earlierTodaySlots.length})
            </button>
          ) : null}
          {restCount > 0 ? (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="cursor-pointer px-2 py-1 text-sm font-medium text-primary underline underline-offset-4"
            >
              {expanded ? "Show fewer" : `+${restCount} more`}
            </button>
          ) : null}
          <Link
            href="/markets/open-today"
            className="ml-1 text-sm font-medium text-primary underline underline-offset-4"
          >
            Full day schedule
          </Link>
        </div>
      </div>

      {visibleSlots.length > 0 ? (
        <ul className="grid gap-px bg-border md:grid-cols-2">
          {visibleSlots.map((slot) => (
            <LiveMarketHallCard
              key={slot.id}
              slot={slot}
              statusBadge={slot.open ? "open" : badgeMode}
              onSelectNeighbourhood={onSelectNeighbourhood}
            />
          ))}
        </ul>
      ) : (
        <p className="px-4 py-3 text-sm text-muted-foreground">
          No market sessions scheduled in this window.
        </p>
      )}
    </nav>
  );
}

function FilterCycleRow({
  label,
  allLabel,
  allActive,
  activeClass,
  onAll,
  onPrev,
  onNext,
  canPage,
  children,
}: {
  label: string;
  allLabel: string;
  allActive: boolean;
  activeClass: string;
  onAll: () => void;
  onPrev: () => void;
  onNext: () => void;
  canPage: boolean;
  children: ReactNode;
}) {
  const idle = "bg-card text-foreground ring-1 ring-border hover:bg-secondary";
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="type-kicker w-32 shrink-0 font-medium whitespace-nowrap text-foreground">
        {label}
      </span>
      <button
        type="button"
        onClick={onAll}
        className={cn(
          "stall-chip-sm cursor-pointer px-2.5 py-1 text-sm font-medium transition-colors",
          allActive ? activeClass : idle,
        )}
      >
        {allLabel}
      </button>
      <button
        type="button"
        aria-label={`Previous ${label.toLowerCase()}`}
        onClick={onPrev}
        disabled={!canPage}
        className={cn(
          "stall-chip-sm inline-flex size-8 shrink-0 items-center justify-center bg-card text-foreground ring-1 ring-border",
          canPage ? "cursor-pointer hover:bg-secondary" : "cursor-default opacity-40",
        )}
      >
        <CaretLeftMark className="size-4" />
      </button>
      {children}
      <button
        type="button"
        aria-label={`Next ${label.toLowerCase()}`}
        onClick={onNext}
        disabled={!canPage}
        className={cn(
          "stall-chip-sm inline-flex size-8 shrink-0 items-center justify-center bg-card text-foreground ring-1 ring-border",
          canPage ? "cursor-pointer hover:bg-secondary" : "cursor-default opacity-40",
        )}
      >
        <CaretRightMark className="size-4" />
      </button>
    </div>
  );
}

export function HomeAtlas({ data }: { data: HomeAtlasData }) {
  const router = useRouter();
  const { coords, requestAsync } = useGeo();

  const [q, setQ] = useState("");
  const [locating, setLocating] = useState(false);

  // Unified Tri-Pillar Filter State (Vendors × Products × Markets)
  const [vendorAisleFilter, setVendorAisleFilter] = useState<string>("all");
  const [vendorAreaFilter, setVendorAreaFilter] = useState<string>("all");
  const [vendorWhenFilter, setVendorWhenFilter] = useState<"all" | "today" | "weekend">("all");
  const [aisleWindowStart, setAisleWindowStart] = useState(0);
  const [areaWindowStart, setAreaWindowStart] = useState(0);

  // Synchronized Craving Crate & Neighbourhood Atlas State
  const [selectedAisleId, setSelectedAisleId] = useState<string>(
    data.aisles[0]?.id ?? "bread-and-bakery",
  );
  const [selectedCircuitIndex, setSelectedCircuitIndex] = useState<number>(0);

  const activeAisle =
    data.aisles.find((a) => a.id === selectedAisleId) ?? data.aisles[0] ?? null;
  const activeCircuit =
    data.neighbourhoodCircuits[selectedCircuitIndex] ??
    data.neighbourhoodCircuits[0] ??
    null;

  // Featured vendors with real uploaded logos for the visual emblem strip
  const logoVendors = useMemo(
    () => data.vendorSpotlights.filter((v) => Boolean(v.logoUrl)).slice(0, 8),
    [data.vendorSpotlights],
  );

  function revealWindow(
    index: number,
    length: number,
    setStart: (value: number | ((current: number) => number)) => void,
  ) {
    if (index < 0 || length <= FILTER_PAGE_SIZE) return;
    setStart((current) =>
      pageIncludes(current, length, index, FILTER_PAGE_SIZE) ? current : index,
    );
  }

  function stepWindow(
    delta: 1 | -1,
    length: number,
    setStart: (value: number | ((current: number) => number)) => void,
  ) {
    if (length <= FILTER_PAGE_SIZE) return;
    setStart((current) => (current + delta + length) % length);
  }

  function syncAisleSelection(aisleId: string) {
    setVendorAisleFilter(aisleId);
    if (aisleId !== "all" && data.aisles.some((a) => a.id === aisleId)) {
      setSelectedAisleId(aisleId);
      revealWindow(
        data.aisles.findIndex((aisle) => aisle.id === aisleId),
        data.aisles.length,
        setAisleWindowStart,
      );
    }
  }

  function syncAreaSelection(areaLabel: string) {
    setVendorAreaFilter(areaLabel);
    if (areaLabel !== "all") {
      const idx = data.neighbourhoodCircuits.findIndex(
        (c) => c.label.toLowerCase() === areaLabel.toLowerCase(),
      );
      if (idx >= 0) {
        setSelectedCircuitIndex(idx);
        revealWindow(idx, data.neighbourhoodCircuits.length, setAreaWindowStart);
      }
    }
  }

  const filteredVendorSpotlights = useMemo(() => {
    const strict = data.vendorSpotlights.filter((vendor) => {
      if (vendorAisleFilter !== "all" && !vendor.aisleIds.includes(vendorAisleFilter)) {
        return false;
      }
      if (
        vendorAreaFilter !== "all" &&
        !vendor.markets.some(
          (m) => m.neighbourhood.toLowerCase() === vendorAreaFilter.toLowerCase(),
        )
      ) {
        return false;
      }
      if (vendorWhenFilter === "today" && !vendor.sellingToday && !vendor.openNow) {
        return false;
      }
      if (vendorWhenFilter === "weekend" && !vendor.onWeekend) {
        return false;
      }
      return true;
    });

    return strict.slice(0, 6);
  }, [data.vendorSpotlights, vendorAisleFilter, vendorAreaFilter, vendorWhenFilter]);

  async function handleNearMe() {
    if (locating) return;
    setLocating(true);
    const here = coords ?? (await requestAsync());
    setLocating(false);
    if (!here) return;
    router.push(
      marketsHref({
        q: q.trim() || undefined,
        lat: String(here.lat),
        lng: String(here.lng),
        sort: "near",
      }),
    );
  }

  const torontoCircuits = data.neighbourhoodCircuits.filter(
    (circuit) => circuit.kind === "neighbourhood",
  );
  const cityCircuits = data.neighbourhoodCircuits.filter((circuit) => circuit.kind === "city");
  const visibleAisles = pagedItems(data.aisles, aisleWindowStart, FILTER_PAGE_SIZE);
  const visibleAreas = pagedItems(
    data.neighbourhoodCircuits,
    areaWindowStart,
    FILTER_PAGE_SIZE,
  );
  const stallLabels = useMemo(() => {
    const labels = new Set<string>();
    for (const vendor of data.vendorSpotlights) {
      for (const market of vendor.markets) labels.add(market.neighbourhood.toLowerCase());
    }
    return labels;
  }, [data.vendorSpotlights]);

  return (
    <div className="bg-background text-foreground">
      {/* Top Canadian Banner + Live Hall & Stall Pulse */}
      <div className="border-b border-board bg-secondary">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-2.5 lg:px-6">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="inline-flex items-center gap-2 text-sm font-medium text-board">
              <MapleMark className="h-4 w-8 shrink-0 text-stamp shadow-[0_0_0_1px_rgba(0,0,0,0.18)]" />
              <span>Made by Canadians, for Canadians, to shop Canadian.</span>
            </span>
            <span className="text-sm text-muted-foreground">
              Find products, vendors, and markets from all over Toronto, the GTA, and surrounding
              areas.
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            {data.openNowSlots.length > 0 ? (
              <Link href="/markets/open-today" className="hover:underline">
                <NowLabel>
                  <span>
                    <span className="type-nums">{data.openNowSlots.length}</span>{" "}
                    {data.openNowSlots.length === 1 ? "hall open now" : "halls open now"}
                  </span>
                </NowLabel>
              </Link>
            ) : null}
            <Link
              href="/markets#directory-vendors"
              className="font-medium text-primary hover:underline"
            >
              <span className="type-nums">{data.sellingTodayCount}</span> stalls active today
            </Link>
            <span aria-hidden className="text-muted-foreground">
              –
            </span>
            <Link href="/products" className="font-medium text-primary hover:underline">
              Full product catalogue
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 lg:px-6 lg:py-8">
        {/* Masthead + Tri-Pillar Visual Census + Search Deck */}
        <header id="find" className="scroll-mt-24 border-b-2 border-board pb-6">
          <div className="grid gap-6 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-7">
              <h1>{LAUNCH_CITY} farmers&apos; markets</h1>
              <p className="type-lede mt-3 max-w-2xl text-muted-foreground">
                Find everything from the products you enjoy every weekend to the markets and
                vendors that sell them,{" "}
                <span className="font-medium text-foreground underline decoration-board decoration-[0.2em] underline-offset-[0.22em] [text-decoration-skip-ink:none]">
                  all in one place
                </span>
                .
              </p>
            </div>

            {/* 3-Stamp Ticket Strip (With Cohesive Woodcut Stamp Marks) */}
            <div className="lg:col-span-5">
              <nav
                aria-label="On the directory"
                className="grid grid-cols-3 divide-x divide-border bg-card ring-1 ring-board"
              >
                <Link
                  href="/markets#directory-vendors"
                  className="flex flex-col justify-between bg-secondary/45 p-3.5 transition-colors hover:bg-secondary"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="type-kicker font-medium text-primary">Priority stalls</span>
                    <CrateMark className="size-4 shrink-0 text-primary" />
                  </div>
                  <span className="type-census mt-1 text-3xl leading-none text-board sm:text-4xl">
                    {formatCensus(data.census.vendors)}
                  </span>
                  <span className="mt-1 text-sm font-medium text-primary">vendors</span>
                </Link>
                <Link
                  href="/products"
                  className="flex flex-col justify-between p-3.5 transition-colors hover:bg-secondary/60"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="type-kicker text-muted-foreground">Products</span>
                    <TagMark className="size-4 shrink-0 text-stamp" />
                  </div>
                  <span className="type-census mt-1 text-3xl leading-none text-stamp sm:text-4xl">
                    {formatCensus(data.census.menus)}
                  </span>
                  <span className="mt-1 text-sm font-medium text-stamp">menu items</span>
                </Link>
                <Link
                  href="/markets"
                  className="flex flex-col justify-between p-3.5 transition-colors hover:bg-secondary/60"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="type-kicker text-muted-foreground">Neighbourhoods</span>
                    <RulesMark className="size-4 shrink-0 text-board" />
                  </div>
                  <span className="type-census mt-1 text-3xl leading-none text-board sm:text-4xl">
                    {formatCensus(data.census.markets)}
                  </span>
                  <span className="mt-1 text-sm font-medium text-primary">markets</span>
                </Link>
              </nav>
            </div>
          </div>

          {/* Masthead Live Floor Strip (Open Now / Later Today / Next Up) */}
          <MastheadLiveFloorStrip
            data={data}
            onSelectNeighbourhood={(area) => syncAreaSelection(area)}
            onFilterTodayStalls={() => setVendorWhenFilter("today")}
          />

          {/* Search & Visual Craving Shortcut Bar */}
          <div className="mt-5 bg-panel-find text-primary-foreground ring-1 ring-board">
            <div className="awning-leaf h-[7px] w-full" aria-hidden />
            <div className="p-4 sm:p-5">
              <form
                action="/markets"
                className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-center"
              >
                <div>
                  <label className="sr-only" htmlFor="atlas-search">
                    {SEARCH_LABEL}
                  </label>
                  <SearchField
                    id="atlas-search"
                    name="q"
                    value={q}
                    onChange={setQ}
                    placeholder={SEARCH_PLACEHOLDER}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => void handleNearMe()}
                  className="find-chip inline-flex h-12 cursor-pointer items-center justify-center border border-chalk/65 bg-chalk/10 px-4 text-sm font-medium text-primary-foreground hover:bg-chalk/20"
                >
                  {locating ? "Locating…" : "Markets near me"}
                </button>

                <button
                  type="submit"
                  className="find-go stall-chip inline-flex h-12 shrink-0 cursor-pointer items-center justify-between gap-4 px-5 text-receipt hover:brightness-110"
                >
                  <span className="type-column text-receipt">Search directory</span>
                  <span className="text-base font-medium text-receipt">Go</span>
                </button>
              </form>

              <CravingCycle aisles={data.aisles} />
            </div>
          </div>
        </header>

        {/* ABOVE-THE-FOLD PRIORITY SHOWCASE: Unified Vendor × Product × Market Matrix */}
        <section
          aria-label="Priority Vendor, Product, and Market Showcase"
          className="mt-8 bg-card ring-1 ring-board"
        >
          {/* Section Header + Cohesive Stall Emblem Ribbon */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-board bg-secondary px-4 py-3.5 sm:px-5">
            <div className="flex items-center gap-2.5">
              <span className="stall-chip-sm flex size-8 shrink-0 items-center justify-center bg-primary text-primary-foreground">
                <CrateMark className="size-4" />
              </span>
              <h2>Featured vendors, products &amp; markets</h2>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Cohesive Stall Emblem Strip */}
              {logoVendors.length > 0 ? (
                <div className="hidden items-center gap-1.5 xl:flex" aria-label="Featured stall emblems">
                  <span className="type-kicker mr-1 text-muted-foreground">Stall marks:</span>
                  {logoVendors.slice(0, 6).map((v) => (
                    <Link
                      key={v.slug}
                      href={`/vendors/${v.slug}`}
                      title={v.name}
                      className="transition-transform hover:-translate-y-0.5"
                    >
                      <StallEmblem src={v.logoUrl} name={v.name} kind="vendor" size="sm" />
                    </Link>
                  ))}
                </div>
              ) : null}

              {(vendorAisleFilter !== "all" ||
                vendorAreaFilter !== "all" ||
                vendorWhenFilter !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setVendorAisleFilter("all");
                    setVendorAreaFilter("all");
                    setVendorWhenFilter("all");
                  }}
                  className="stall-chip-sm cursor-pointer bg-card px-3 py-1.5 text-sm font-medium text-stamp ring-1 ring-border hover:bg-secondary"
                >
                  Reset filters
                </button>
              )}
              <Link
                href="/markets#directory-vendors"
                className="stall-chip-sm inline-flex h-9 items-center bg-board px-3.5 text-sm font-medium text-chalk hover:brightness-110"
              >
                All {formatCensus(data.census.vendors)} vendors
              </Link>
            </div>
          </div>

          <div className="grid gap-3 border-b border-border bg-secondary/40 px-4 py-3.5 sm:px-5">
            <FilterCycleRow
              label="Category"
              allLabel="All stalls"
              allActive={vendorAisleFilter === "all"}
              activeClass="bg-primary text-primary-foreground"
              onAll={() => syncAisleSelection("all")}
              onPrev={() => stepWindow(-1, data.aisles.length, setAisleWindowStart)}
              onNext={() => stepWindow(1, data.aisles.length, setAisleWindowStart)}
              canPage={data.aisles.length > FILTER_PAGE_SIZE}
            >
              {visibleAisles.map((aisle) => {
                const active = vendorAisleFilter === aisle.id;
                return (
                  <button
                    key={aisle.id}
                    type="button"
                    onClick={() => syncAisleSelection(active ? "all" : aisle.id)}
                    className={cn(
                      "stall-chip-sm inline-flex cursor-pointer items-center gap-1.5 py-1 pr-2.5 pl-1.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "bg-card text-foreground ring-1 ring-border hover:bg-secondary",
                    )}
                  >
                    <ProductThumb src={aisle.photoUrl} size="xs" />
                    <span>{aisle.label}</span>
                  </button>
                );
              })}
            </FilterCycleRow>

            <FilterCycleRow
              label="Neighbourhood"
              allLabel="All areas"
              allActive={vendorAreaFilter === "all"}
              activeClass="bg-board text-chalk"
              onAll={() => syncAreaSelection("all")}
              onPrev={() =>
                stepWindow(-1, data.neighbourhoodCircuits.length, setAreaWindowStart)
              }
              onNext={() =>
                stepWindow(1, data.neighbourhoodCircuits.length, setAreaWindowStart)
              }
              canPage={data.neighbourhoodCircuits.length > FILTER_PAGE_SIZE}
            >
              {visibleAreas.map((circuit) => {
                const active =
                  vendorAreaFilter.toLowerCase() === circuit.label.toLowerCase();
                return (
                  <button
                    key={circuit.q}
                    type="button"
                    onClick={() => syncAreaSelection(active ? "all" : circuit.label)}
                    className={cn(
                      "stall-chip-sm cursor-pointer px-2.5 py-1 text-sm font-medium transition-colors",
                      active
                        ? "bg-board text-chalk"
                        : "bg-card text-foreground ring-1 ring-border hover:bg-secondary",
                    )}
                  >
                    {circuit.label}
                  </button>
                );
              })}
            </FilterCycleRow>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="type-kicker w-32 shrink-0 font-medium whitespace-nowrap text-foreground">
                When
              </span>
              {(
                [
                  { id: "all", label: "Any day" },
                  { id: "today", label: "Today" },
                  { id: "weekend", label: "Weekend" },
                ] as const
              ).map((tab) => {
                const active = vendorWhenFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setVendorWhenFilter(tab.id)}
                    className={cn(
                      "stall-chip-sm cursor-pointer px-2.5 py-1 text-sm font-medium transition-colors",
                      active
                        ? "bg-stamp text-receipt"
                        : "bg-card text-foreground ring-1 ring-border hover:bg-secondary",
                    )}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 6-Card Priority Vendor × Product × Market Grid */}
          <div className="p-4 sm:p-5">
            {filteredVendorSpotlights.length ? (
              <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {filteredVendorSpotlights.map((vendor) => (
                  <VendorTableCard
                    key={vendor.id}
                    vendor={vendor}
                    todayWeekday={data.todayWeekday}
                    onSelectAisle={syncAisleSelection}
                    onSelectNeighbourhood={syncAreaSelection}
                  />
                ))}
              </ul>
            ) : (
              <p className="text-base text-muted-foreground">
                No stalls match these filters.{" "}
                <button
                  type="button"
                  onClick={() => {
                    setVendorAisleFilter("all");
                    setVendorAreaFilter("all");
                    setVendorWhenFilter("all");
                  }}
                  className="cursor-pointer font-medium text-primary hover:underline"
                >
                  Reset filters
                </button>
              </p>
            )}
          </div>
        </section>

        {/* Synchronized Deep-Dive Split: 6-Col Product Crate Explorer (with Stalls) + 6-Col Live Neighbourhood Atlas (with Stalls) */}
        <section
          aria-label="Craving Crate Explorer and Live Atlas"
          className="mt-8 grid gap-8 lg:grid-cols-12 lg:items-start"
        >
          {/* Left 6 Columns: Interactive Craving & Aisle Crate Explorer + Top Stalls in Aisle */}
          <div className="bg-card ring-1 ring-board lg:col-span-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b-2 border-board bg-secondary px-4 py-3">
              <div className="flex items-center gap-2.5">
                <span className="stall-chip-sm flex size-8 shrink-0 items-center justify-center bg-primary text-primary-foreground">
                  <TagMark className="size-4" />
                </span>
                <h2>Products &amp; categories</h2>
              </div>
              <Link
                href="/products"
                className="text-sm font-medium text-primary underline underline-offset-4"
              >
                All categories
              </Link>
            </div>

            {/* Category Selector Tabs (with Visual Thumbnails) */}
            <div
              role="tablist"
              aria-label="Select product category"
              className="flex flex-wrap gap-1.5 border-b border-border bg-secondary/35 px-4 py-3"
            >
              {data.aisles.slice(0, 8).map((aisle) => {
                const selected = activeAisle?.id === aisle.id;
                return (
                  <button
                    key={aisle.id}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => syncAisleSelection(aisle.id)}
                    className={cn(
                      "stall-chip-sm inline-flex cursor-pointer items-center gap-1.5 py-1.5 pr-2.5 pl-1.5 text-sm font-medium transition-colors",
                      selected
                        ? "bg-board text-chalk"
                        : "bg-card text-foreground ring-1 ring-border hover:bg-secondary",
                    )}
                  >
                    <ProductThumb src={aisle.photoUrl} size="xs" />
                    <span>{aisle.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Featured Active Aisle Crate Spotlight + Vendors Selling This Aisle */}
            {activeAisle ? (
              <div className="p-4 sm:p-5">
                <div className="grid gap-4 sm:grid-cols-[190px_minmax(0,1fr)] sm:items-start">
                  <Link href={`/products?aisle=${activeAisle.id}`} className="block">
                    <ProductPhotoFrame
                      name={activeAisle.label}
                      decorative
                      photo={
                        activeAisle.photoUrl
                          ? {
                              url: activeAisle.photoUrl,
                              alt: activeAisle.photoAlt ?? activeAisle.label,
                            }
                          : null
                      }
                      className="h-40 w-full aspect-auto border border-border"
                    />
                  </Link>
                  <div className="flex flex-col justify-between">
                    <div>
                      <div className="flex items-baseline justify-between gap-2">
                        <h3>
                          <Link
                            href={`/products?aisle=${activeAisle.id}`}
                            className="hover:underline"
                          >
                            {activeAisle.label}
                          </Link>
                        </h3>
                        <span className="type-nums text-sm font-medium text-stamp">
                          {activeAisle.count} product guides
                        </span>
                      </div>
                      <p className="mt-1.5 text-base leading-snug text-muted-foreground">
                        {activeAisle.line}
                      </p>

                      <AisleProductGuides
                        key={activeAisle.id}
                        terms={activeAisle.sampleTerms}
                      />
                    </div>
                  </div>
                </div>

                {/* Key Stalls Known for This Aisle (with Uniform StallEmblem) */}
                {activeAisle.topVendors.length > 0 ? (
                  <div className="mt-4 border-t border-border pt-3.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="type-kicker font-medium text-foreground">
                        Stalls known for {activeAisle.label.toLowerCase()}:
                      </p>
                      <Link
                        href={`/products?aisle=${activeAisle.id}`}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        Compare all stalls &amp; prices
                      </Link>
                    </div>
                    <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                      {activeAisle.topVendors.map((v) => (
                        <li
                          key={v.slug}
                          className="flex items-center justify-between gap-2 bg-secondary/55 px-3 py-2 ring-1 ring-border"
                        >
                          <div className="flex min-w-0 items-center gap-2.5">
                            <StallEmblem src={v.logoUrl} name={v.name} kind="vendor" size="sm" />
                            <div className="min-w-0">
                              <Link
                                href={`/vendors/${v.slug}`}
                                className="block text-sm font-medium text-foreground hover:text-primary hover:underline"
                              >
                                {v.name}
                              </Link>
                              <p className="text-sm text-muted-foreground">
                                {v.itemLabel} · {v.marketName}
                              </p>
                            </div>
                          </div>
                          <SaveButton kind="vendor" slug={v.slug} name={v.name} />
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {/* Secondary 4-Card Aisle Strip */}
                <div className="mt-4 border-t border-border pt-3.5">
                  <p className="type-kicker mb-2 text-muted-foreground">
                    More crates on the market floor
                  </p>
                  <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {data.aisles
                      .filter((a) => a.id !== activeAisle.id)
                      .slice(0, 4)
                      .map((aisle) => (
                        <li
                          key={aisle.id}
                          className="bg-secondary/45 p-2.5 ring-1 ring-border transition-colors hover:bg-secondary"
                        >
                          <button
                            type="button"
                            onClick={() => syncAisleSelection(aisle.id)}
                            className="w-full cursor-pointer text-left"
                          >
                            <ProductPhotoFrame
                              name={aisle.label}
                              decorative
                              photo={
                                aisle.photoUrl
                                  ? {
                                      url: aisle.photoUrl,
                                      alt: aisle.photoAlt ?? aisle.label,
                                    }
                                  : null
                              }
                              className="mb-2 h-16 w-full aspect-auto border border-border/70"
                            />
                            <p className="text-sm font-medium text-foreground">{aisle.label}</p>
                            <p className="type-nums text-sm text-stamp">{aisle.count} items</p>
                          </button>
                        </li>
                      ))}
                  </ul>
                </div>
              </div>
            ) : null}
          </div>

          {/* Right 6 Columns: Live Interactive Neighbourhood Atlas + Halls & Anchor Vendors */}
          <div id="map" className="scroll-mt-24 bg-card ring-1 ring-board lg:col-span-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b-2 border-board bg-secondary px-4 py-3">
              <div className="flex items-center gap-2.5">
                <span className="stall-chip-sm flex size-8 shrink-0 items-center justify-center bg-board text-chalk">
                  <BlocksMark className="size-4" />
                </span>
                <h2>Markets &amp; neighbourhood atlas</h2>
              </div>
              <Link
                href="/markets"
                className="text-sm font-medium text-primary underline underline-offset-4"
              >
                Full screen map
              </Link>
            </div>

            {/* Live Map */}
            <div className="border-b border-border">
              <MarketMapLazy load="visible" className="h-56 w-full overflow-hidden" />
            </div>

            <div className="border-b border-border bg-secondary/40 px-4 py-3">
              <label className="flex min-w-0 items-center gap-3 text-sm font-medium">
                <span className="shrink-0">Neighbourhood</span>
                <select
                  aria-label="Neighbourhood"
                  className="h-9 min-w-0 flex-1 rounded-none border border-input bg-card px-2.5 text-sm font-medium"
                  value={activeCircuit?.label ?? ""}
                  onChange={(event) => syncAreaSelection(event.target.value)}
                >
                  {torontoCircuits.length ? (
                    <optgroup label="Toronto">
                      {torontoCircuits.map((circuit) => (
                        <option key={circuit.q} value={circuit.label}>
                          {circuit.label}
                        </option>
                      ))}
                    </optgroup>
                  ) : null}
                  {cityCircuits.length ? (
                    <optgroup label="Around Toronto">
                      {cityCircuits.map((circuit) => (
                        <option key={circuit.q} value={circuit.label}>
                          {circuit.label}
                        </option>
                      ))}
                    </optgroup>
                  ) : null}
                </select>
              </label>
            </div>

            {/* Active Neighbourhood Circuit Hall List + Anchor Vendors (with Emblems) */}
            {activeCircuit ? (
              <div>
                <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-4 py-2.5">
                  <div className="flex items-baseline gap-2">
                    <h3>{activeCircuit.label}</h3>
                    <span className="type-nums text-sm text-muted-foreground">
                      {activeCircuit.vendorCount > 0
                        ? `${activeCircuit.vendorCount} stalls registered`
                        : `${activeCircuit.marketCount} hall`}
                    </span>
                  </div>
                  <Link
                    href={`/markets?area=${encodeURIComponent(activeCircuit.q)}`}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    Filter directory to {activeCircuit.label}
                  </Link>
                </div>

                <ul className="divide-y divide-border">
                  {activeCircuit.topMarkets.map((market) => {
                      return (
                        <li key={market.id} className="px-4 py-3 hover:bg-secondary/40">
                          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3">
                            <div className="flex min-w-0 items-start gap-2.5">
                              <StallEmblem
                                src={market.logo_url}
                                name={market.name}
                                kind="market"
                                size="sm"
                                className="mt-0.5"
                              />
                              <div className="min-w-0">
                                <p className="min-w-0">
                                  <Link
                                    href={`/markets/${market.slug}`}
                                    className="text-base font-medium hover:underline"
                                  >
                                    <VerifiedName slug={market.slug} name={market.name} />
                                  </Link>
                                  <ListingScore
                                    parens
                                    ratingAvg={market.rating_avg}
                                    reviewCount={market.review_count}
                                    className="ml-2 text-stamp"
                                  />
                                </p>
                                <p className="mt-0.5 text-sm text-muted-foreground">
                                  <AddressLink
                                    address={market.address}
                                    city={market.city}
                                    province={market.province}
                                    name={market.name}
                                    lat={market.lat}
                                    lng={market.lng}
                                  />
                                </p>
                              </div>
                            </div>

                            <div className="flex shrink-0 items-center gap-3">
                              <div className="text-right">
                                {market.open ? (
                                  <NowLabel>Open now</NowLabel>
                                ) : (
                                  <span className="type-nums whitespace-nowrap text-sm font-medium text-foreground">
                                    {market.nextOpen}
                                  </span>
                                )}
                                <SessionLines sessions={market.sessions} align="end" />
                              </div>
                              <SaveButton kind="market" slug={market.slug} name={market.name} />
                            </div>
                          </div>
                        </li>
                      );
                    })}
                </ul>

                {/* Anchor Stalls in This Neighbourhood (with Cohesive Stall Emblems) */}
                {activeCircuit.topVendors.length > 0 ? (
                  <div className="border-t border-border bg-secondary/35 px-4 py-3">
                    <p className="type-kicker text-muted-foreground">
                      Anchor stalls setting up in {activeCircuit.label}:
                    </p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {activeCircuit.topVendors.slice(0, 4).map((v) => (
                        <Link
                          key={v.slug}
                          href={`/vendors/${v.slug}`}
                          className="stall-chip-sm flex items-center gap-2.5 bg-card px-2.5 py-1.5 text-sm ring-1 ring-border hover:bg-secondary"
                        >
                          <StallEmblem src={v.logoUrl} name={v.name} kind="vendor" size="xs" />
                          <div className="min-w-0">
                            <p className="font-medium text-foreground">{v.name}</p>
                            <p className="text-sm text-muted-foreground">{v.specialty}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>

        {/* Full-Width Section: Toronto Neighbourhood Markets (With Both Hall & Stall Emblems) */}
        <section
          id="directory"
          aria-label="Neighbourhood markets"
          className="mt-10 scroll-mt-24 border-t-2 border-board pt-8"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 pb-5">
            <div className="flex items-center gap-2.5">
              <span className="stall-chip-sm flex size-8 shrink-0 items-center justify-center bg-primary text-primary-foreground">
                <PlateMark className="size-4" />
              </span>
              <h2>Neighbourhood markets</h2>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {data.setupOptions.slice(0, 4).map((tag) => (
                <Link
                  key={tag}
                  href={`/markets?tag=${encodeURIComponent(tag)}`}
                  className="stall-chip-sm bg-secondary px-3 py-1 text-sm font-medium text-foreground hover:bg-board hover:text-chalk"
                >
                  {tagLabel(tag)}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-8">
            <PlaceCircuitGroup
              title="Toronto"
              circuits={torontoCircuits}
              onShowStalls={syncAreaSelection}
              stallLabels={stallLabels}
            />
            <PlaceCircuitGroup
              title="Around Toronto"
              circuits={cityCircuits}
              onShowStalls={syncAreaSelection}
              stallLabels={stallLabels}
            />
          </div>
        </section>

        {/* Bottom 12-Col Spread: 8-Col Live Stalls & Regulars Roster + 4-Col Timetable & Saved Rail */}
        <section
          aria-label="Stalls, notes, and upcoming timetable"
          className="mt-10 border-t-2 border-board pt-8 pb-4"
        >
          <div className="grid gap-8 lg:grid-cols-12 lg:items-start">
            {/* Left 8 Columns: Active Stalls Today + Top 5 This Week + Shopper Notes */}
            <div className="flex flex-col gap-6 lg:col-span-8">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Active Vendors Today */}
                <div className="bg-card ring-1 ring-border">
                  <div className="flex items-start justify-between gap-2 border-b border-border bg-secondary/50 px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="stall-chip-sm flex size-8 shrink-0 items-center justify-center bg-stamp/15 text-stamp">
                        <CrateMark className="size-4" />
                      </span>
                      <div>
                        <p className="type-kicker text-muted-foreground">Selling today</p>
                        <h3>Stalls on the floor</h3>
                      </div>
                    </div>
                    <span className="type-nums text-sm font-medium text-primary">
                      {data.sellingTodayCount} active
                    </span>
                  </div>
                  {data.sellingToday.length > 0 ? (
                    <ul>
                      {data.sellingToday.slice(0, 5).map((row) => (
                        <VendorTodayItem
                          key={`${row.vendorSlug}-${row.marketSlug}`}
                          row={row}
                        />
                      ))}
                    </ul>
                  ) : (
                    <p className="px-4 py-4 text-sm text-muted-foreground">
                      No stalls remain open at this hour today. Browse the{" "}
                      <Link href="/events" className="font-medium text-primary hover:underline">
                        upcoming week schedule
                      </Link>{" "}
                      or explore featured stalls above.
                    </p>
                  )}
                </div>

                {/* Top 5 Stalls This Week */}
                <div className="bg-card ring-1 ring-border">
                  <div className="flex items-start justify-between gap-2 border-b border-border bg-secondary/50 px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="stall-chip-sm flex size-8 shrink-0 items-center justify-center bg-foreground text-receipt">
                        <TallyMark className="size-4" />
                      </span>
                      <div>
                        <p className="type-kicker text-muted-foreground">Regulars&apos; picks</p>
                        <h3>Top 5 stalls this week</h3>
                      </div>
                    </div>
                    <Link
                      href="/markets#directory-vendors"
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      All stalls
                    </Link>
                  </div>
                  <ol>
                    {data.weekVendors.slice(0, 5).map((pick, index) => (
                      <VendorWeekItem key={pick.vendorSlug} pick={pick} index={index} />
                    ))}
                  </ol>
                </div>
              </div>

              {/* Recent Shopper Notes From the Floor */}
              <div id="reviews" className="scroll-mt-24 bg-card ring-1 ring-border">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-secondary/50 px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <span className="stall-chip-sm flex size-8 shrink-0 items-center justify-center bg-board text-chalk">
                      <AsteriskMark className="size-4" />
                    </span>
                    <h3>Recent shopper notes &amp; finds</h3>
                  </div>
                  <Link href="/feed" className="text-sm font-medium text-primary hover:underline">
                    View all posts
                  </Link>
                </div>
                {data.tape.length > 0 ? (
                  <ol className="grid divide-y divide-border md:grid-cols-2 md:divide-x md:divide-y-0">
                    {data.tape.slice(0, 2).map((item) => (
                      <ReviewCard key={item.id} item={item} />
                    ))}
                  </ol>
                ) : (
                  <p className="px-4 py-4 text-sm text-muted-foreground">
                    No floor notes posted yet. Visit{" "}
                    <Link href="/feed" className="font-medium text-primary hover:underline">
                      the live feed
                    </Link>{" "}
                    to share what is fresh at the stalls.
                  </p>
                )}
              </div>
            </div>

            {/* Right 4 Columns: Saved Rail + Compact Upcoming Timetable + Field Dispatch */}
            <aside className="flex flex-col gap-6 lg:col-span-4">
              <SavedRail />

              {/* Compact Next Market Sessions Card */}
              <div className="bg-card ring-1 ring-border">
                <div className="flex items-center justify-between gap-2 border-b border-border bg-secondary/50 px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <span className="stall-chip-sm flex size-8 shrink-0 items-center justify-center bg-primary text-primary-foreground">
                      <WeekMark className="size-4" />
                    </span>
                    <h2 className="type-column">Upcoming sessions</h2>
                  </div>
                  <Link href="/events" className="text-sm font-medium text-primary hover:underline">
                    Calendar
                  </Link>
                </div>

                <div className="divide-y divide-border">
                  {data.fullWeek
                    .filter((g) => g.id !== "earlier" && g.slots.length > 0)
                    .slice(0, 3)
                    .map((group) => (
                      <div key={group.id} className="p-3.5">
                        <div className="flex items-baseline justify-between gap-2">
                          <h3>{group.label}</h3>
                          <span className="type-nums text-sm text-primary">{group.date}</span>
                        </div>
                        <ul className="mt-2 space-y-2">
                          {group.slots.slice(0, 3).map((slot) => (
                            <li
                              key={slot.id}
                              className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3"
                            >
                              <Link
                                href={`/markets/${slot.slug}`}
                                className="text-base font-medium hover:underline"
                              >
                                <VerifiedName slug={slot.slug} name={slot.name} />
                              </Link>
                              <Hours
                                value={slot.hours}
                                className={
                                  slot.open ? "font-medium text-stamp" : "text-muted-foreground"
                                }
                              />
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                </div>
              </div>

              {/* Editorial Field Note Card */}
              {data.weeklyNote ? (
                <div className="bg-card p-4 ring-1 ring-board">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                      <SignMark className="size-4" />
                      <span>{data.weeklyNote.kicker ?? "Field note"}</span>
                    </span>
                    <SaveButton
                      kind="blog"
                      slug={data.weeklyNote.slug}
                      name={data.weeklyNote.title}
                    />
                  </div>
                  <h3 className="mt-2">
                    <Link href={`/blog/${data.weeklyNote.slug}`} className="hover:underline">
                      {data.weeklyNote.title}
                    </Link>
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {data.weeklyNote.description}
                  </p>
                </div>
              ) : null}
            </aside>
          </div>
        </section>
      </div>
    </div>
  );
}
