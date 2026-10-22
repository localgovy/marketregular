"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AddressLink } from "@/components/address-link";
import { BackButton } from "@/components/back-button";
import { Hours } from "@/components/hours";
import { ListingAlsoLinks } from "@/components/listing-also-links";
import {
  ListingContact,
  ListingFacebook,
  ListingInstagram,
  ListingTiktok,
  ListingWebsite,
} from "@/components/listing-contact";
import { ListingPortalCta } from "@/components/listing-portal-cta";
import { ListingReviewGate } from "@/components/listing-review-gate";
import { ListingScore } from "@/components/listing-score";
import {
  BlocksMark,
  CaretRightMark,
  CheckMark,
  CrateMark,
  PlateMark,
  RulesMark,
  SearchMark,
  SlatsMark,
  TagMark,
  WeekMark,
} from "@/components/marks";
import { MenuItemPhoto } from "@/components/menu-item-photo";
import { ProductPhotoFrame } from "@/components/product-photo-frame";
import { ReviewCard } from "@/components/review-card";
import { ProductSaveButton, SaveButton } from "@/components/save-button";
import { TagList } from "@/components/tag-list";
import { VerifiedName } from "@/components/verified-stamp";
import { formatPrice, listingMarkSrc } from "@/lib/format";
import { tagLabel } from "@/lib/find-paths";
import { formatRatingAvg, formatReviewCountShort, listingScore } from "@/lib/listing-score";
import { productFromInput } from "@/lib/product-saves";
import { cn } from "@/lib/utils";
import type {
  VendorPreviewData,
  VendorPreviewMarket,
  VendorPreviewMenuItem,
} from "@/app/preview/_lib/vendor-preview-data";

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
 * Cohesive Stall / Hall Emblem Plate (`StallEmblem`), matching `HomeAtlas`.
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
 * Cohesive square category/aisle thumbnail (`ProductThumb`).
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
    xs: { box: "size-6", px: 24, icon: "size-3.5" },
    sm: { box: "size-9", px: 36, icon: "size-4" },
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
 * masthead bands — avoids red-on-green (`bg-stamp` / `text-muted-foreground`) contrast clashes.
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

function SessionLines({
  hours,
  fallback,
  align = "end",
}: {
  hours: Array<{ day: string; hours: string }>;
  fallback?: string;
  align?: "end" | "stretch";
}) {
  if (!hours.length) {
    return (
      <span className="type-nums whitespace-nowrap text-sm text-muted-foreground">
        {fallback ?? "Seasonal schedule"}
      </span>
    );
  }
  return (
    <ul className="flex flex-col gap-0.5">
      {hours.map((entry) => (
        <li
          key={`${entry.day}-${entry.hours}`}
          className={cn(
            "grid items-baseline gap-x-2",
            align === "end"
              ? "grid-cols-[auto_auto] justify-end"
              : "grid-cols-[minmax(0,1fr)_auto]",
          )}
        >
          <span className="text-sm text-muted-foreground">{entry.day}</span>
          <Hours value={entry.hours} className="text-sm font-medium text-foreground" />
        </li>
      ))}
    </ul>
  );
}

function buildSavedProduct(
  vendor: VendorPreviewData["vendor"],
  markets: VendorPreviewMarket[],
  item: VendorPreviewMenuItem,
  priceCents: number | null,
) {
  return productFromInput({
    vendorSlug: vendor.slug,
    vendorName: vendor.name,
    ratingAvg: vendor.ratingAvg,
    reviewCount: vendor.reviewCount,
    items: [
      {
        name: item.name,
        priceCents,
        href: item.compareHref,
      },
    ],
    markets: markets.slice(0, 3).map((m) => ({
      slug: m.slug,
      name: m.name,
      days: m.days,
      hours: m.hours,
      ratingAvg: m.ratingAvg,
      reviewCount: m.reviewCount,
    })),
  });
}

export function VendorConceptAtlas({
  data,
  storefrontMode = "active",
}: {
  data: VendorPreviewData;
  storefrontMode?: "active" | "live";
}) {
  const {
    vendor,
    menus,
    menuSections,
    dietaryOptions,
    aisleGuides,
    markets,
    similarAisleVendors,
  } = data;
  const homeMarket = markets[0];
  const isSimulated = storefrontMode === "active";

  const [selectedSection, setSelectedSection] = useState<string>("all");
  const [selectedAisleId, setSelectedAisleId] = useState<string>("all");
  const [selectedDietary, setSelectedDietary] = useState<string>("all");
  const [fulfillmentFilter, setFulfillmentFilter] = useState<
    "all" | "pickup" | "preorder" | "delivery"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeHallSlug, setActiveHallSlug] = useState<string>(homeMarket?.slug ?? "");

  const resolvedMenus = useMemo(() => {
    return menus.map((item) => ({
      ...item,
      effectiveCanBuy: isSimulated ? item.activeCanBuy : item.liveCanBuy,
      effectivePriceCents: isSimulated ? item.activePriceCents : item.livePriceCents,
      effectivePickup: isSimulated ? item.activePickup : item.livePickup,
      effectivePreorder: isSimulated ? item.activePreorder : item.livePreorder,
      effectiveDelivery: isSimulated ? item.activeDelivery : item.liveDelivery,
      effectiveTerms: isSimulated ? item.activeTerms : item.liveTerms,
    }));
  }, [menus, isSimulated]);

  const filteredMenus = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return resolvedMenus.filter((item) => {
      if (selectedSection !== "all" && item.section !== selectedSection) return false;
      if (selectedAisleId !== "all" && item.productCategory !== selectedAisleId) return false;
      if (selectedDietary !== "all" && !item.dietary.includes(selectedDietary)) return false;
      if (fulfillmentFilter === "pickup" && !item.effectivePickup) return false;
      if (fulfillmentFilter === "preorder" && !item.effectivePreorder) return false;
      if (fulfillmentFilter === "delivery" && !item.effectiveDelivery) return false;
      if (q) {
        const hay = `${item.name} ${item.description ?? ""} ${item.productCategoryLabel} ${item.section}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [
    resolvedMenus,
    selectedSection,
    selectedAisleId,
    selectedDietary,
    fulfillmentFilter,
    searchQuery,
  ]);

  const groupedMenus = useMemo(() => {
    const map = new Map<string, typeof filteredMenus>();
    for (const item of filteredMenus) {
      const list = map.get(item.section) ?? [];
      list.push(item);
      map.set(item.section, list);
    }
    return [...map.entries()];
  }, [filteredMenus]);

  const activeHall = markets.find((m) => m.slug === activeHallSlug) ?? homeMarket;

  function resetAllFilters() {
    setSelectedSection("all");
    setSelectedAisleId("all");
    setSelectedDietary("all");
    setFulfillmentFilter("all");
    setSearchQuery("");
  }

  const hasActiveFilter =
    selectedSection !== "all" ||
    selectedAisleId !== "all" ||
    selectedDietary !== "all" ||
    fulfillmentFilter !== "all" ||
    searchQuery.trim().length > 0;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-7 sm:px-6">
      {/* Top Status & Aisle Breadcrumb Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <BackButton href={homeMarket ? `/markets/${homeMarket.slug}` : "/markets"} />
          {aisleGuides.slice(0, 2).map((guide, idx) => (
            <Link
              key={guide.id}
              href={guide.href}
              className={cn(
                "stall-chip-sm inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors",
                idx === 0
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-card text-foreground ring-1 ring-border hover:bg-secondary",
              )}
            >
              <TagMark
                className={cn(
                  "size-3.5",
                  idx === 0 ? "text-primary-foreground" : "text-primary",
                )}
              />
              <span>{guide.label}</span>
            </Link>
          ))}
          {markets.slice(0, 2).map((m) => (
            <Link
              key={m.slug}
              href={`/markets/${m.slug}`}
              className="inline-flex items-center gap-1.5 rounded-md bg-card px-3 py-1.5 text-sm font-medium text-foreground ring-1 ring-border hover:bg-secondary"
            >
              <BlocksMark className="size-3.5 text-primary" />
              <span>{m.name}</span>
            </Link>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <span
            className={cn(
              "stall-chip-sm inline-flex items-center gap-1.5 px-3 py-1 text-sm font-medium",
              vendor.openNow || vendor.sellingToday
                ? "bg-stamp text-chalk"
                : "bg-card text-foreground ring-1 ring-border",
            )}
          >
            <WeekMark
              className={cn(
                "size-3.5",
                vendor.openNow || vendor.sellingToday ? "text-chalk" : "text-primary",
              )}
            />
            <span>{vendor.badge}</span>
          </span>
          <Link
            href={`/products?aisle=${encodeURIComponent(vendor.primaryAisleId)}`}
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            <span>Compare {vendor.primaryAisleLabel.toLowerCase()} stalls</span>
            <CaretRightMark className="size-3.5" />
          </Link>
        </div>
      </div>

      {/* Above-the-Fold Dual-Plate Atlas Header */}
      <section className="mt-4 grid gap-5 lg:grid-cols-12">
        {/* Left 7 Cols: Full Forest-Green Enamel Stall Identity & Story Plate */}
        <div className="flex flex-col justify-between bg-primary p-6 text-primary-foreground ring-1 ring-board lg:col-span-7">
          <div>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex min-w-0 flex-1 items-start gap-4">
                <StallEmblem
                  src={vendor.logoUrl}
                  name={vendor.name}
                  kind="vendor"
                  size="lg"
                  tone="chalk"
                  className="mt-0.5"
                />
                <div className="min-w-0 flex-1">
                  <p className="type-kicker text-primary-foreground/90">
                    {vendor.primaryAisleLabel}
                    {vendor.secondaryAisleLabel ? ` · ${vendor.secondaryAisleLabel}` : ""} ·
                    Toronto market stall
                  </p>
                  <h1 className="mt-1 text-primary-foreground">
                    <VerifiedName slug={vendor.slug} name={vendor.name} />
                  </h1>
                  <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
                    <MastheadScore
                      ratingAvg={vendor.ratingAvg}
                      reviewCount={vendor.reviewCount}
                    />
                    <span className="stall-chip-sm inline-flex items-center bg-board/80 px-2.5 py-0.5 text-sm font-medium text-chalk">
                      {vendor.nextSessionSummary}
                    </span>
                  </div>
                </div>
              </div>

              <div className="shrink-0 rounded-md bg-receipt p-1 ring-1 ring-black/15">
                <SaveButton kind="vendor" slug={vendor.slug} name={vendor.name} size="md" />
              </div>
            </div>

            {vendor.about ? (
              <p className="mt-5 text-base leading-relaxed text-primary-foreground/95">
                {vendor.about}
              </p>
            ) : null}

            {vendor.tags.length > 0 ? (
              <div className="mt-5 flex flex-wrap items-center gap-1.5 border-t border-primary-foreground/15 pt-4">
                <span className="mr-1 text-sm font-medium text-primary-foreground/85">
                  Specialties:
                </span>
                {vendor.tags.slice(0, 6).map((tag) => (
                  <span
                    key={tag}
                    className="rounded bg-primary-foreground/15 px-2.5 py-0.5 text-sm font-medium text-primary-foreground"
                  >
                    {tagLabel(tag)}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          {/* Bottom 2-Stamp Census Strip */}
          <div className="mt-6 border-t border-primary-foreground/15 pt-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-primary-foreground/12 px-4 py-2.5">
                <p className="type-census text-2xl text-primary-foreground">{menus.length}</p>
                <p className="text-sm text-primary-foreground/85">Menu items</p>
              </div>
              <div className="rounded-lg bg-primary-foreground/12 px-4 py-2.5">
                <p className="type-census text-2xl text-primary-foreground">{markets.length}</p>
                <p className="text-sm text-primary-foreground/85">
                  Market {markets.length === 1 ? "location" : "locations"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right 5 Cols: Featured Products & Active Market Setup Plate */}
        <div className="flex flex-col justify-between bg-card ring-1 ring-board lg:col-span-5">
          <div>
            {/* Top Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-receipt px-5 py-3">
              <div className="flex items-center gap-2">
                <PlateMark className="size-4 text-primary" />
                <p className="type-kicker font-medium text-foreground">
                  Products &amp; markets
                </p>
              </div>
              <span className="stall-chip-sm bg-stamp px-2.5 py-0.5 text-sm font-medium text-chalk">
                {isSimulated ? "Pickup · Pre-order · Delivery" : "Published menu"}
              </span>
            </div>

            <div className="p-5">
              <ProductPhotoFrame
                name={vendor.primaryAisleLabel}
                photo={vendor.bannerPhoto}
                className="aspect-[16/9] w-full border border-border"
              />

              {activeHall ? (
                <div className="mt-4 bg-receipt p-3.5 ring-1 ring-border shadow-[inset_3px_0_0_var(--primary)]">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3">
                    <div className="flex min-w-0 items-start gap-2.5">
                      <StallEmblem
                        src={activeHall.logoUrl}
                        name={activeHall.name}
                        kind="market"
                        size="sm"
                        tone="paper"
                        className="mt-0.5"
                      />
                      <div className="min-w-0">
                        <p className="type-kicker text-primary">Selected market</p>
                        <Link
                          href={`/markets/${activeHall.slug}`}
                          className="mt-0.5 block text-base font-medium text-foreground hover:text-primary hover:underline"
                        >
                          {activeHall.name}
                        </Link>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {activeHall.neighbourhood}
                          {activeHall.stall ? ` · Stall ${activeHall.stall}` : ""}
                        </p>
                      </div>
                    </div>
                    <SessionLines hours={activeHall.hours} fallback={activeHall.nextOpen} />
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-receipt px-5 py-3 text-sm">
            <span className="font-medium text-muted-foreground">Product categories:</span>
            <div className="flex flex-wrap gap-1.5">
              {aisleGuides.slice(0, 3).map((guide) => (
                <Link
                  key={guide.id}
                  href={guide.href}
                  className="inline-flex items-center gap-1 rounded bg-card px-2.5 py-1 font-medium text-foreground ring-1 ring-border hover:bg-primary hover:text-primary-foreground"
                >
                  <span>{guide.label}</span>
                  <span className="type-nums text-muted-foreground">
                    ({guide.itemCountOnMenu})
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Synchronized 12-Column Menu (8 Cols) & Markets / Fellow Stalls Rail (4 Cols) */}
      <div className="mt-8 grid gap-8 lg:grid-cols-12 lg:items-start">
        {/* Left 8 Columns: Stall Menu */}
        <div className="flex flex-col gap-8 lg:col-span-8">
          {/* Filterable Menu with Per-Item Category & Search Links */}
          <section id="menu" className="bg-card p-5 ring-1 ring-board sm:p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-4">
              <div>
                <p className="type-kicker text-primary">Menu &amp; products</p>
                <h2 className="mt-0.5">What {vendor.name} sells</h2>
              </div>
              <div className="flex items-center gap-3">
                {hasActiveFilter ? (
                  <button
                    type="button"
                    onClick={resetAllFilters}
                    className="cursor-pointer text-sm font-medium text-primary hover:underline"
                  >
                    Reset filters
                  </button>
                ) : null}
                <span className="type-nums text-sm text-muted-foreground">
                  Showing {filteredMenus.length} of {menus.length} items
                </span>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="mt-4 flex flex-col gap-3 border-b border-border pb-4">
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                <label className="flex items-center gap-2.5 bg-receipt px-3.5 py-2 ring-1 ring-border focus-within:ring-2 focus-within:ring-primary">
                  <SearchMark className="size-4 shrink-0 text-muted-foreground" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={`Search ${vendor.name}'s ${menus.length} items…`}
                    className="w-full bg-transparent text-base text-foreground placeholder:text-muted-foreground focus:outline-none"
                  />
                </label>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={resetAllFilters}
                    className={cn(
                      "stall-chip-sm cursor-pointer px-3 py-1.5 text-sm font-medium transition-colors",
                      !hasActiveFilter
                        ? "bg-stamp text-chalk"
                        : "bg-secondary text-foreground hover:bg-secondary/80",
                    )}
                  >
                    All ({menus.length})
                  </button>
                  {aisleGuides.map((guide) => (
                    <button
                      key={guide.id}
                      type="button"
                      onClick={() =>
                        setSelectedAisleId(selectedAisleId === guide.id ? "all" : guide.id)
                      }
                      className={cn(
                        "stall-chip-sm inline-flex cursor-pointer items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors",
                        selectedAisleId === guide.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-foreground hover:bg-secondary/80",
                      )}
                    >
                      <span>{guide.label}</span>
                      <span
                        className={cn(
                          "type-nums text-sm",
                          selectedAisleId === guide.id
                            ? "text-primary-foreground/85"
                            : "text-muted-foreground",
                        )}
                      >
                        ({guide.itemCountOnMenu})
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Section Tabs + Fulfillment & Dietary Filters */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                {menuSections.length > 1 ? (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="mr-1 text-sm text-muted-foreground">Section:</span>
                    {menuSections.map((sec) => (
                      <button
                        key={sec}
                        type="button"
                        onClick={() =>
                          setSelectedSection(selectedSection === sec ? "all" : sec)
                        }
                        className={cn(
                          "cursor-pointer rounded px-2.5 py-1 text-sm font-medium transition-colors",
                          selectedSection === sec
                            ? "bg-board text-chalk"
                            : "bg-receipt text-foreground ring-1 ring-border hover:bg-secondary",
                        )}
                      >
                        {sec}
                      </button>
                    ))}
                  </div>
                ) : null}

                <div className="flex flex-wrap items-center gap-1.5">
                  {(
                    [
                      { id: "pickup", label: "Pickup" },
                      { id: "preorder", label: "Pre-order" },
                      { id: "delivery", label: "Delivery" },
                    ] as const
                  ).map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() =>
                        setFulfillmentFilter(fulfillmentFilter === mode.id ? "all" : mode.id)
                      }
                      className={cn(
                        "cursor-pointer rounded px-2.5 py-1 text-sm font-medium transition-colors",
                        fulfillmentFilter === mode.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-receipt text-muted-foreground ring-1 ring-border hover:text-foreground",
                      )}
                    >
                      {mode.label}
                    </button>
                  ))}

                  {dietaryOptions.map((diet) => (
                    <button
                      key={diet}
                      type="button"
                      onClick={() =>
                        setSelectedDietary(selectedDietary === diet ? "all" : diet)
                      }
                      className={cn(
                        "cursor-pointer rounded px-2.5 py-1 text-sm font-medium transition-colors",
                        selectedDietary === diet
                          ? "bg-stamp text-chalk"
                          : "bg-receipt text-muted-foreground ring-1 ring-border hover:text-foreground",
                      )}
                    >
                      {diet.replaceAll("-", " ")}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Menu Sections */}
            {groupedMenus.length === 0 ? (
              <div className="mt-6 bg-receipt p-6 text-center ring-1 ring-border">
                <p className="text-base font-medium text-foreground">
                  No menu items match that filter combination.
                </p>
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="mt-3 cursor-pointer rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Show all {menus.length} stall items
                </button>
              </div>
            ) : (
              <div className="mt-5 flex flex-col gap-6">
                {groupedMenus.map(([sectionName, sectionItems]) => (
                  <div key={sectionName}>
                    <div className="flex items-center justify-between gap-2 border-b border-border pb-2">
                      <div className="flex items-center gap-2">
                        <CrateMark className="size-4 text-primary" />
                        <h3>{sectionName}</h3>
                      </div>
                      <span className="type-nums text-sm text-muted-foreground">
                        {sectionItems.length} {sectionItems.length === 1 ? "item" : "items"}
                      </span>
                    </div>

                    <ul className="mt-2.5 bg-receipt ring-1 ring-border shadow-[inset_3px_0_0_var(--primary)]">
                      {sectionItems.map((item) => {
                        const priceLabel = formatPrice(
                          item.effectivePriceCents ?? item.activePriceCents,
                        );
                        const savedProduct = buildSavedProduct(
                          vendor,
                          markets,
                          item,
                          item.effectivePriceCents ?? item.activePriceCents,
                        );

                        return (
                          <li
                            key={item.id}
                            className="border-b border-dashed border-border px-4 py-4 transition-colors last:border-b-0 hover:bg-card/60"
                          >
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                              <div className="flex min-w-0 items-start gap-3.5">
                                <MenuItemPhoto url={item.imageUrl} menuId={item.id} />
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-base font-medium text-foreground">
                                      {item.name}
                                    </p>
                                    <Link
                                      href={item.aisleHref}
                                      className="rounded bg-card px-2 py-0.5 text-sm font-medium text-muted-foreground ring-1 ring-border hover:text-foreground"
                                    >
                                      {item.productCategoryLabel}
                                    </Link>
                                    {item.season ? (
                                      <span className="text-sm text-muted-foreground">
                                        · {item.season}
                                      </span>
                                    ) : null}
                                  </div>

                                  {item.description ? (
                                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                                      {item.description}
                                    </p>
                                  ) : null}

                                  {item.dietary.length > 0 ? (
                                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                                      {item.dietary.map((d) => (
                                        <span
                                          key={d}
                                          className="rounded bg-secondary px-2 py-0.5 text-sm text-foreground"
                                        >
                                          {d.replaceAll("-", " ")}
                                        </span>
                                      ))}
                                    </div>
                                  ) : null}

                                  <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
                                    {item.effectivePickup ? (
                                      <span className="inline-flex items-center gap-1 font-medium text-primary">
                                        <CheckMark className="size-3.5" />
                                        <span>
                                          Market pickup
                                          {item.effectiveDelivery ? " & delivery" : " & pre-order"}
                                        </span>
                                      </span>
                                    ) : null}
                                    <Link
                                      href={item.compareHref}
                                      className="inline-flex items-center gap-1 font-medium text-foreground underline decoration-foreground/35 underline-offset-4 hover:text-primary"
                                    >
                                      <span>{item.compareLabel}</span>
                                      <CaretRightMark className="size-3" />
                                    </Link>
                                  </div>
                                </div>
                              </div>

                              {/* Right Column: Price Stamp, Save, & Buy Control */}
                              <div className="flex flex-row items-center justify-between gap-2 sm:flex-col sm:items-end">
                                <div className="flex items-center gap-2">
                                  {priceLabel ? (
                                    <span className="stall-chip-sm type-nums shrink-0 whitespace-nowrap bg-stamp px-2.5 py-0.5 text-sm font-medium text-chalk">
                                      {priceLabel}
                                    </span>
                                  ) : null}
                                  {savedProduct ? (
                                    <ProductSaveButton product={savedProduct} size="sm" />
                                  ) : null}
                                </div>

                                {item.effectiveCanBuy ? (
                                  <Link
                                    href={`/vendors/${vendor.slug}/buy/${item.id}`}
                                    className="stall-chip-sm inline-flex items-center gap-1.5 bg-primary px-3 py-1 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                                  >
                                    <span>Buy now</span>
                                    <CaretRightMark className="size-3" />
                                  </Link>
                                ) : null}
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right 4 Columns: Interactive Markets & Fellow Stalls Rail */}
        <aside className="flex flex-col gap-6 lg:sticky lg:top-20 lg:col-span-4">
          <div className="bg-card ring-1 ring-board">
            {/* Rail Header Band */}
            <div className="flex items-center justify-between gap-2 border-b border-black/15 bg-primary px-5 py-3.5 text-primary-foreground">
              <div className="flex items-center gap-2">
                <SlatsMark className="size-4 text-primary-foreground" />
                <h2 className="text-xl text-primary-foreground">Where they sell</h2>
              </div>
              <span className="stall-chip-sm type-nums bg-board/80 px-2.5 py-0.5 text-sm font-medium text-chalk">
                {markets.length} {markets.length === 1 ? "market" : "markets"}
              </span>
            </div>

            <div className="p-5">
              <p className="text-sm text-muted-foreground">
                Select a market to inspect {vendor.name}&apos;s hours and fellow stalls selling
                alongside them.
              </p>

              {/* Market Selector Pills (up to 4 quick pills + full selector if more) */}
              {markets.length > 1 ? (
                <div className="mt-3 flex flex-col gap-2">
                  <div className="flex flex-wrap gap-1.5">
                    {markets.slice(0, 4).map((m) => (
                      <button
                        key={m.slug}
                        type="button"
                        onClick={() => setActiveHallSlug(m.slug)}
                        className={cn(
                          "cursor-pointer rounded px-2.5 py-1 text-left text-sm font-medium transition-colors",
                          activeHall?.slug === m.slug
                            ? "bg-primary text-primary-foreground"
                            : "bg-receipt text-foreground ring-1 ring-border hover:bg-secondary",
                        )}
                      >
                        {m.name}
                      </button>
                    ))}
                  </div>
                  {markets.length > 4 ? (
                    <select
                      aria-label="Choose market location"
                      value={activeHall?.slug ?? ""}
                      onChange={(e) => setActiveHallSlug(e.target.value)}
                      className="w-full rounded bg-receipt px-3 py-1.5 text-sm font-medium text-foreground ring-1 ring-border"
                    >
                      {markets.map((m) => (
                        <option key={m.slug} value={m.slug}>
                          {m.name} ({m.neighbourhood})
                        </option>
                      ))}
                    </select>
                  ) : null}
                </div>
              ) : null}

              {/* Active Market Hall Card */}
              {activeHall ? (
                <div className="mt-4 bg-receipt p-4 ring-1 ring-border">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <StallEmblem
                        src={activeHall.logoUrl}
                        name={activeHall.name}
                        kind="market"
                        size="md"
                        tone="paper"
                      />
                      <div className="min-w-0">
                        <Link
                          href={`/markets/${activeHall.slug}`}
                          className="text-base font-medium text-foreground hover:text-primary hover:underline"
                        >
                          {activeHall.name}
                        </Link>
                        <ListingScore
                          className="mt-0.5 text-sm"
                          ratingAvg={activeHall.ratingAvg}
                          reviewCount={activeHall.reviewCount}
                        />
                        <p className="mt-1 text-sm text-muted-foreground">
                          <AddressLink
                            address={activeHall.address}
                            city={activeHall.city}
                            province={activeHall.province}
                            lat={activeHall.lat}
                            lng={activeHall.lng}
                          />
                          {activeHall.stall ? ` · Stall ${activeHall.stall}` : ""}
                        </p>
                      </div>
                    </div>
                    <SaveButton
                      kind="market"
                      slug={activeHall.slug}
                      name={activeHall.name}
                      size="sm"
                    />
                  </div>

                  <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 border-t border-dashed border-border pt-3">
                    <span className="text-sm font-medium text-muted-foreground">Hall hours</span>
                    <SessionLines hours={activeHall.hours} fallback={activeHall.nextOpen} />
                  </div>

                  {/* Fellow Stalls at Selected Hall */}
                  {activeHall.fellowVendors.length > 0 ? (
                    <div className="mt-4 border-t border-dashed border-border pt-3.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-foreground">
                          Fellow stalls at {activeHall.name}
                        </p>
                        <Link
                          href={`/markets/${activeHall.slug}`}
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          Full roster →
                        </Link>
                      </div>
                      <ul className="mt-2.5 divide-y divide-dashed divide-border">
                        {activeHall.fellowVendors.slice(0, 5).map((fellow) => (
                          <li
                            key={fellow.slug}
                            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 py-2"
                          >
                            <div className="flex min-w-0 items-center gap-2.5">
                              <StallEmblem
                                src={fellow.logoUrl}
                                name={fellow.name}
                                kind="vendor"
                                size="sm"
                                tone="paper"
                              />
                              <div className="min-w-0">
                                <Link
                                  href={`/vendors/${fellow.slug}`}
                                  className="block text-sm font-medium text-foreground hover:text-primary hover:underline"
                                >
                                  {fellow.name}
                                </Link>
                                <p className="text-sm text-muted-foreground">
                                  {fellow.aisleLabel}
                                  {fellow.stall ? ` · Stall ${fellow.stall}` : ""}
                                </p>
                              </div>
                            </div>
                            <Link
                              href={`/vendors/${fellow.slug}`}
                              className="rounded bg-card px-2.5 py-1 text-sm font-medium text-foreground ring-1 ring-border hover:bg-secondary"
                            >
                              Visit
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {/* All Halls Compact Timetable */}
              {markets.length > 1 ? (
                <div className="mt-4 border-t border-border pt-4">
                  <p className="text-sm font-medium text-foreground">
                    All market halls &amp; hours
                  </p>
                  <ul className="mt-2 divide-y divide-dashed divide-border">
                    {markets.map((m) => (
                      <li
                        key={m.id}
                        className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 py-2 text-sm"
                      >
                        <button
                          type="button"
                          onClick={() => setActiveHallSlug(m.slug)}
                          className={cn(
                            "cursor-pointer text-left font-medium hover:text-primary hover:underline",
                            activeHall?.slug === m.slug ? "text-primary" : "text-foreground",
                          )}
                        >
                          {m.name}
                        </button>
                        <SessionLines hours={m.hours} fallback={m.nextOpen} />
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>

          <div className="bg-card p-5 text-foreground ring-1 ring-board">
            <h3>Contact &amp; direct links</h3>
            <ListingContact
              phone={vendor.contact.phone}
              email={vendor.contact.email}
              heading={false}
            />
            <ListingWebsite href={vendor.contact.website} />
            <ListingInstagram href={vendor.contact.instagram} />
            <ListingTiktok href={vendor.contact.tiktok} />
            <ListingFacebook href={vendor.contact.facebook} />
            {vendor.tags.length > 0 ? (
              <div className="mt-4 border-t border-dashed border-border pt-4">
                <p className="mb-2 text-sm font-medium text-muted-foreground">
                  Stall specialties &amp; tags
                </p>
                <TagList tags={vendor.tags} />
              </div>
            ) : null}
          </div>

          <div id="account">
            <ListingPortalCta kind="vendor" listingId={vendor.id} taken={vendor.claimed} />
          </div>
        </aside>
      </div>

      {/* Bottom Discovery Spread: Similar Stalls + Broad Product Guides */}
      <section className="mt-10 bg-card p-5 ring-1 ring-board sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-4">
          <div>
            <p className="type-kicker text-primary">More stalls to explore</p>
            <h2 className="mt-0.5">
              Other stalls known for {vendor.primaryAisleLabel.toLowerCase()}
            </h2>
          </div>
          <Link
            href={`/products?aisle=${encodeURIComponent(vendor.primaryAisleId)}`}
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            <span>Browse all {vendor.primaryAisleLabel.toLowerCase()} stalls</span>
            <CaretRightMark className="size-3.5" />
          </Link>
        </div>

        <ul className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {similarAisleVendors.slice(0, 3).map((peer) => (
            <li
              key={peer.slug}
              className="flex flex-col justify-between bg-card ring-1 ring-board"
            >
              <div>
                {/* 1. Peer Stall Plate Header */}
                <div className="flex items-start justify-between gap-2.5 border-b border-border bg-receipt px-4 py-3.5">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <StallEmblem
                      src={peer.logoUrl}
                      name={peer.name}
                      kind="vendor"
                      size="md"
                      tone="paper"
                      className="mt-0.5"
                    />
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/vendors/${peer.slug}`}
                        className="block text-base font-medium text-foreground hover:text-primary hover:underline"
                      >
                        <VerifiedName slug={peer.slug} name={peer.name} />
                      </Link>
                      <ListingScore
                        className="mt-1 text-sm"
                        ratingAvg={peer.ratingAvg}
                        reviewCount={peer.reviewCount}
                      />
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <span className="stall-chip-sm bg-secondary px-2 py-0.5 text-sm font-medium text-foreground">
                          {peer.primaryAisleLabel}
                        </span>
                        {peer.sharedMarketName ? (
                          <span className="text-sm text-primary">
                            · Also at {peer.sharedMarketName}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <SaveButton kind="vendor" slug={peer.slug} name={peer.name} size="sm" />
                </div>

                {/* 2. Featured Products Banner + Seeded Items */}
                <div className="border-b border-border bg-secondary/50">
                  <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-3 border-b border-border bg-card px-4 py-2.5">
                    <Link href={`/vendors/${peer.slug}`} className="block">
                      <ProductPhotoFrame
                        name={peer.primaryAisleLabel}
                        decorative
                        photo={
                          peer.photoUrl
                            ? {
                                url: peer.photoUrl,
                                alt: peer.photoAlt ?? peer.primaryAisleLabel,
                              }
                            : null
                        }
                        className="h-12 w-[4.5rem] aspect-auto border border-border"
                      />
                    </Link>
                    <div className="flex items-baseline justify-between gap-2">
                      <div>
                        <p className="type-kicker font-medium text-foreground">Menu highlights</p>
                        <p className="text-sm text-muted-foreground">{peer.badge}</p>
                      </div>
                      <Link
                        href={`/vendors/${peer.slug}`}
                        className="shrink-0 text-sm font-medium text-primary hover:underline"
                      >
                        Stall menu →
                      </Link>
                    </div>
                  </div>

                  {peer.items.length > 0 ? (
                    <ul className="bg-receipt">
                      {peer.items.slice(0, 3).map((pi) => (
                        <li
                          key={pi.name}
                          className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-2 border-t border-dashed border-border px-4 py-2 text-sm first:border-t-0"
                        >
                          <Link
                            href={pi.href}
                            className="font-medium text-foreground hover:text-primary hover:underline"
                          >
                            {pi.name}
                          </Link>
                          {pi.priceCents != null ? (
                            <span className="type-nums font-medium text-stamp">
                              {formatPrice(pi.priceCents)}
                            </span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </div>

              {/* 3. Where They Sell */}
              {peer.markets[0] ? (
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 bg-card px-4 py-3 text-sm">
                  <Link
                    href={`/markets/${peer.markets[0].slug}`}
                    className="font-medium text-foreground hover:text-primary hover:underline"
                  >
                    {peer.markets[0].name}
                  </Link>
                  <SessionLines hours={peer.markets[0].hours.slice(0, 1)} />
                </div>
              ) : null}
            </li>
          ))}
        </ul>

        {/* Broad Product Guides & Categories */}
        <div className="mt-6 border-t border-dashed border-border pt-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <p className="type-kicker text-primary">Product categories &amp; guides</p>
              <h3 className="mt-0.5">
                Compare Toronto market stalls by category
              </h3>
            </div>
            <Link
              href="/products"
              className="inline-flex items-center gap-1.5 rounded bg-primary px-3.5 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <span>All product categories</span>
              <CaretRightMark className="size-3.5" />
            </Link>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {aisleGuides.slice(0, 3).map((guide) => (
              <div
                key={guide.id}
                className="flex flex-col justify-between bg-receipt p-4 ring-1 ring-border"
              >
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <ProductThumb src={guide.photoUrl} size="sm" />
                      <div>
                        <Link
                          href={guide.href}
                          className="text-base font-medium text-foreground hover:text-primary hover:underline"
                        >
                          {guide.label}
                        </Link>
                        <p className="type-nums text-sm text-muted-foreground">
                          {guide.itemCountOnMenu}{" "}
                          {guide.itemCountOnMenu === 1 ? "item" : "items"} on this menu
                        </p>
                      </div>
                    </div>
                    <Link
                      href={guide.href}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      Browse →
                    </Link>
                  </div>

                  {guide.findPages.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-1.5 border-t border-dashed border-border pt-3">
                      {guide.findPages.slice(0, 4).map((fp) => (
                        <Link
                          key={fp.slug}
                          href={fp.href}
                          className="inline-flex items-center gap-1 rounded bg-card px-2.5 py-1 text-sm font-medium text-foreground ring-1 ring-border hover:bg-secondary"
                        >
                          <span>{fp.term}</span>
                          <span className="type-nums text-muted-foreground">
                            ({fp.vendorsCount})
                          </span>
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Shopper Floor Notes & Reviews */}
      <section className="mt-8 bg-card p-5 ring-1 ring-board sm:p-6">
        <h2>Shopper notes &amp; reviews</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Notes from regulars who stopped by {vendor.name}.
        </p>
        <ListingReviewGate
          hasFeed={data.feed.length > 0}
          next={`/vendors/${vendor.slug}`}
          canCompose={markets.length > 0}
          markets={data.geoMarkets}
          stalls={data.gateStalls}
          initialMarketId={markets[0]?.id}
          initialVendorId={vendor.id}
        />
        {data.feed.length > 0 ? (
          <ol className="mt-4">
            {data.feed.map((item) => (
              <ReviewCard key={item.id} item={item} />
            ))}
          </ol>
        ) : null}
      </section>

      <div className="mt-10">
        <ListingAlsoLinks
          heading="Explore more market days & specialties"
          weekdays={markets.flatMap((m) => m.days)}
          tags={vendor.tags}
        />
      </div>
    </div>
  );
}
