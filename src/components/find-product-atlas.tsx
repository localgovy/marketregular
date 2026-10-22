"use client";

import { useState } from "react";
import Link from "next/link";
import { BackButton } from "@/components/back-button";
import { Hours } from "@/components/hours";
import { ListingScore } from "@/components/listing-score";
import {
  BlocksMark,
  CaretRightMark,
  PlateMark,
  SlatsMark,
  TagMark,
  WeekMark,
} from "@/components/marks";
import { ProductPhotoFrame } from "@/components/product-photo-frame";
import { StallEmblem } from "@/components/product-results";
import { SortableFindVendors } from "@/components/product-sort-list";
import { SaveButton } from "@/components/save-button";
import { formatPrice } from "@/lib/format";
import { LAUNCH_CITY } from "@/lib/launch";
import type { FindProductAtlasData } from "@/lib/products-atlas-data";
import { cn } from "@/lib/utils";

function directPublicImageSrc(src: string | null | undefined): string | null {
  if (!src) return null;
  if (src.includes("/storage/v1/render/image/") || src.startsWith("/_next/image")) {
    return null;
  }
  return src;
}

function ProductThumb({
  src,
  size = "sm",
  className,
}: {
  src: string | null | undefined;
  size?: "xs" | "sm";
  className?: string;
}) {
  const safeSrc = directPublicImageSrc(src);
  const [failed, setFailed] = useState(false);
  const show = Boolean(safeSrc && !failed);

  const spec = {
    xs: { box: "size-6", px: 24, icon: "size-3.5" },
    sm: { box: "size-9", px: 36, icon: "size-4" },
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

export function FindProductAtlas({ data }: { data: FindProductAtlasData }) {
  const [selectedMarketSlug, setSelectedMarketSlug] = useState<string | null>(null);

  const minPriceLabel = formatPrice(data.stats.minPriceCents);
  const maxPriceLabel = formatPrice(data.stats.maxPriceCents);
  const priceSummary =
    !data.alcohol && minPriceLabel
      ? maxPriceLabel && data.stats.maxPriceCents !== data.stats.minPriceCents
        ? `${minPriceLabel} – ${maxPriceLabel}`
        : `From ${minPriceLabel}`
      : null;

  const aisleHref = `/products?aisle=${encodeURIComponent(data.category)}`;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-7 sm:px-6">
      {/* Top Status & Category Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <BackButton href="/products" />
          <Link
            href={aisleHref}
            className="stall-chip-sm inline-flex items-center gap-1.5 bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <TagMark className="size-3.5 text-primary-foreground" />
            <span>{data.categoryLabel}</span>
          </Link>
          {data.siblingGuides.slice(0, 3).map((sibling) => (
            <Link
              key={sibling.slug}
              href={`/find/${sibling.slug}`}
              className="stall-chip-sm inline-flex items-center gap-1.5 bg-card px-3 py-1.5 text-sm font-medium text-foreground ring-1 ring-border transition-colors hover:bg-secondary"
            >
              <span>{sibling.term}</span>
              <span className="type-nums text-muted-foreground">({sibling.vendors})</span>
            </Link>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {data.stats.todayVendorsCount > 0 ? (
            <span className="stall-chip-sm inline-flex items-center gap-1.5 bg-stamp px-3 py-1 text-sm font-medium text-chalk">
              <WeekMark className="size-3.5 text-chalk" />
              <span>
                {data.stats.todayVendorsCount}{" "}
                {data.stats.todayVendorsCount === 1
                  ? "stall selling today"
                  : "stalls selling today"}
              </span>
            </span>
          ) : (
            <span className="stall-chip-sm inline-flex items-center gap-1.5 bg-card px-3 py-1 text-sm font-medium text-foreground ring-1 ring-border">
              <BlocksMark className="size-3.5 text-primary" />
              <span>
                {data.stats.marketsCount}{" "}
                {data.stats.marketsCount === 1 ? "Toronto market" : "Toronto markets"}
              </span>
            </span>
          )}
          <Link
            href="/products"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            <span>All product categories</span>
            <CaretRightMark className="size-3.5" />
          </Link>
        </div>
      </div>

      {/* Above-the-Fold Dual-Plate Product Masthead */}
      <section className="mt-4 grid gap-5 lg:grid-cols-12">
        {/* Left 7 Cols: Forest-Green Product Identity & Price/Market Census Plate */}
        <div className="flex flex-col justify-between bg-primary p-6 text-primary-foreground ring-1 ring-board lg:col-span-7">
          <div>
            <p className="type-kicker text-primary-foreground/90">
              {data.categoryLabel} · {LAUNCH_CITY} market product guide
            </p>
            <h1 className="mt-1 text-primary-foreground">{data.title}</h1>

            {/* Price & Menu Transparency Strip */}
            {!data.alcohol ? (
              <div className="mt-3 flex flex-wrap items-center gap-2.5">
                {priceSummary ? (
                  <>
                    <span className="stall-chip-sm type-nums inline-flex items-center bg-stamp px-3 py-1 text-sm font-medium text-chalk">
                      {priceSummary}
                    </span>
                    <span className="text-sm font-medium text-primary-foreground/90">
                      {data.stats.pricedVendorsCount}{" "}
                      {data.stats.pricedVendorsCount === 1
                        ? "stall lists menu prices"
                        : "stalls list menu prices"}{" "}
                      · Prices show when the vendor has added them.
                    </span>
                  </>
                ) : (
                  <span className="stall-chip-sm inline-flex items-center bg-board/80 px-3 py-1 text-sm font-medium text-chalk">
                    Prices show when the vendor has added them.
                  </span>
                )}
              </div>
            ) : null}

            <p className="type-lede mt-4 text-primary-foreground/95">
              {data.term} from stalls at {LAUNCH_CITY} farmers&apos; markets. These vendors list
              it, with the markets and days where they sell.
            </p>

            {/* Related Category Varieties Strip */}
            {data.siblingGuides.length > 0 ? (
              <div className="mt-5 flex flex-wrap items-center gap-1.5 border-t border-primary-foreground/15 pt-4">
                <span className="mr-1 text-sm font-medium text-primary-foreground/85">
                  Also in {data.categoryLabel.toLowerCase()}:
                </span>
                {data.siblingGuides.slice(0, 5).map((sibling) => (
                  <Link
                    key={sibling.slug}
                    href={`/find/${sibling.slug}`}
                    className="rounded bg-primary-foreground/15 px-2.5 py-0.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-receipt hover:text-primary"
                  >
                    {sibling.term}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>

          {/* Bottom 3-Stamp Census Strip */}
          <div className="mt-6 border-t border-primary-foreground/15 pt-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-primary-foreground/12 px-3.5 py-2.5">
                <p className="type-census text-2xl text-primary-foreground sm:text-3xl">
                  {data.stats.vendorsCount}
                </p>
                <p className="text-sm text-primary-foreground/85">
                  {data.stats.vendorsCount === 1 ? "Stall listing it" : "Stalls listing it"}
                </p>
              </div>
              <div className="rounded-lg bg-primary-foreground/12 px-3.5 py-2.5">
                <p className="type-census text-2xl text-primary-foreground sm:text-3xl">
                  {data.stats.itemsCount}
                </p>
                <p className="text-sm text-primary-foreground/85">
                  Menu {data.stats.itemsCount === 1 ? "variety" : "varieties"}
                </p>
              </div>
              <div className="rounded-lg bg-primary-foreground/12 px-3.5 py-2.5">
                <p className="type-census text-2xl text-primary-foreground sm:text-3xl">
                  {data.stats.marketsCount}
                </p>
                <p className="text-sm text-primary-foreground/85">
                  {LAUNCH_CITY} {data.stats.marketsCount === 1 ? "market" : "markets"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right 5 Cols: Product Hero Photo & Top Markets Filter Plate */}
        <div className="flex flex-col justify-between bg-card ring-1 ring-board lg:col-span-5">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-receipt px-5 py-3">
              <div className="flex items-center gap-2">
                <PlateMark className="size-4 text-primary" />
                <p className="type-kicker font-medium text-foreground">
                  Product &amp; market availability
                </p>
              </div>
              <span className="stall-chip-sm bg-stamp px-2.5 py-0.5 text-sm font-medium text-chalk">
                {data.cleanTerm}
              </span>
            </div>

            <div className="p-5">
              <ProductPhotoFrame
                name={data.cleanTerm}
                photo={data.heroPhoto}
                className="aspect-[16/9] w-full border border-border"
              />

              {data.markets.length > 0 ? (
                <div className="mt-4 bg-receipt p-3.5 ring-1 ring-border shadow-[inset_3px_0_0_var(--primary)]">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="type-kicker text-primary">
                      Top markets for {data.cleanTerm.toLowerCase()}
                    </p>
                    {selectedMarketSlug ? (
                      <button
                        type="button"
                        onClick={() => setSelectedMarketSlug(null)}
                        className="cursor-pointer text-sm font-medium text-stamp hover:underline"
                      >
                        Show all markets
                      </button>
                    ) : null}
                  </div>

                  <ul className="mt-2 divide-y divide-dashed divide-border">
                    {data.markets.slice(0, 3).map((market) => {
                      const active = selectedMarketSlug === market.slug;
                      return (
                        <li
                          key={market.slug}
                          className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 py-2 first:pt-1 last:pb-0"
                        >
                          <div className="flex min-w-0 items-center gap-2.5">
                            <StallEmblem
                              src={market.logoUrl}
                              name={market.name}
                              kind="market"
                              size="xs"
                              tone="paper"
                            />
                            <div className="min-w-0">
                              <Link
                                href={`/markets/${market.slug}`}
                                className="block text-sm font-medium text-foreground hover:text-primary hover:underline"
                              >
                                {market.name}
                              </Link>
                              {market.hours[0] ? (
                                <p className="text-sm text-muted-foreground">
                                  <span>{market.hours[0].day}</span>{" "}
                                  <Hours
                                    value={market.hours[0].hours}
                                    className="text-muted-foreground"
                                  />
                                </p>
                              ) : null}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              setSelectedMarketSlug(active ? null : market.slug)
                            }
                            className={cn(
                              "stall-chip-sm cursor-pointer px-2.5 py-1 text-sm font-medium transition-colors",
                              active
                                ? "bg-primary text-primary-foreground"
                                : "bg-card text-foreground ring-1 ring-border hover:bg-secondary",
                            )}
                          >
                            {active
                              ? "Selected"
                              : `${market.vendorCount} ${market.vendorCount === 1 ? "stall" : "stalls"}`}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-receipt px-5 py-3 text-sm">
            <span className="font-medium text-muted-foreground">Category aisle:</span>
            <Link
              href={aisleHref}
              className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
            >
              <span>Browse all {data.categoryLabel.toLowerCase()}</span>
              <CaretRightMark className="size-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Synchronized 12-Column Stall Comparison (8 Cols) & Markets / Sibling Guides Rail (4 Cols) */}
      <div className="mt-8 grid gap-8 lg:grid-cols-12 lg:items-start">
        {/* Left 8 Columns: Interactive Stall & Menu Comparison List */}
        <div className="flex flex-col gap-8 lg:col-span-8">
          <SortableFindVendors
            vendors={data.vendors}
            today={data.today}
            selectedMarketSlug={selectedMarketSlug}
            onSelectMarketSlug={setSelectedMarketSlug}
            productTerm={data.cleanTerm}
          />
        </div>

        {/* Right 4 Columns: Sticky Market Filter Rail & Sibling Product Guides */}
        <aside className="flex flex-col gap-6 lg:sticky lg:top-20 lg:col-span-4">
          {data.markets.length > 0 ? (
            <div className="bg-card ring-1 ring-board">
              <div className="flex items-center justify-between gap-2 border-b border-black/15 bg-primary px-5 py-3.5 text-primary-foreground">
                <div className="flex items-center gap-2">
                  <SlatsMark className="size-4 text-primary-foreground" />
                  <h2 className="text-xl text-primary-foreground">Where they set up</h2>
                </div>
                <span className="stall-chip-sm type-nums bg-board/80 px-2.5 py-0.5 text-sm font-medium text-chalk">
                  {data.markets.length} {data.markets.length === 1 ? "market" : "markets"}
                </span>
              </div>

              <div className="p-5">
                <p className="text-sm text-muted-foreground">
                  Select a market hall to filter the {data.cleanTerm.toLowerCase()} stalls on the
                  left, or open the market page for directions.
                </p>

                <ul className="mt-3.5 divide-y divide-dashed divide-border">
                  {data.markets.slice(0, 8).map((market) => {
                    const active = selectedMarketSlug === market.slug;
                    return (
                      <li key={market.slug} className="py-3 first:pt-0 last:pb-0">
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
                              <Link
                                href={`/markets/${market.slug}`}
                                className="text-base font-medium text-foreground hover:text-primary hover:underline"
                              >
                                {market.name}
                              </Link>
                              <ListingScore
                                parens
                                ratingAvg={market.ratingAvg}
                                reviewCount={market.reviewCount}
                                className="ml-1.5 text-sm text-stamp"
                              />
                              {market.hours.length > 0 ? (
                                <ul className="mt-1 flex flex-col gap-0.5">
                                  {market.hours.slice(0, 2).map((h) => (
                                    <li
                                      key={`${market.slug}-${h.day}-${h.hours}`}
                                      className="grid grid-cols-[auto_auto] items-baseline justify-start gap-x-2"
                                    >
                                      <span className="text-sm text-muted-foreground">
                                        {h.day}
                                      </span>
                                      <Hours
                                        value={h.hours}
                                        className="text-sm text-foreground"
                                      />
                                    </li>
                                  ))}
                                </ul>
                              ) : null}
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedMarketSlug(active ? null : market.slug)
                              }
                              className={cn(
                                "stall-chip-sm cursor-pointer px-2.5 py-1 text-sm font-medium transition-colors",
                                active
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-receipt text-foreground ring-1 ring-border hover:bg-secondary",
                              )}
                            >
                              {active
                                ? "Showing"
                                : `${market.vendorCount} ${market.vendorCount === 1 ? "stall" : "stalls"}`}
                            </button>
                            <SaveButton
                              kind="market"
                              slug={market.slug}
                              name={market.name}
                              size="sm"
                            />
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          ) : null}

          {/* Sibling & Popular Product Guides Rail Card */}
          <div className="bg-card p-5 ring-1 ring-board">
            <div className="flex items-baseline justify-between gap-2 border-b border-border pb-3">
              <div>
                <p className="type-kicker text-primary">More to compare</p>
                <h3 className="mt-0.5">
                  {data.siblingGuides.length > 0
                    ? `More in ${data.categoryLabel.toLowerCase()}`
                    : "Popular product guides"}
                </h3>
              </div>
              <Link
                href={aisleHref}
                className="text-sm font-medium text-primary hover:underline"
              >
                All →
              </Link>
            </div>

            <ul className="mt-3 divide-y divide-dashed divide-border">
              {(data.siblingGuides.length > 0 ? data.siblingGuides : data.popularGuides)
                .slice(0, 6)
                .map((guide) => (
                  <li key={guide.slug} className="py-2.5 first:pt-0 last:pb-0">
                    <Link
                      href={`/find/${guide.slug}`}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 hover:text-primary"
                    >
                      <span className="flex min-w-0 items-center gap-2.5">
                        <ProductThumb src={guide.photoUrl} size="xs" />
                        <span className="text-base font-medium text-foreground hover:text-primary hover:underline">
                          {guide.term}
                        </span>
                      </span>
                      <span className="type-nums text-sm text-stamp">
                        {guide.vendors} {guide.vendors === 1 ? "stall" : "stalls"}
                      </span>
                    </Link>
                  </li>
                ))}
            </ul>

            <div className="mt-4 border-t border-border pt-3.5">
              <Link
                href="/products"
                className="stall-chip-sm flex h-9 w-full items-center justify-center bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Explore full product catalogue
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
