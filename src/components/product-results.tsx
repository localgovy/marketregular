"use client";

import { useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { Hours } from "@/components/hours";
import { ListingScore } from "@/components/listing-score";
import {
  CaretRightMark,
  CrateMark,
  RulesMark,
  WeekMark,
} from "@/components/marks";
import { MenuItemPhoto } from "@/components/menu-item-photo";
import { NowLabel } from "@/components/now-label";
import { ProductSaveButton, SaveButton } from "@/components/save-button";
import { VerifiedName } from "@/components/verified-stamp";
import { WEEKDAYS } from "@/lib/constants";
import type { FindVendor } from "@/lib/data/product-search";
import { formatPrice, listingMarkSrc } from "@/lib/format";
import { formatRatingAvg, formatReviewCountShort, listingScore } from "@/lib/listing-score";
import type { ProductHit, VendorHit } from "@/lib/product-hits";
import { productFromInput } from "@/lib/product-saves";
import { cn } from "@/lib/utils";

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
 * Cohesive Stall / Market Emblem Plate (`StallEmblem`), matching `HomeAtlas` and `VendorAtlas`.
 */
export function StallEmblem({
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
    xs: { box: "size-7 p-0.5", px: 28, icon: "size-3.5" },
    sm: { box: "size-9 p-1", px: 36, icon: "size-4" },
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

/**
 * High-contrast score badge for dark forest-green (`bg-primary`) plate headers.
 */
function MastheadScore({
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
    <span className={cn("inline-flex items-center gap-1.5 text-sm", className)}>
      <span className="stall-chip-sm type-nums inline-flex h-5 min-w-7 items-center justify-center bg-receipt px-1.5 text-sm font-semibold text-foreground ring-1 ring-black/15">
        {avg}
      </span>
      <span className="type-nums font-medium text-primary-foreground/90">
        ({count} {noun})
      </span>
    </span>
  );
}

/** Same short days as a vendor card, so the hours column stays one line. */
function shortDays(days: number[]) {
  const names = [...new Set(days.filter((day) => day >= 0 && day <= 6))].sort((a, b) => a - b);
  if (!names.length) return null;
  return names.map((day) => WEEKDAYS[day].slice(0, 3)).join(", ");
}

function formatStallNote(stall: string | null | undefined): string | null {
  const trimmed = stall?.trim();
  if (!trimmed) return null;
  if (/^stall\b/i.test(trimmed)) return trimmed;
  if (/^[A-Za-z]?\d+[A-Za-z]?$/.test(trimmed)) return `Stall ${trimmed}`;
  return trimmed;
}

type ListingItem = {
  id?: string;
  name: string;
  href?: string;
  priceCents: number | null;
  imageUrl?: string | null;
};

type ListingMarket = {
  name: string;
  slug: string;
  days: number[];
  hours: Array<{ day: string; hours: string }>;
  ratingAvg: number | null;
  reviewCount: number;
  logoUrl?: string | null;
  stall?: string | null;
};

function moreMarketsLabel(hidden: number) {
  return hidden === 1 ? "Show 1 more market" : `Show ${hidden} more markets`;
}

export function ProductListing({
  vendorName,
  vendorSlug,
  logoUrl,
  ratingAvg,
  reviewCount,
  badge,
  items,
  markets,
  previewMarkets,
  highlightMarketSlug,
}: {
  vendorName: string;
  vendorSlug: string;
  logoUrl: string | null;
  ratingAvg: number | null;
  reviewCount: number;
  badge: string | null;
  items: ListingItem[];
  markets: ListingMarket[];
  /** Product pages keep the first markets visible until the rest are opened. */
  previewMarkets?: number;
  /** Optional active market filter slug to highlight matching market rows. */
  highlightMarketSlug?: string | null;
}) {
  const [marketsOpen, setMarketsOpen] = useState(false);
  const focusIndex = useRef<number | null>(null);
  const marketLinks = useRef<(HTMLAnchorElement | null)[]>([]);

  const orderedMarkets = highlightMarketSlug
    ? [
        ...markets.filter((m) => m.slug === highlightMarketSlug),
        ...markets.filter((m) => m.slug !== highlightMarketSlug),
      ]
    : markets;

  const shownMarkets =
    previewMarkets != null && !marketsOpen
      ? orderedMarkets.slice(0, previewMarkets)
      : orderedMarkets;
  const hiddenMarkets = orderedMarkets.length - shownMarkets.length;

  const combinedProduct = productFromInput({
    vendorSlug,
    vendorName,
    ratingAvg,
    reviewCount,
    items,
    markets,
  });

  useLayoutEffect(() => {
    const index = focusIndex.current;
    if (index == null) return;
    focusIndex.current = null;
    marketLinks.current[index]?.focus();
  }, [marketsOpen]);

  function openMarkets() {
    focusIndex.current = shownMarkets.length;
    setMarketsOpen(true);
  }

  const isLiveToday = badge === "Open now" || badge === "Later today";

  return (
    <li className="bg-card ring-1 ring-board">
      {/* 1. Forest-Green Enamel Vendor Plate Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-black/15 bg-primary px-4 py-3.5 text-primary-foreground sm:items-center">
        <div className="flex min-w-[min(100%,14rem)] max-w-full flex-1 items-start gap-3 sm:items-center">
          <StallEmblem
            src={logoUrl}
            name={vendorName}
            kind="vendor"
            size="md"
            tone="chalk"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <Link
                href={`/vendors/${vendorSlug}`}
                className="text-base font-medium text-primary-foreground hover:underline"
              >
                <VerifiedName slug={vendorSlug} name={vendorName} />
              </Link>
              <MastheadScore ratingAvg={ratingAvg} reviewCount={reviewCount} />
            </div>

            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              {badge === "Open now" ? (
                <NowLabel tone="board">Open now</NowLabel>
              ) : badge ? (
                <span
                  className={cn(
                    "stall-chip-sm inline-flex items-center gap-1.5 px-2.5 py-0.5 text-sm font-medium",
                    isLiveToday
                      ? "bg-receipt text-foreground"
                      : "bg-board/80 text-chalk",
                  )}
                >
                  <WeekMark className="size-3.5" />
                  <span>{badge}</span>
                </span>
              ) : null}
              <Link
                href={`/vendors/${vendorSlug}#menu`}
                className="inline-flex items-center gap-1 text-sm font-medium text-primary-foreground/90 hover:text-primary-foreground hover:underline"
              >
                <span>Full stall menu</span>
                <CaretRightMark className="size-3" />
              </Link>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div className="rounded bg-receipt p-0.5 ring-1 ring-black/15">
            <SaveButton kind="vendor" slug={vendorSlug} name={vendorName} size="sm" />
          </div>
        </div>
      </div>

      {/* 2. Shoppable Menu Items Section */}
      {items.length ? (
        <ul className="border-b border-border bg-receipt shadow-[inset_3px_0_0_var(--primary)]">
          {items.map((item, index) => {
            const price = formatPrice(item.priceCents);
            const singleItemProduct =
              items.length === 1
                ? combinedProduct
                : productFromInput({
                    vendorSlug,
                    vendorName,
                    ratingAvg,
                    reviewCount,
                    items: [item],
                    markets,
                  });

            return (
              <li
                key={`${vendorSlug}-item-${item.id ?? index}`}
                className="border-b border-dashed border-border px-4 py-3.5 transition-colors last:border-b-0 hover:bg-card/65"
              >
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                  <div className="flex min-w-0 items-start gap-3.5">
                    <MenuItemPhoto url={item.imageUrl} menuId={item.id} />
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-medium text-foreground">
                        {item.href ? (
                          <Link
                            href={item.href}
                            className="hover:text-primary hover:underline"
                          >
                            {item.name}
                          </Link>
                        ) : (
                          <Link
                            href={`/vendors/${vendorSlug}#menu`}
                            className="hover:text-primary hover:underline"
                          >
                            {item.name}
                          </Link>
                        )}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                        <span>Sold by {vendorName}</span>
                        {markets[0] ? (
                          <>
                            <span aria-hidden>·</span>
                            <span>
                              Pickup at {markets[0].name}
                              {markets.length > 1 ? ` +${markets.length - 1}` : ""}
                            </span>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {/* Price Stamp + Save Product Control */}
                  <div className="flex items-center justify-between gap-2.5 sm:justify-end">
                    {price ? (
                      <span className="stall-chip-sm type-nums shrink-0 whitespace-nowrap bg-stamp px-3 py-1 text-sm font-medium text-chalk">
                        {price}
                      </span>
                    ) : (
                      <span className="rounded bg-secondary px-2.5 py-1 text-sm text-muted-foreground ring-1 ring-border">
                        Market price
                      </span>
                    )}
                    {singleItemProduct ? (
                      <ProductSaveButton product={singleItemProduct} size="sm" />
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}

      {/* 3. Where They Set Up — Unclipped Market & Hours Schedule */}
      {shownMarkets.length ? (
        <div className="bg-card">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 bg-secondary/45 px-4 py-2">
            <span className="type-kicker text-muted-foreground">
              Where to buy ({markets.length} {markets.length === 1 ? "market" : "markets"})
            </span>
            {items.length > 1 && combinedProduct ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Save all {items.length} items:</span>
                <ProductSaveButton product={combinedProduct} size="sm" />
              </div>
            ) : null}
          </div>
          <ul className="divide-y divide-border/80">
            {shownMarkets.map((market, index) => {
              const days = shortDays(market.days);
              const stallNote = formatStallNote(market.stall);
              const isHighlighted =
                Boolean(highlightMarketSlug) && market.slug === highlightMarketSlug;

              return (
                <li
                  key={market.slug}
                  className={cn(
                    "px-4 py-3 transition-colors hover:bg-secondary/35",
                    isHighlighted && "bg-receipt/80 shadow-[inset_3px_0_0_var(--stamp)]",
                  )}
                >
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3">
                    <div className="flex min-w-0 items-start gap-2.5">
                      <StallEmblem
                        src={market.logoUrl}
                        name={market.name}
                        kind="market"
                        size="sm"
                        tone="paper"
                        className="mt-0.5"
                      />
                      <div className="min-w-0">
                        <p className="min-w-0">
                          <Link
                            ref={(node) => {
                              marketLinks.current[index] = node;
                            }}
                            href={`/markets/${market.slug}`}
                            className="text-base font-medium text-foreground hover:text-primary hover:underline"
                          >
                            {market.name}
                          </Link>
                          <ListingScore
                            parens
                            ratingAvg={market.ratingAvg}
                            reviewCount={market.reviewCount}
                            className="ml-2 text-stamp"
                          />
                        </p>
                        {stallNote ? (
                          <p className="type-nums mt-0.5 text-sm text-muted-foreground">
                            {stallNote}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    {market.hours.length ? (
                      <ul className="flex flex-col gap-0.5">
                        {market.hours.map((row) => (
                          <li
                            key={`${market.slug}-${row.day}-${row.hours}`}
                            className="grid grid-cols-[auto_auto] items-baseline justify-end gap-x-2"
                          >
                            <span className="text-sm text-muted-foreground">{row.day}</span>
                            <Hours
                              value={row.hours}
                              className="text-sm font-medium text-foreground"
                            />
                          </li>
                        ))}
                      </ul>
                    ) : days ? (
                      <p className="type-nums whitespace-nowrap text-sm text-muted-foreground">
                        {days}
                      </p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {hiddenMarkets > 0 ? (
        <div className="border-t border-border bg-receipt p-3">
          <button
            type="button"
            onClick={openMarkets}
            className="stall-chip inline-flex h-10 w-full cursor-pointer items-center justify-center bg-primary px-5 text-sm font-medium text-primary-foreground outline-none hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-foreground"
          >
            {moreMarketsLabel(hiddenMarkets)}
          </button>
        </div>
      ) : null}
    </li>
  );
}

export function FindVendorList({
  vendors,
  highlightMarketSlug,
}: {
  vendors: FindVendor[];
  highlightMarketSlug?: string | null;
}) {
  if (!vendors.length) {
    return (
      <div className="mt-6 bg-receipt p-6 text-center ring-1 ring-border">
        <p className="text-base font-medium text-foreground">
          No published stalls match this filter yet.
        </p>
      </div>
    );
  }
  return (
    <ul className="mt-4 grid gap-5">
      {vendors.map((vendor) => (
        <ProductListing
          key={vendor.slug}
          vendorName={vendor.name}
          vendorSlug={vendor.slug}
          logoUrl={vendor.logoUrl}
          ratingAvg={vendor.ratingAvg}
          reviewCount={vendor.reviewCount}
          badge={vendor.badge}
          items={vendor.items}
          markets={vendor.markets}
          previewMarkets={2}
          highlightMarketSlug={highlightMarketSlug}
        />
      ))}
    </ul>
  );
}

export function ProductHitList({
  hits,
  highlightMarketSlug,
}: {
  hits: ProductHit[];
  highlightMarketSlug?: string | null;
}) {
  if (!hits.length) return null;
  return (
    <ul className="grid gap-5">
      {hits.map((hit, index) => (
        <ProductListing
          key={`${hit.vendorSlug}-${index}`}
          vendorName={hit.vendorName}
          vendorSlug={hit.vendorSlug}
          logoUrl={hit.logoUrl}
          ratingAvg={hit.ratingAvg}
          reviewCount={hit.reviewCount}
          badge={hit.badge}
          items={[
            {
              name: hit.itemName,
              href: hit.href,
              priceCents: hit.priceCents,
              imageUrl: hit.imageUrl,
            },
          ]}
          markets={hit.markets}
          previewMarkets={2}
          highlightMarketSlug={highlightMarketSlug}
        />
      ))}
    </ul>
  );
}

export function VendorHitList({ vendors }: { vendors: VendorHit[] }) {
  if (!vendors.length) return null;
  return (
    <ul className="grid gap-3">
      {vendors.map((vendor) => (
        <li
          key={vendor.slug}
          className="flex items-center justify-between gap-3 bg-card px-4 py-3 ring-1 ring-board transition-colors hover:bg-secondary/40"
        >
          <div className="flex min-w-0 items-center gap-3">
            <StallEmblem
              src={vendor.logoUrl}
              name={vendor.name}
              kind="vendor"
              size="sm"
              tone="paper"
            />
            <div className="min-w-0">
              <p className="min-w-0">
                <Link
                  href={vendor.href}
                  className="text-base font-medium text-foreground hover:text-primary hover:underline"
                >
                  <VerifiedName slug={vendor.slug} name={vendor.name} />
                </Link>
                <ListingScore
                  parens
                  ratingAvg={vendor.ratingAvg}
                  reviewCount={vendor.reviewCount}
                  className="ml-2 text-stamp"
                />
              </p>
              <Link
                href={vendor.href}
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <span>Open stall &amp; menu</span>
                <CaretRightMark className="size-3" />
              </Link>
            </div>
          </div>
          <SaveButton kind="vendor" slug={vendor.slug} name={vendor.name} size="sm" />
        </li>
      ))}
    </ul>
  );
}
