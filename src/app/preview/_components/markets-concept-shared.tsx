"use client";

import { useState } from "react";
import Link from "next/link";
import type {
  EnrichedMarketRow,
  MarketsPreviewData,
  PreviewVendorSpotlight,
} from "@/app/preview/_lib/markets-preview-data";
import { AddressLink } from "@/components/address-link";
import { Hours } from "@/components/hours";
import { ListingScore } from "@/components/listing-score";
import {
  BlocksMark,
  CaretRightMark,
  CrateMark,
  RulesMark,
  TagMark,
} from "@/components/marks";
import { NowLabel } from "@/components/now-label";
import { ProductPhotoFrame } from "@/components/product-photo-frame";
import { SaveButton } from "@/components/save-button";
import { VerifiedName } from "@/components/verified-stamp";
import { formatPrice, listingMarkSrc } from "@/lib/format";
import { formatRatingAvg, formatReviewCountShort, listingScore } from "@/lib/listing-score";
import { cn } from "@/lib/utils";

export function formatCensus(n: number) {
  return n.toLocaleString("en-CA");
}

/**
 * Guard that guarantees an image URL never routes through Supabase's paid
 * `/storage/v1/render/image/` transform endpoint or Vercel's `/_next/image` optimizer.
 */
export function directPublicImageSrc(src: string | null | undefined): string | null {
  if (!src) return null;
  if (src.includes("/storage/v1/render/image/") || src.startsWith("/_next/image")) {
    return null;
  }
  return src;
}

/**
 * Cohesive Stall / Market Emblem Plate (`StallEmblem`), matching `HomeAtlas`, `VendorAtlas`, and `ProductsAtlas`.
 */
export function StallEmblem({
  src,
  name,
  kind = "market",
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
    md: { box: "size-11 p-1", px: 44, icon: "size-5" },
    lg: { box: "size-14 p-1.5", px: 56, icon: "size-6" },
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

/** Same plate as a stall emblem. Market concept pages ask for it by this name. */
export const MarketEmblem = StallEmblem;

export function CensusStrip({ data }: { data: MarketsPreviewData }) {
  return (
    <nav
      aria-label="On the directory"
      className="grid grid-cols-3 divide-x divide-border bg-card ring-1 ring-board"
    >
      <Link
        href="/markets#directory-vendors"
        className="flex flex-col justify-between bg-secondary/45 p-3.5 transition-colors hover:bg-secondary"
      >
        <span className="flex items-center justify-between gap-1">
          <span className="type-kicker font-medium text-primary">Priority stalls</span>
          <CrateMark className="size-4 shrink-0 text-primary" />
        </span>
        <span className="type-census mt-1 text-3xl leading-none text-board sm:text-4xl">
          {formatCensus(data.census.vendors)}
        </span>
        <span className="mt-1 text-sm font-medium text-primary">vendors</span>
      </Link>
      <Link
        href="/products"
        className="flex flex-col justify-between p-3.5 transition-colors hover:bg-secondary/60"
      >
        <span className="flex items-center justify-between gap-1">
          <span className="type-kicker text-muted-foreground">Products</span>
          <TagMark className="size-4 shrink-0 text-stamp" />
        </span>
        <span className="type-census mt-1 text-3xl leading-none text-stamp sm:text-4xl">
          {formatCensus(data.census.menus)}
        </span>
        <span className="mt-1 text-sm font-medium text-stamp">menu items</span>
      </Link>
      <Link
        href="/markets"
        className="flex flex-col justify-between p-3.5 transition-colors hover:bg-secondary/60"
      >
        <span className="flex items-center justify-between gap-1">
          <span className="type-kicker text-muted-foreground">Neighbourhoods</span>
          <RulesMark className="size-4 shrink-0 text-board" />
        </span>
        <span className="type-census mt-1 text-3xl leading-none text-board sm:text-4xl">
          {formatCensus(data.census.markets)}
        </span>
        <span className="mt-1 text-sm font-medium text-primary">markets</span>
      </Link>
    </nav>
  );
}

/**
 * Cohesive square category thumbnail (`ProductThumb`), matching `HomeAtlas` and `ProductsAtlas`.
 */
export function ProductThumb({
  src,
  size = "xs",
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
    md: { box: "size-12", px: 48, icon: "size-5" },
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

/**
 * High-contrast score badge designed specifically for dark forest-green (`bg-primary`)
 * masthead and card plates — avoids red-on-green contrast clashes.
 */
export function MastheadScore({
  ratingAvg,
  reviewCount,
  className,
}: {
  ratingAvg?: number | string | null;
  reviewCount?: number | null;
  className?: string;
}) {
  const score = listingScore(ratingAvg, reviewCount);
  if (!score) return null;
  const avg = formatRatingAvg(score.avg);
  const count = formatReviewCountShort(score.count);
  const noun = score.count === 1 ? "rating" : "ratings";

  return (
    <span className={cn("inline-flex items-center gap-2 text-sm", className)}>
      <span className="stall-chip-sm type-nums inline-flex h-6 min-w-8 items-center justify-center bg-receipt px-2 text-sm font-semibold text-foreground ring-1 ring-black/15">
        {avg}
      </span>
      <span className="type-nums font-medium text-primary-foreground/95">
        {count} {noun}
      </span>
    </span>
  );
}

export function formatStallNote(stall: string | null | undefined): string | null {
  const trimmed = stall?.trim();
  if (!trimmed) return null;
  if (/^stall\b/i.test(trimmed)) return trimmed;
  if (/^[A-Za-z]?\d+[A-Za-z]?$/.test(trimmed)) return `Stall ${trimmed}`;
  return trimmed;
}

export function SessionLines({
  sessions,
  highlightDay,
  align = "end",
  fallback,
}: {
  sessions: Array<{ day: string; hours: string }>;
  highlightDay?: string | null;
  align?: "end" | "stretch";
  fallback?: string;
}) {
  if (!sessions.length) {
    return (
      <span className="type-nums whitespace-nowrap text-sm text-muted-foreground">
        {fallback ?? "Seasonal schedule"}
      </span>
    );
  }
  return (
    <ul className="flex flex-col gap-0.5">
      {sessions.map((session) => (
        <li
          key={`${session.day}-${session.hours}`}
          className={cn(
            "grid items-baseline gap-x-2",
            align === "end"
              ? "grid-cols-[auto_auto] justify-end"
              : "grid-cols-[minmax(0,1fr)_auto]",
          )}
        >
          <span className="text-sm text-muted-foreground">{session.day}</span>
          <Hours
            value={session.hours}
            className={cn(
              "text-sm",
              highlightDay && session.day === highlightDay
                ? "font-medium text-stamp"
                : "font-medium text-foreground",
            )}
          />
        </li>
      ))}
    </ul>
  );
}

export function neighbourhoodOptions(data: MarketsPreviewData): string[] {
  return [...new Set(data.enrichedMarkets.map((m) => m.neighbourhood).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b),
  );
}

/** Stalls on the homepage sample that list this market, in directory order. */
export function vendorsForMarket(data: MarketsPreviewData, slug: string, limit: number) {
  if (limit <= 0) return [];
  return data.vendorSpotlights
    .filter((vendor) => vendor.markets.some((market) => market.slug === slug))
    .slice(0, limit);
}

/**
 * Rich Atlas Market Card — matches the 3-tier visual architecture of `HomeAtlas` and `VendorAtlas`:
 * 1. Forest-Green Market Identity Plate (`bg-primary text-primary-foreground`) with `StallEmblem`, `VerifiedName`, `MastheadScore`, status & setup pills, and `SaveButton`.
 * 2. Visual Specialty & Participating Stalls Band (`ProductPhotoFrame` + dashed-rule `bg-receipt` rows showing real stalls at this market and their signature products/prices).
 * 3. Unclipped Weekly Hours & Street Address Footer (`grid-cols-[minmax(0,1fr)_auto]`).
 */
export function AtlasMarketCard({
  market,
  simulatedPeak = false,
  selected = false,
  onInspect,
  onSelectNeighbourhood,
}: {
  market: EnrichedMarketRow;
  simulatedPeak?: boolean;
  selected?: boolean;
  onInspect?: (slug: string) => void;
  onSelectNeighbourhood?: (neighbourhood: string) => void;
}) {
  const isOpen = market.open || (simulatedPeak && market.openSaturday);
  const shownStalls = market.topStalls.slice(0, 3);
  const extraStallCount = Math.max(0, market.vendorCount - shownStalls.length);

  return (
    <li
      className={cn(
        "flex flex-col justify-between bg-card transition-shadow",
        selected ? "ring-2 ring-primary shadow-md" : "ring-1 ring-board",
      )}
    >
      <div>
        {/* 1. Forest-Green Market Plate Header */}
        <div className="flex items-start justify-between gap-2.5 border-b border-black/15 bg-primary px-4 py-3.5 text-primary-foreground">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <StallEmblem
              src={market.logo_url}
              name={market.name}
              kind="market"
              size="md"
              tone="chalk"
              className="mt-0.5"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <Link
                  href={`/markets/${market.slug}`}
                  className="text-base font-medium text-primary-foreground hover:underline"
                >
                  <VerifiedName slug={market.slug} name={market.name} />
                </Link>
              </div>
              <MastheadScore
                ratingAvg={market.rating_avg}
                reviewCount={market.review_count}
                className="mt-1"
              />
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {isOpen ? (
                  <span className="stall-chip-sm inline-flex items-center bg-stamp px-2.5 py-0.5 text-sm font-medium text-chalk">
                    Open now
                  </span>
                ) : (
                  <span className="stall-chip-sm type-nums inline-flex items-center bg-board/80 px-2.5 py-0.5 text-sm font-medium text-chalk">
                    {market.nextOpen}
                  </span>
                )}
                {market.indoor_outdoor ? (
                  <span className="rounded bg-primary-foreground/15 px-2 py-0.5 text-sm font-medium text-primary-foreground">
                    {market.indoor_outdoor}
                  </span>
                ) : null}
                {onSelectNeighbourhood ? (
                  <button
                    type="button"
                    onClick={() => onSelectNeighbourhood(market.neighbourhood)}
                    className="cursor-pointer rounded bg-primary-foreground/15 px-2 py-0.5 text-sm font-medium text-primary-foreground hover:bg-receipt hover:text-primary"
                  >
                    {market.neighbourhood}
                  </button>
                ) : (
                  <span className="rounded bg-primary-foreground/15 px-2 py-0.5 text-sm font-medium text-primary-foreground">
                    {market.neighbourhood}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="shrink-0 rounded bg-receipt p-0.5 ring-1 ring-black/15">
            <SaveButton kind="market" slug={market.slug} name={market.name} size="sm" />
          </div>
        </div>

        {/* 2. Visual Specialty Strip + Participating Stalls Slip */}
        <div className="border-b border-border bg-secondary/45">
          <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-3 border-b border-border bg-card px-4 py-2.5">
            <Link href={`/markets/${market.slug}`} className="block">
              <ProductPhotoFrame
                name={market.primaryCategoryLabel}
                decorative
                photo={
                  market.bannerPhotoUrl
                    ? {
                        url: market.bannerPhotoUrl,
                        alt: market.bannerPhotoAlt,
                      }
                    : null
                }
                className="h-12 w-[4.5rem] aspect-auto border border-border"
              />
            </Link>
            <div className="flex items-baseline justify-between gap-2">
              <div>
                <p className="type-kicker font-medium text-foreground">
                  {market.vendorCount > 0
                    ? `${market.vendorCount} stalls registered`
                    : "Local market stalls"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {market.primaryCategoryLabel}
                  {market.displayTags.length > 0
                    ? ` · ${market.displayTags.slice(0, 2).join(", ")}`
                    : ""}
                </p>
              </div>
              {onInspect ? (
                <button
                  type="button"
                  onClick={() => onInspect(market.slug)}
                  className="shrink-0 cursor-pointer text-sm font-medium text-primary hover:underline"
                >
                  {selected ? "Inspecting" : "Inspect →"}
                </button>
              ) : (
                <Link
                  href={`/markets/${market.slug}`}
                  className="shrink-0 text-sm font-medium text-primary hover:underline"
                >
                  Roster →
                </Link>
              )}
            </div>
          </div>

          {shownStalls.length > 0 ? (
            <ul className="bg-receipt shadow-[inset_3px_0_0_var(--primary)]">
              {shownStalls.map((stall) => {
                const price = formatPrice(stall.priceCents);
                return (
                  <li
                    key={stall.slug}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 border-t border-dashed border-border px-4 py-2 text-sm first:border-t-0"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <StallEmblem
                        src={stall.logoUrl}
                        name={stall.name}
                        kind="vendor"
                        size="xs"
                        tone="paper"
                      />
                      <div className="min-w-0">
                        <Link
                          href={`/vendors/${stall.slug}`}
                          className="font-medium text-foreground hover:text-primary hover:underline"
                        >
                          {stall.name}
                        </Link>
                        <span className="text-muted-foreground">
                          {" "}
                          · {stall.itemName}
                        </span>
                      </div>
                    </div>
                    {price ? (
                      <span className="type-nums shrink-0 whitespace-nowrap font-medium text-stamp">
                        {price}
                      </span>
                    ) : (
                      <span className="shrink-0 whitespace-nowrap text-muted-foreground">
                        {stall.categoryLabel}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="bg-receipt px-4 py-2.5 text-sm text-muted-foreground shadow-[inset_3px_0_0_var(--primary)]">
              {market.about}
            </p>
          )}
        </div>
      </div>

      {/* 3. Unclipped Weekly Hours & Street Address Footer */}
      <div className="bg-card px-4 py-3">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">
              <AddressLink
                address={market.address}
                city={market.city}
                province={market.province}
                name={market.name}
                lat={market.lat}
                lng={market.lng}
              />
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <Link
                href={`/markets/${market.slug}`}
                className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
              >
                <span>Open market page</span>
                <CaretRightMark className="size-3" />
              </Link>
              {extraStallCount > 0 ? (
                <Link
                  href={`/markets/${market.slug}#vendors`}
                  className="type-nums text-muted-foreground hover:text-foreground hover:underline"
                >
                  +{extraStallCount} more {extraStallCount === 1 ? "stall" : "stalls"}
                </Link>
              ) : null}
            </div>
          </div>

          <SessionLines
            sessions={market.sessions.slice(0, 3)}
            highlightDay={isOpen ? "Sat" : null}
            fallback={market.nextOpen}
          />
        </div>
      </div>
    </li>
  );
}

/**
 * Rich Atlas Vendor Card for the `/markets` Vendors Directory (`#directory-vendors`).
 * Matches the receipt-card treatment in `ProductsAtlas` and `VendorAtlas`.
 */
export function AtlasVendorDirectoryCard({
  vendor,
  simulatedPeak = false,
}: {
  vendor: PreviewVendorSpotlight;
  simulatedPeak?: boolean;
}) {
  const isSelling = vendor.openNow || (simulatedPeak && vendor.onWeekend);
  const leadMarket = vendor.markets[0];
  const extraMarkets = Math.max(0, vendor.markets.length - 1);

  return (
    <li className="flex flex-col justify-between bg-receipt p-4 ring-1 ring-board shadow-[inset_3px_0_0_var(--primary)]">
      <div>
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex min-w-0 items-start gap-3">
            <StallEmblem
              src={vendor.logoUrl}
              name={vendor.name}
              kind="vendor"
              size="md"
              tone="paper"
            />
            <div className="min-w-0">
              <Link
                href={`/vendors/${vendor.slug}`}
                className="block text-base font-medium text-foreground hover:text-primary hover:underline"
              >
                <VerifiedName slug={vendor.slug} name={vendor.name} />
              </Link>
              <ListingScore
                ratingAvg={vendor.ratingAvg}
                reviewCount={vendor.reviewCount}
                className="mt-0.5 text-sm"
              />
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {isSelling ? (
                  <NowLabel>Selling now</NowLabel>
                ) : (
                  <span className="stall-chip-sm bg-secondary px-2 py-0.5 text-sm font-medium text-foreground">
                    {vendor.badge}
                  </span>
                )}
                <span className="rounded bg-card px-2 py-0.5 text-sm font-medium text-muted-foreground ring-1 ring-border">
                  {vendor.primaryAisleLabel}
                </span>
              </div>
            </div>
          </div>

          <SaveButton kind="vendor" slug={vendor.slug} name={vendor.name} size="sm" />
        </div>

        {/* Menu Items & Prices */}
        {vendor.items.length > 0 ? (
          <ul className="mt-3 border-t border-dashed border-border pt-2.5">
            {vendor.items.slice(0, 2).map((item) => {
              const price = formatPrice(item.priceCents);
              return (
                <li
                  key={`${vendor.slug}-${item.name}`}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-2 py-1 text-sm"
                >
                  <Link
                    href={item.href}
                    className="font-medium text-foreground hover:text-primary hover:underline"
                  >
                    {item.name}
                  </Link>
                  {price ? (
                    <span className="stall-chip-sm type-nums bg-stamp px-2 py-0.5 text-sm font-medium text-chalk">
                      {price}
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : vendor.about ? (
          <p className="mt-3 border-t border-dashed border-border pt-2.5 text-sm text-muted-foreground">
            {vendor.about}
          </p>
        ) : null}
      </div>

      {/* Where They Set Up */}
      {leadMarket ? (
        <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 border-t border-border pt-2.5 text-sm">
          <div className="min-w-0">
            <Link
              href={`/markets/${leadMarket.slug}`}
              className="inline-flex items-center gap-1.5 font-medium text-foreground hover:text-primary hover:underline"
            >
              <BlocksMark className="size-3.5 shrink-0 text-primary" />
              <span>{leadMarket.name}</span>
            </Link>
            {extraMarkets > 0 ? (
              <span className="type-nums ml-1.5 text-muted-foreground">
                +{extraMarkets} more
              </span>
            ) : null}
          </div>
          <SessionLines sessions={leadMarket.hours.slice(0, 1)} />
        </div>
      ) : null}
    </li>
  );
}
