"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AddressLink } from "@/components/address-link";
import { BackButton } from "@/components/back-button";
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
  TagMark,
  TicketMark,
  WeekMark,
} from "@/components/marks";
import { MenuItemPhoto } from "@/components/menu-item-photo";
import { ProductPhotoFrame, ProductThumb } from "@/components/product-photo-frame";
import { ReviewCard } from "@/components/review-card";
import { ProductSaveButton, SaveButton } from "@/components/save-button";
import { TagList } from "@/components/tag-list";
import { VerifiedName } from "@/components/verified-name";
import { formatPrice } from "@/lib/format";
import { productFromInput } from "@/lib/product-saves";
import { cn } from "@/lib/utils";
import type {
  VendorPreviewData,
  VendorPreviewMarket,
  VendorPreviewMenuItem,
} from "@/app/preview/_lib/vendor-preview-data";

type CatalogueViewMode = "cards" | "receipt";

function StallEmblem({
  name,
  logoUrl,
  size = "md",
}: {
  name: string;
  logoUrl: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const box =
    size === "lg" ? "size-16" : size === "md" ? "size-12" : "size-10";
  const px = size === "lg" ? 64 : size === "md" ? 48 : 40;
  const initials = name
    .split(/[\s&-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  if (logoUrl) {
    return (
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-lg bg-receipt p-1 ring-1 ring-foreground/15",
          box,
        )}
      >
        <img
          src={logoUrl}
          alt={name}
          width={px}
          height={px}
          loading="lazy"
          decoding="async"
          className="size-full object-contain"
        />
      </span>
    );
  }

  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 flex-col items-center justify-center rounded-lg bg-stamp text-chalk ring-1 ring-foreground/15",
        box,
      )}
    >
      <CrateMark className="size-4 text-ticket" />
      <span className="type-nums text-xs leading-none">{initials || "MR"}</span>
    </span>
  );
}

function SessionLines({
  hours,
  fallback,
}: {
  hours: Array<{ day: string; hours: string }>;
  fallback?: string;
}) {
  if (!hours.length) {
    return (
      <span className="type-nums whitespace-nowrap text-sm text-muted-foreground">
        {fallback ?? "Seasonal schedule"}
      </span>
    );
  }
  return (
    <div className="flex flex-col items-end gap-0.5">
      {hours.map((entry) => (
        <span
          key={`${entry.day}-${entry.hours}`}
          className="type-nums whitespace-nowrap text-sm text-foreground"
        >
          <span className="text-muted-foreground">{entry.day}</span> {entry.hours}
        </span>
      ))}
    </div>
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

export function VendorConceptCatalogue({
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
    aisleGuides,
    markets,
    similarAisleVendors,
    coMarketVendors,
  } = data;
  const homeMarket = markets[0];
  const isSimulated = storefrontMode === "active";

  const [viewMode, setViewMode] = useState<CatalogueViewMode>("cards");
  const [selectedAisleFilter, setSelectedAisleFilter] = useState<string>("all");
  const [selectedSection, setSelectedSection] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeExplorerAisleId, setActiveExplorerAisleId] = useState<string>(
    aisleGuides[0]?.id ?? vendor.primaryAisleId,
  );

  // Quick-order state
  const [orderQuantities, setOrderQuantities] = useState<Record<string, number>>(() =>
    menus[0]?.id ? { [menus[0].id]: 1 } : {},
  );
  const [fulfillmentMethod, setFulfillmentMethod] = useState<"pickup" | "preorder" | "delivery">(
    "pickup",
  );

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
      if (selectedAisleFilter !== "all" && item.productCategory !== selectedAisleFilter)
        return false;
      if (selectedSection !== "all" && item.section !== selectedSection) return false;
      if (q) {
        const hay = `${item.name} ${item.description ?? ""} ${item.productCategoryLabel} ${item.section}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [resolvedMenus, selectedAisleFilter, selectedSection, searchQuery]);

  const slipEntries = useMemo(() => {
    return resolvedMenus
      .filter((item) => (orderQuantities[item.id] ?? 0) > 0)
      .map((item) => ({
        item,
        qty: orderQuantities[item.id] ?? 1,
        lineCents:
          (item.effectivePriceCents ?? item.activePriceCents) * (orderQuantities[item.id] ?? 1),
      }));
  }, [resolvedMenus, orderQuantities]);

  const slipTotalCents = slipEntries.reduce((acc, e) => acc + e.lineCents, 0);
  const slipCount = slipEntries.reduce((acc, e) => acc + e.qty, 0);
  const primaryCheckoutItem = slipEntries[0]?.item ?? resolvedMenus[0];

  const activeExplorerGuide =
    aisleGuides.find((g) => g.id === activeExplorerAisleId) ?? aisleGuides[0];

  function adjustQty(menuId: string, delta: number) {
    setOrderQuantities((prev) => {
      const next = Math.max(0, Math.min(20, (prev[menuId] ?? 0) + delta));
      const copy = { ...prev };
      if (next === 0) delete copy[menuId];
      else copy[menuId] = next;
      return copy;
    });
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      {/* Top navigation & quick aisle links */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <BackButton href={homeMarket ? `/markets/${homeMarket.slug}` : "/markets"} />
          <span className="text-sm text-muted-foreground">Stall catalogue in</span>
          {aisleGuides.map((guide) => (
            <Link
              key={guide.id}
              href={guide.href}
              className="inline-flex items-center gap-1.5 rounded-lg bg-card px-3 py-1 text-sm font-medium text-foreground ring-1 ring-border hover:bg-secondary"
            >
              <TagMark className="size-3.5 text-primary" />
              <span>{guide.label}</span>
            </Link>
          ))}
        </div>
        <Link
          href="/products"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          <span>Search all 1,900+ market products</span>
          <CaretRightMark className="size-3.5" />
        </Link>
      </div>

      {/* Split Masthead: Left 7 Cols Identity & Story + Right 5 Cols Signature Table & Quick-Buy */}
      <section className="mt-4 grid gap-6 lg:grid-cols-12">
        {/* Left 7 Columns: Vendor Identity, Story, Census & Direct Links */}
        <div className="flex flex-col justify-between rounded-xl bg-card p-6 ring-1 ring-foreground/10 lg:col-span-7">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm font-medium",
                    vendor.openNow || vendor.sellingToday
                      ? "bg-ticket text-stamp"
                      : "bg-primary text-primary-foreground",
                  )}
                >
                  <WeekMark className="size-3.5" />
                  <span>{vendor.badge}</span>
                </span>
                <span className="text-sm text-muted-foreground">{vendor.nextSessionSummary}</span>
              </div>
              <SaveButton kind="vendor" slug={vendor.slug} name={vendor.name} size="md" />
            </div>

            <div className="mt-4 flex items-start gap-4">
              <StallEmblem name={vendor.name} logoUrl={vendor.logoUrl} size="lg" />
              <div className="min-w-0 flex-1">
                <h1>
                  <VerifiedName name={vendor.name} verified={vendor.claimed} />
                </h1>
                <ListingScore
                  className="mt-1.5 text-base"
                  ratingAvg={vendor.ratingAvg}
                  reviewCount={vendor.reviewCount}
                />
              </div>
            </div>

            {vendor.about ? (
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                {vendor.about}
              </p>
            ) : null}

            {vendor.tags.length > 0 ? (
              <div className="mt-4">
                <TagList tags={vendor.tags} />
              </div>
            ) : null}
          </div>

          {/* 3-Stamp Census Strip + Direct Contact Row */}
          <div className="mt-6 border-t border-dashed border-border pt-5">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-receipt px-3.5 py-2.5 ring-1 ring-border">
                <p className="type-census text-2xl text-foreground">{menus.length}</p>
                <p className="text-sm text-muted-foreground">Catalogue items</p>
              </div>
              <div className="rounded-lg bg-receipt px-3.5 py-2.5 ring-1 ring-border">
                <p className="type-census text-2xl text-primary">{markets.length}</p>
                <p className="text-sm text-muted-foreground">Market halls</p>
              </div>
              <div className="rounded-lg bg-receipt px-3.5 py-2.5 ring-1 ring-border">
                <p className="type-census text-2xl text-foreground">
                  {similarAisleVendors.length}
                </p>
                <p className="text-sm text-muted-foreground">Peer aisle stalls</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              <ListingContact phone={vendor.contact.phone} email={vendor.contact.email} />
              <ListingWebsite href={vendor.contact.website} />
              <ListingInstagram href={vendor.contact.instagram} />
              <ListingTiktok href={vendor.contact.tiktok} />
              <ListingFacebook href={vendor.contact.facebook} />
            </div>
          </div>
        </div>

        {/* Right 5 Columns: Signature Table Showcase & Express Order Card */}
        <div className="flex flex-col justify-between rounded-xl bg-primary p-5 text-primary-foreground ring-2 ring-foreground/15 sm:p-6 lg:col-span-5">
          <div>
            <div className="flex items-center justify-between gap-2">
              <p className="type-kicker text-ticket">Featured stall table</p>
              <Link
                href={`/products?aisle=${encodeURIComponent(vendor.primaryAisleId)}`}
                className="text-sm font-medium text-primary-foreground/90 underline decoration-primary-foreground/40 underline-offset-4 hover:text-ticket"
              >
                {vendor.primaryAisleLabel} guide →
              </Link>
            </div>

            <div className="mt-3">
              <ProductPhotoFrame
                url={vendor.bannerPhoto?.url}
                alt={vendor.bannerPhoto?.alt ?? vendor.primaryAisleLabel}
                Mark={PlateMark}
                className="aspect-[16/9] w-full rounded-xl ring-1 ring-primary-foreground/20"
              />
            </div>

            <div className="mt-4 flex items-center justify-between gap-2">
              <h2 className="text-primary-foreground">Order from this stall</h2>
              <span className="type-nums rounded bg-ticket px-2.5 py-0.5 text-sm font-medium text-stamp">
                {slipCount} {slipCount === 1 ? "item" : "items"} ·{" "}
                {formatPrice(slipTotalCents) ?? "$0.00"}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-1.5">
              {(
                [
                  { id: "pickup", label: "Hall pickup" },
                  { id: "preorder", label: "Pre-order" },
                  { id: "delivery", label: "Delivery" },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setFulfillmentMethod(m.id)}
                  className={cn(
                    "cursor-pointer rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
                    fulfillmentMethod === m.id
                      ? "bg-ticket text-stamp"
                      : "bg-primary-foreground/12 text-primary-foreground hover:bg-primary-foreground/20",
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 rounded-xl bg-stamp/40 p-3.5 ring-1 ring-primary-foreground/15">
            {primaryCheckoutItem ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm text-primary-foreground/75">Selected for checkout</p>
                    <p className="text-base font-medium text-primary-foreground">
                      {primaryCheckoutItem.name}
                      {slipEntries.length > 1 ? ` + ${slipEntries.length - 1} more` : ""}
                    </p>
                  </div>
                  <span className="type-nums shrink-0 rounded bg-primary-foreground/15 px-2.5 py-1 text-base text-ticket">
                    {formatPrice(slipTotalCents) ??
                      formatPrice(primaryCheckoutItem.activePriceCents)}
                  </span>
                </div>
                <Link
                  href={`/vendors/${vendor.slug}/buy/${primaryCheckoutItem.id}`}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-ticket px-4 py-2.5 text-base font-medium text-stamp hover:bg-ticket/90"
                >
                  <TicketMark className="size-4" />
                  <span>
                    Checkout {fulfillmentMethod === "delivery" ? "for delivery" : "for pickup"}
                  </span>
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {/* Visual Stall Catalogue Section */}
      <section
        id="menu"
        className="mt-8 rounded-xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6"
      >
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-4">
          <div>
            <p className="type-kicker text-primary">Interactive stall catalogue</p>
            <h2 className="mt-0.5">Shop {vendor.name}&apos;s table &amp; compare across the market</h2>
          </div>

          {/* View Mode Switcher: Visual Cards vs Receipt Table */}
          <div className="flex items-center gap-1.5 rounded-lg bg-receipt p-1 ring-1 ring-border">
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={cn(
                "inline-flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium",
                viewMode === "cards"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <CrateMark className="size-3.5" />
              <span>Visual cards</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("receipt")}
              className={cn(
                "inline-flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium",
                viewMode === "receipt"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <RulesMark className="size-3.5" />
              <span>Receipt list</span>
            </button>
          </div>
        </div>

        {/* Filter Bar: Search + Aisle Filter + Section Filter */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <label className="flex min-w-[16rem] flex-1 items-center gap-2 rounded-lg bg-receipt px-3 py-2 ring-1 ring-border">
            <SearchMark className="size-4 shrink-0 text-muted-foreground" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter items by name, ingredient, or aisle…"
              className="w-full bg-transparent text-base text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </label>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setSelectedAisleFilter("all");
                setSelectedSection("all");
              }}
              className={cn(
                "stall-chip-sm cursor-pointer px-3 py-1.5 text-sm font-medium",
                selectedAisleFilter === "all" && selectedSection === "all"
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
                  setSelectedAisleFilter(selectedAisleFilter === guide.id ? "all" : guide.id)
                }
                className={cn(
                  "stall-chip-sm cursor-pointer px-3 py-1.5 text-sm font-medium",
                  selectedAisleFilter === guide.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-foreground hover:bg-secondary/80",
                )}
              >
                {guide.label} ({guide.itemCountOnMenu})
              </button>
            ))}
            {menuSections.length > 1
              ? menuSections.map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => setSelectedSection(selectedSection === sec ? "all" : sec)}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-sm font-medium",
                      selectedSection === sec
                        ? "bg-stamp text-chalk"
                        : "bg-receipt text-muted-foreground ring-1 ring-border hover:text-foreground",
                    )}
                  >
                    {sec}
                  </button>
                ))
              : null}
          </div>
        </div>

        {/* Catalogue Content: Visual Cards Grid OR Receipt List */}
        {viewMode === "cards" ? (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredMenus.map((item) => {
              const qty = orderQuantities[item.id] ?? 0;
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
                <article
                  key={item.id}
                  className={cn(
                    "flex flex-col justify-between rounded-xl bg-receipt p-4 ring-1 transition-colors",
                    qty > 0
                      ? "ring-2 ring-primary bg-ticket/10"
                      : "ring-border hover:ring-foreground/25",
                  )}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Link
                          href={item.aisleHref}
                          className="rounded bg-secondary px-2 py-0.5 text-sm font-medium text-foreground hover:bg-primary hover:text-primary-foreground"
                        >
                          {item.productCategoryLabel}
                        </Link>
                        {item.season ? (
                          <span className="text-sm text-muted-foreground">{item.season}</span>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {priceLabel ? (
                          <span className="type-nums bg-stamp px-2 py-0.5 text-sm text-chalk">
                            {priceLabel}
                          </span>
                        ) : null}
                        {savedProduct ? (
                          <ProductSaveButton product={savedProduct} size="sm" />
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-3 flex items-start gap-3">
                      <MenuItemPhoto url={item.imageUrl} menuId={item.id} />
                      <div className="min-w-0 flex-1">
                        <h3 className="text-foreground">{item.name}</h3>
                        {item.description ? (
                          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                            {item.description}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    {/* Fulfillment badges */}
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                      {item.effectivePickup ? (
                        <span className="inline-flex items-center gap-1 rounded bg-card px-2 py-0.5 text-foreground ring-1 ring-border">
                          <CheckMark className="size-3 text-primary" />
                          <span>Pickup</span>
                        </span>
                      ) : null}
                      {item.effectivePreorder ? (
                        <span className="inline-flex items-center gap-1 rounded bg-card px-2 py-0.5 text-muted-foreground ring-1 ring-border">
                          <span>Pre-order</span>
                        </span>
                      ) : null}
                      {item.effectiveDelivery ? (
                        <span className="inline-flex items-center gap-1 rounded bg-card px-2 py-0.5 text-muted-foreground ring-1 ring-border">
                          <span>Delivery</span>
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Card Footer: Order Action + Direct Category Comparison Link */}
                  <div className="mt-4 border-t border-dashed border-border pt-3">
                    {item.effectiveCanBuy ? (
                      <div className="flex items-center justify-between gap-2">
                        {qty > 0 ? (
                          <div className="inline-flex items-center rounded-md bg-stamp text-chalk">
                            <button
                              type="button"
                              onClick={() => adjustQty(item.id, -1)}
                              className="cursor-pointer px-2.5 py-1 text-sm font-medium hover:bg-chalk/15"
                            >
                              −
                            </button>
                            <span className="type-nums px-2 text-sm">{qty} in order</span>
                            <button
                              type="button"
                              onClick={() => adjustQty(item.id, 1)}
                              className="cursor-pointer px-2.5 py-1 text-sm font-medium hover:bg-chalk/15"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => adjustQty(item.id, 1)}
                            className="stall-chip-sm cursor-pointer bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                          >
                            + Add to order
                          </button>
                        )}
                        <Link
                          href={`/vendors/${vendor.slug}/buy/${item.id}`}
                          className="rounded-md bg-card px-3 py-1.5 text-sm font-medium text-foreground ring-1 ring-border hover:bg-secondary"
                        >
                          Buy now →
                        </Link>
                      </div>
                    ) : null}

                    <div className="mt-2.5 flex items-center justify-between gap-2 text-sm">
                      <Link
                        href={item.compareHref}
                        className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                      >
                        <span>{item.compareLabel}</span>
                        <CaretRightMark className="size-3" />
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <ul className="mt-5 bg-receipt ring-1 ring-border shadow-[inset_3px_0_0_var(--stamp)]">
            {filteredMenus.map((item) => {
              const priceLabel = formatPrice(
                item.effectivePriceCents ?? item.activePriceCents,
              );
              return (
                <li
                  key={item.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-dashed border-border px-4 py-3 last:border-b-0"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-medium text-foreground">{item.name}</span>
                      <Link
                        href={item.compareHref}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        ({item.compareLabel})
                      </Link>
                    </div>
                    {item.description ? (
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    {priceLabel ? (
                      <span className="type-nums bg-stamp px-2 py-0.5 text-sm text-chalk">
                        {priceLabel}
                      </span>
                    ) : null}
                    {item.effectiveCanBuy ? (
                      <Link
                        href={`/vendors/${vendor.slug}/buy/${item.id}`}
                        className="stall-chip-sm bg-primary px-3 py-1 text-sm font-medium text-primary-foreground"
                      >
                        Buy
                      </Link>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Interactive "Compare Across the Market" Aisle Explorer Band */}
      <section className="mt-8 rounded-xl bg-stamp p-6 text-chalk ring-2 ring-foreground/15">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-chalk/15 pb-4">
          <div>
            <p className="type-kicker text-ticket">Market-wide aisle explorer</p>
            <h2 className="mt-0.5 text-chalk">
              Compare {vendor.name} with other Toronto stalls &amp; product guides
            </h2>
          </div>

          <div className="flex flex-wrap gap-2">
            {aisleGuides.map((guide) => (
              <button
                key={guide.id}
                type="button"
                onClick={() => setActiveExplorerAisleId(guide.id)}
                className={cn(
                  "cursor-pointer rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
                  activeExplorerGuide?.id === guide.id
                    ? "bg-ticket text-stamp"
                    : "bg-chalk/10 text-chalk hover:bg-chalk/20",
                )}
              >
                {guide.label}
              </button>
            ))}
          </div>
        </div>

        {/* Active Aisle Guide Pills */}
        {activeExplorerGuide ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-chalk/10 p-4">
            <div className="flex items-center gap-3">
              <ProductThumb
                url={activeExplorerGuide.photoUrl}
                alt={activeExplorerGuide.photoAlt ?? activeExplorerGuide.label}
                Mark={CrateMark}
                className="size-12 rounded-lg ring-1 ring-chalk/20"
              />
              <div>
                <p className="text-base font-medium text-chalk">
                  Explore {activeExplorerGuide.label} across Toronto
                </p>
                <p className="text-sm text-chalk/75">
                  Jump to a specific product guide or search every stall in this aisle.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {activeExplorerGuide.findPages.map((fp) => (
                <Link
                  key={fp.slug}
                  href={fp.href}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-receipt px-3 py-1.5 text-sm font-medium text-stamp hover:bg-ticket"
                >
                  <span>{fp.term}</span>
                  <span className="type-nums text-muted-foreground">({fp.vendorsCount})</span>
                </Link>
              ))}
              <Link
                href={activeExplorerGuide.href}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <span>Open full {activeExplorerGuide.label.toLowerCase()} aisle</span>
                <CaretRightMark className="size-3.5" />
              </Link>
            </div>
          </div>
        ) : null}

        {/* Peer Stalls Comparison Cards */}
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {similarAisleVendors.slice(0, 3).map((peer) => (
            <div
              key={peer.slug}
              className="flex flex-col justify-between gap-3 rounded-xl bg-receipt p-4 text-foreground ring-1 ring-border"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-start gap-3">
                    <StallEmblem name={peer.name} logoUrl={peer.logoUrl} size="sm" />
                    <div className="min-w-0">
                      <Link
                        href={`/vendors/${peer.slug}`}
                        className="text-base font-medium text-foreground hover:text-primary hover:underline"
                      >
                        {peer.name}
                      </Link>
                      <p className="text-sm text-muted-foreground">{peer.primaryAisleLabel}</p>
                    </div>
                  </div>
                  <SaveButton kind="vendor" slug={peer.slug} name={peer.name} size="sm" />
                </div>

                {peer.items.length > 0 ? (
                  <ul className="mt-3 divide-y divide-dashed divide-border border-y border-dashed border-border py-1.5">
                    {peer.items.slice(0, 3).map((pi) => (
                      <li
                        key={pi.name}
                        className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-2 py-1 text-sm"
                      >
                        <Link
                          href={pi.href}
                          className="font-medium text-foreground hover:text-primary hover:underline"
                        >
                          {pi.name}
                        </Link>
                        {pi.priceCents != null ? (
                          <span className="type-nums text-muted-foreground">
                            {formatPrice(pi.priceCents)}
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>

              {peer.markets[0] ? (
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 text-sm">
                  <Link
                    href={`/markets/${peer.markets[0].slug}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {peer.markets[0].name}
                  </Link>
                  <SessionLines hours={peer.markets[0].hours.slice(0, 1)} />
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      {/* Bottom 2-Column Spread: Market Halls & Fellow Stalls + Shopper Reviews & Claim */}
      <div className="mt-8 grid gap-8 lg:grid-cols-12">
        <div className="flex flex-col gap-6 lg:col-span-7">
          <section className="rounded-xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <BlocksMark className="size-4 text-primary" />
                <h2>Markets &amp; fellow stalls on their circuit</h2>
              </div>
              <Link href="/markets" className="text-sm font-medium text-primary hover:underline">
                All Toronto markets →
              </Link>
            </div>

            <div className="mt-4 flex flex-col gap-4">
              {markets.map((market) => (
                <div
                  key={market.id}
                  className="rounded-xl bg-receipt p-4 ring-1 ring-border"
                >
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/markets/${market.slug}`}
                          className="text-base font-medium text-foreground hover:text-primary hover:underline"
                        >
                          {market.name}
                        </Link>
                        <span className="rounded bg-secondary px-2 py-0.5 text-sm text-muted-foreground">
                          {market.neighbourhood}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        <AddressLink
                          address={market.address}
                          city={market.city}
                          province={market.province}
                          lat={market.lat}
                          lng={market.lng}
                        />
                        {market.stall ? ` · Stall ${market.stall}` : ""}
                      </p>
                    </div>
                    <SessionLines hours={market.hours} fallback={market.nextOpen} />
                  </div>

                  {market.fellowVendors.length > 0 ? (
                    <div className="mt-3 border-t border-dashed border-border pt-3">
                      <p className="text-sm text-muted-foreground">
                        Also setting up at {market.name}:
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {market.fellowVendors.slice(0, 5).map((fellow) => (
                          <Link
                            key={fellow.slug}
                            href={`/vendors/${fellow.slug}`}
                            className="inline-flex items-center gap-1.5 rounded-md bg-card px-2.5 py-1 text-sm font-medium text-foreground ring-1 ring-border hover:bg-secondary"
                          >
                            <span>{fellow.name}</span>
                            <span className="text-muted-foreground">· {fellow.aisleLabel}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </section>

          {coMarketVendors.length > 0 ? (
            <section className="rounded-xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6">
              <h2>More stalls at the same market halls</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Pair your stop at {vendor.name} with these fellow vendors at the same halls.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {coMarketVendors.slice(0, 4).map((peer) => (
                  <div
                    key={peer.slug}
                    className="flex items-start justify-between gap-3 rounded-xl bg-receipt p-3.5 ring-1 ring-border"
                  >
                    <div className="flex min-w-0 items-start gap-2.5">
                      <StallEmblem name={peer.name} logoUrl={peer.logoUrl} size="sm" />
                      <div className="min-w-0">
                        <Link
                          href={`/vendors/${peer.slug}`}
                          className="text-base font-medium text-foreground hover:text-primary hover:underline"
                        >
                          {peer.name}
                        </Link>
                        <p className="text-sm text-muted-foreground">
                          {peer.primaryAisleLabel}
                          {peer.sharedMarketName ? ` · ${peer.sharedMarketName}` : ""}
                        </p>
                      </div>
                    </div>
                    <SaveButton kind="vendor" slug={peer.slug} name={peer.name} size="sm" />
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <div className="flex flex-col gap-6 lg:col-span-5">
          <section className="rounded-xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6">
            <h2>Shopper notes &amp; reviews</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Live notes from shoppers visiting {vendor.name}.
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

          <div id="account">
            <ListingPortalCta kind="vendor" listingId={vendor.id} taken={vendor.claimed} />
          </div>
        </div>
      </div>

      <div className="mt-10">
        <ListingAlsoLinks
          heading="Browse related market schedules & tags"
          weekdays={markets.flatMap((m) => m.days)}
          tags={vendor.tags}
        />
      </div>
    </div>
  );
}
