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
  SearchMark,
  SlatsMark,
  TagMark,
  TicketMark,
  WeekMark,
} from "@/components/marks";
import { MenuItemPhoto } from "@/components/menu-item-photo";
import { ProductPhotoFrame } from "@/components/product-photo-frame";
import { ReviewCard } from "@/components/review-card";
import { ProductSaveButton, SaveButton } from "@/components/save-button";
import { TagList } from "@/components/tag-list";
import { VerifiedName } from "@/components/verified-stamp";
import { formatPrice } from "@/lib/format";
import { productFromInput } from "@/lib/product-saves";
import { cn } from "@/lib/utils";
import type {
  VendorPreviewData,
  VendorPreviewMarket,
  VendorPreviewMenuItem,
} from "@/app/preview/_lib/vendor-preview-data";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [activeHallSlug, setActiveHallSlug] = useState<string>(homeMarket?.slug ?? "");

  // Synchronized Quick-Buy Order Drawer state
  const [orderQuantities, setOrderQuantities] = useState<Record<string, number>>(() =>
    menus[0]?.id ? { [menus[0].id]: 1 } : {},
  );
  const [fulfillmentChoice, setFulfillmentChoice] = useState<"pickup" | "preorder" | "delivery">(
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
      if (selectedSection !== "all" && item.section !== selectedSection) return false;
      if (selectedAisleId !== "all" && item.productCategory !== selectedAisleId) return false;
      if (selectedDietary !== "all" && !item.dietary.includes(selectedDietary)) return false;
      if (q) {
        const hay = `${item.name} ${item.description ?? ""} ${item.productCategoryLabel} ${item.section}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [resolvedMenus, selectedSection, selectedAisleId, selectedDietary, searchQuery]);

  const groupedMenus = useMemo(() => {
    const map = new Map<string, typeof filteredMenus>();
    for (const item of filteredMenus) {
      const list = map.get(item.section) ?? [];
      list.push(item);
      map.set(item.section, list);
    }
    return [...map.entries()];
  }, [filteredMenus]);

  const slipItems = useMemo(() => {
    return resolvedMenus
      .filter((item) => (orderQuantities[item.id] ?? 0) > 0)
      .map((item) => ({
        item,
        qty: orderQuantities[item.id] ?? 1,
        lineCents:
          (item.effectivePriceCents ?? item.activePriceCents) * (orderQuantities[item.id] ?? 1),
      }));
  }, [resolvedMenus, orderQuantities]);

  const slipTotalCents = slipItems.reduce((sum, entry) => sum + entry.lineCents, 0);
  const slipItemCount = slipItems.reduce((sum, entry) => sum + entry.qty, 0);
  const primaryCheckoutItem = slipItems[0]?.item ?? resolvedMenus[0];

  const activeHall = markets.find((m) => m.slug === activeHallSlug) ?? homeMarket;

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
      {/* Top Status & Aisle Breadcrumb Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <BackButton href={homeMarket ? `/markets/${homeMarket.slug}` : "/markets"} />
          <Link
            href={`/products?aisle=${encodeURIComponent(vendor.primaryAisleId)}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <TagMark className="size-3.5 text-ticket" />
            <span>{vendor.primaryAisleLabel}</span>
          </Link>
          {markets.slice(0, 2).map((m) => (
            <Link
              key={m.slug}
              href={`/markets/${m.slug}`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-card px-3 py-1.5 text-sm font-medium text-foreground ring-1 ring-border hover:bg-secondary"
            >
              <BlocksMark className="size-3.5 text-primary" />
              <span>{m.name}</span>
            </Link>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm font-medium",
              vendor.openNow || vendor.sellingToday
                ? "bg-ticket text-chalk"
                : "bg-secondary text-foreground ring-1 ring-border",
            )}
          >
            <WeekMark className="size-3.5 text-primary" />
            <span>{vendor.badge}</span>
          </span>
          <Link
            href={`/products?aisle=${encodeURIComponent(vendor.primaryAisleId)}`}
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            <span>Compare all {vendor.primaryAisleLabel.toLowerCase()} stalls</span>
            <CaretRightMark className="size-3.5" />
          </Link>
        </div>
      </div>

      {/* Above-the-Fold Tri-Panel Atlas Header */}
      <section className="mt-4 grid gap-5 lg:grid-cols-12">
        {/* Left 7 Cols: Enamel Stall Plate */}
        <div className="flex flex-col justify-between rounded-xl bg-primary p-6 text-primary-foreground ring-2 ring-foreground/15 lg:col-span-7">
          <div>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-4">
                <StallEmblem name={vendor.name} logoUrl={vendor.logoUrl} size="lg" />
                <div className="min-w-0">
                  <p className="type-kicker text-primary-foreground/80">
                    {vendor.primaryAisleLabel} · Toronto market stall
                  </p>
                  <h1 className="mt-1 text-primary-foreground">
                    <VerifiedName slug={vendor.slug} name={vendor.name} />
                  </h1>
                  <ListingScore
                    className="mt-2 text-base text-primary-foreground/90"
                    ratingAvg={vendor.ratingAvg}
                    reviewCount={vendor.reviewCount}
                  />
                </div>
              </div>
              <SaveButton kind="vendor" slug={vendor.slug} name={vendor.name} size="lg" />
            </div>

            {vendor.about ? (
              <p className="mt-4 text-base leading-relaxed text-primary-foreground/90">
                {vendor.about}
              </p>
            ) : null}
          </div>

          <div className="mt-6 border-t border-primary-foreground/15 pt-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-primary-foreground/12 px-3 py-2">
                <p className="type-census text-2xl text-primary-foreground">{menus.length}</p>
                <p className="text-sm text-primary-foreground/80">On their table</p>
              </div>
              <div className="rounded-lg bg-primary-foreground/10 px-3 py-2">
                <p className="type-census text-2xl text-primary-foreground">{markets.length}</p>
                <p className="text-sm text-primary-foreground/80">Market halls</p>
              </div>
              <div className="rounded-lg bg-primary-foreground/10 px-3 py-2">
                <p className="type-census text-2xl text-primary-foreground">
                  {similarAisleVendors.length}
                </p>
                <p className="text-sm text-primary-foreground/80">Similar stalls</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right 5 Cols: Next Market Session & Table Photo Plate */}
        <div className="flex flex-col justify-between rounded-xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6 lg:col-span-5">
          <div>
            <div className="flex items-center justify-between gap-2">
              <p className="type-kicker text-primary">On their table &amp; circuit</p>
              <span className="rounded-md bg-ticket px-2.5 py-0.5 text-sm font-medium text-chalk">
                {isSimulated ? "Pickup · Pre-order · Delivery" : "Published stall table"}
              </span>
            </div>

            <div className="mt-3">
              <ProductPhotoFrame
                name={vendor.primaryAisleLabel}
                photo={vendor.bannerPhoto}
                className="aspect-[16/9] w-full rounded-xl ring-1 ring-foreground/10"
              />
            </div>

            {activeHall ? (
              <div className="mt-4 rounded-xl bg-receipt p-3.5 ring-1 ring-border">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3">
                  <div className="min-w-0">
                    <p className="type-kicker text-primary">Next market setup</p>
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
                  <SessionLines hours={activeHall.hours} fallback={activeHall.nextOpen} />
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-dashed border-border pt-3 text-sm">
            <span className="text-muted-foreground">Compare in directory:</span>
            <div className="flex flex-wrap gap-1.5">
              {aisleGuides.slice(0, 2).map((guide) => (
                <Link
                  key={guide.id}
                  href={guide.href}
                  className="inline-flex items-center gap-1 rounded-md bg-secondary px-2.5 py-1 font-medium text-foreground hover:bg-primary hover:text-primary-foreground"
                >
                  <span>{guide.label}</span>
                  <CaretRightMark className="size-3" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Synchronized 12-Column Stall Table (8 Cols) & Hall Circuit / Fellow Stalls Rail (4 Cols) */}
      <div className="mt-8 grid gap-8 lg:grid-cols-12 lg:items-start">
        {/* Left 8 Columns: Interactive Quick-Buy Drawer + Stall Menu Table */}
        <div className="flex flex-col gap-8 lg:col-span-8">
          {/* Docked Quick-Buy & Pre-Order Slip */}
          <section className="rounded-xl bg-receipt p-5 ring-2 ring-stamp shadow-[inset_4px_0_0_var(--primary)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-dashed border-border pb-3">
              <div className="flex items-center gap-2.5">
                <TicketMark className="size-5 text-primary" />
                <div>
                  <h2>Order &amp; reserve from {vendor.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    Select menu items below to pre-order for market hall pickup or local delivery.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {(
                  [
                    { id: "pickup", label: "Market pickup" },
                    { id: "preorder", label: "Pre-order" },
                    { id: "delivery", label: "Local delivery" },
                  ] as const
                ).map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setFulfillmentChoice(mode.id)}
                    className={cn(
                      "stall-chip-sm cursor-pointer px-3 py-1.5 text-sm font-medium",
                      fulfillmentChoice === mode.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-card text-foreground ring-1 ring-border hover:bg-secondary",
                    )}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <div className="flex flex-wrap items-center gap-2">
                {slipItems.length === 0 ? (
                  <span className="text-sm text-muted-foreground">
                    No items in your slip yet — click <strong className="text-foreground">+ Order</strong> on any row below.
                  </span>
                ) : (
                  slipItems.map(({ item, qty }) => (
                    <span
                      key={item.id}
                      className="inline-flex items-center gap-2 rounded-lg bg-card px-3 py-1.5 text-sm font-medium text-foreground ring-1 ring-border"
                    >
                      <span>{item.name}</span>
                      <span className="type-nums text-muted-foreground">×{qty}</span>
                      <button
                        type="button"
                        onClick={() => adjustQty(item.id, -1)}
                        className="cursor-pointer text-muted-foreground hover:text-foreground"
                        aria-label={`Remove one ${item.name}`}
                      >
                        −
                      </button>
                      <button
                        type="button"
                        onClick={() => adjustQty(item.id, 1)}
                        className="cursor-pointer text-primary hover:text-primary/80"
                        aria-label={`Add one ${item.name}`}
                      >
                        +
                      </button>
                    </span>
                  ))
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">
                    {slipItemCount} {slipItemCount === 1 ? "item" : "items"}
                    {fulfillmentChoice !== "delivery" && activeHall
                      ? ` · ${activeHall.name}`
                      : " · Delivery"}
                  </p>
                  <p className="type-nums text-lg text-foreground">
                    {formatPrice(slipTotalCents) ?? "$0.00"}
                  </p>
                </div>

                {primaryCheckoutItem ? (
                  <Link
                    href={`/vendors/${vendor.slug}/buy/${primaryCheckoutItem.id}`}
                    className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-base font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    <span>Checkout</span>
                    <CaretRightMark className="size-3.5" />
                  </Link>
                ) : null}
              </div>
            </div>
          </section>

          {/* The Stall Table (Filterable Menu with Per-Item Category & Search Links) */}
          <section
            id="menu"
            className="rounded-xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <p className="type-kicker text-primary">Published stall table</p>
                <h2 className="mt-0.5">Menu &amp; item-by-item market comparisons</h2>
              </div>
              <span className="type-nums text-sm text-muted-foreground">
                Showing {filteredMenus.length} of {menus.length} items
              </span>
            </div>

            {/* Filter & Search Bar */}
            <div className="mt-4 flex flex-col gap-3 border-b border-border pb-4">
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                <label className="flex items-center gap-2 rounded-lg bg-receipt px-3 py-2 ring-1 ring-border">
                  <SearchMark className="size-4 shrink-0 text-muted-foreground" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={`Search ${vendor.name}'s menu…`}
                    className="w-full bg-transparent text-base text-foreground placeholder:text-muted-foreground focus:outline-none"
                  />
                </label>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSection("all");
                      setSelectedAisleId("all");
                      setSelectedDietary("all");
                    }}
                    className={cn(
                      "stall-chip-sm cursor-pointer px-3 py-1.5 text-sm font-medium",
                      selectedSection === "all" &&
                        selectedAisleId === "all" &&
                        selectedDietary === "all"
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
                        "stall-chip-sm cursor-pointer px-3 py-1.5 text-sm font-medium",
                        selectedAisleId === guide.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-foreground hover:bg-secondary/80",
                      )}
                    >
                      {guide.label}
                    </button>
                  ))}
                </div>
              </div>

              {menuSections.length > 1 || dietaryOptions.length > 0 ? (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {menuSections.length > 1 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {menuSections.map((sec) => (
                        <button
                          key={sec}
                          type="button"
                          onClick={() =>
                            setSelectedSection(selectedSection === sec ? "all" : sec)
                          }
                          className={cn(
                            "rounded-md px-2.5 py-1 text-sm font-medium",
                            selectedSection === sec
                              ? "bg-stamp text-chalk"
                              : "bg-receipt text-muted-foreground ring-1 ring-border hover:text-foreground",
                          )}
                        >
                          {sec}
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {dietaryOptions.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {dietaryOptions.map((diet) => (
                        <button
                          key={diet}
                          type="button"
                          onClick={() =>
                            setSelectedDietary(selectedDietary === diet ? "all" : diet)
                          }
                          className={cn(
                            "rounded-md px-2 py-0.5 text-sm font-medium",
                            selectedDietary === diet
                              ? "bg-primary text-primary-foreground"
                              : "bg-receipt text-muted-foreground ring-1 ring-border hover:text-foreground",
                          )}
                        >
                          {diet.replaceAll("-", " ")}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            {/* Menu Sections */}
            <div className="mt-5 flex flex-col gap-6">
              {groupedMenus.map(([sectionName, sectionItems]) => (
                <div key={sectionName}>
                  <div className="flex items-center justify-between gap-2">
                    <h3>{sectionName}</h3>
                    <span className="type-nums text-sm text-muted-foreground">
                      {sectionItems.length} {sectionItems.length === 1 ? "item" : "items"}
                    </span>
                  </div>

                  <ul className="mt-2.5 bg-receipt ring-1 ring-border shadow-[inset_3px_0_0_var(--stamp)]">
                    {sectionItems.map((item) => {
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
                        <li
                          key={item.id}
                          className={cn(
                            "border-b border-dashed border-border px-4 py-3.5 last:border-b-0",
                            qty > 0 ? "bg-ticket/10" : "",
                          )}
                        >
                          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 gap-y-2">
                            <div className="flex min-w-0 items-start gap-3">
                              <MenuItemPhoto url={item.imageUrl} menuId={item.id} />
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-base font-medium text-foreground">
                                    {item.name}
                                  </p>
                                  <Link
                                    href={item.aisleHref}
                                    className="rounded bg-secondary px-2 py-0.5 text-sm text-muted-foreground hover:text-foreground"
                                  >
                                    {item.productCategoryLabel}
                                  </Link>
                                </div>
                                {item.description ? (
                                  <p className="mt-1 text-sm text-muted-foreground">
                                    {item.description}
                                  </p>
                                ) : null}

                                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                                  {item.effectivePickup ? (
                                    <span className="inline-flex items-center gap-1 font-medium text-primary">
                                      <CheckMark className="size-3.5" />
                                      <span>Pickup &amp; pre-order</span>
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

                            <div className="flex flex-col items-end gap-2">
                              <div className="flex items-center gap-2">
                                {priceLabel ? (
                                  <span className="type-nums shrink-0 whitespace-nowrap bg-stamp px-2 py-0.5 text-sm text-chalk">
                                    {priceLabel}
                                  </span>
                                ) : null}
                                {savedProduct ? (
                                  <ProductSaveButton product={savedProduct} size="sm" />
                                ) : null}
                              </div>

                              {item.effectiveCanBuy ? (
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => adjustQty(item.id, 1)}
                                    className="stall-chip-sm cursor-pointer bg-primary px-3 py-1 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                                  >
                                    {qty > 0 ? `+ Order (${qty})` : "+ Order"}
                                  </button>
                                  <Link
                                    href={`/vendors/${vendor.slug}/buy/${item.id}`}
                                    className="rounded-md bg-card px-2.5 py-1 text-sm font-medium text-foreground ring-1 ring-border hover:bg-secondary"
                                  >
                                    Buy
                                  </Link>
                                </div>
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
          </section>
        </div>

        {/* Right 4 Columns: Interactive Market Hall Circuit & Fellow Stalls Rail */}
        <aside className="flex flex-col gap-6 lg:sticky lg:top-20 lg:col-span-4">
          <div className="rounded-xl bg-card p-5 ring-1 ring-foreground/10">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <SlatsMark className="size-4 text-primary" />
                <h2>Market hall circuit</h2>
              </div>
              <span className="type-nums text-sm text-muted-foreground">
                {markets.length} {markets.length === 1 ? "hall" : "halls"}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Select a hall to inspect {vendor.name}&apos;s hours and fellow stalls setting up alongside them.
            </p>

            {/* Hall Selector Pills (up to 4 quick pills + full selector if more) */}
            {markets.length > 1 ? (
              <div className="mt-3 flex flex-col gap-2">
                <div className="flex flex-wrap gap-1.5">
                  {markets.slice(0, 4).map((m) => (
                    <button
                      key={m.slug}
                      type="button"
                      onClick={() => setActiveHallSlug(m.slug)}
                      className={cn(
                        "cursor-pointer rounded-lg px-2.5 py-1 text-left text-sm font-medium transition-colors",
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
                    aria-label="Choose market hall on this vendor's circuit"
                    value={activeHall?.slug ?? ""}
                    onChange={(e) => setActiveHallSlug(e.target.value)}
                    className="w-full rounded-lg bg-receipt px-3 py-1.5 text-sm font-medium text-foreground ring-1 ring-border"
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
              <div className="mt-4 rounded-xl bg-receipt p-4 ring-1 ring-border">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <StallEmblem name={activeHall.name} logoUrl={activeHall.logoUrl} size="sm" />
                    <div className="min-w-0">
                      <Link
                        href={`/markets/${activeHall.slug}`}
                        className="text-base font-medium text-foreground hover:text-primary hover:underline"
                      >
                        {activeHall.name}
                      </Link>
                      <p className="mt-0.5 text-sm text-muted-foreground">
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

                <div className="mt-3 flex items-center justify-between border-t border-dashed border-border pt-3">
                  <span className="text-sm font-medium text-muted-foreground">Hall hours</span>
                  <SessionLines hours={activeHall.hours} fallback={activeHall.nextOpen} />
                </div>

                {/* Fellow Stalls at Selected Hall */}
                {activeHall.fellowVendors.length > 0 ? (
                  <div className="mt-4 border-t border-dashed border-border pt-3">
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
                              name={fellow.name}
                              logoUrl={fellow.logoUrl}
                              size="sm"
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
                              </p>
                            </div>
                          </div>
                          <Link
                            href={`/vendors/${fellow.slug}`}
                            className="rounded bg-card px-2 py-1 text-sm font-medium text-foreground ring-1 ring-border hover:bg-secondary"
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
                <p className="text-sm font-medium text-foreground">All market halls &amp; hours</p>
                <ul className="mt-2 divide-y divide-dashed divide-border">
                  {markets.map((m) => (
                    <li
                      key={m.id}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 py-2 text-sm"
                    >
                      <Link
                        href={`/markets/${m.slug}`}
                        className="font-medium text-foreground hover:text-primary hover:underline"
                      >
                        {m.name}
                      </Link>
                      <SessionLines hours={m.hours} fallback={m.nextOpen} />
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <div className="rounded-xl bg-card p-5 text-foreground ring-1 ring-foreground/10">
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

      {/* Bottom Atlas Discovery Spread: Similar Stalls in Aisle + Broad Product Guides + Reviews */}
      <section className="mt-10 rounded-xl bg-card p-6 ring-1 ring-foreground/10">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <p className="type-kicker text-primary">Atlas stall comparison</p>
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

        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {similarAisleVendors.slice(0, 3).map((peer) => (
            <article
              key={peer.slug}
              className="flex flex-col justify-between rounded-xl bg-receipt p-4 ring-1 ring-border"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <StallEmblem name={peer.name} logoUrl={peer.logoUrl} size="md" />
                    <div className="min-w-0">
                      <Link
                        href={`/vendors/${peer.slug}`}
                        className="text-base font-medium text-foreground hover:text-primary hover:underline"
                      >
                        {peer.name}
                      </Link>
                      <ListingScore
                        className="mt-0.5 text-sm"
                        ratingAvg={peer.ratingAvg}
                        reviewCount={peer.reviewCount}
                      />
                    </div>
                  </div>
                  <SaveButton kind="vendor" slug={peer.slug} name={peer.name} size="sm" />
                </div>

                <div className="mt-3">
                  <ProductPhotoFrame
                    name={peer.primaryAisleLabel}
                    photo={
                      peer.photoUrl
                        ? { url: peer.photoUrl, alt: peer.photoAlt ?? peer.primaryAisleLabel }
                        : null
                    }
                    className="aspect-[16/9] w-full rounded-lg ring-1 ring-foreground/10"
                  />
                </div>

                {peer.items.length > 0 ? (
                  <ul className="mt-3 divide-y divide-dashed divide-border">
                    {peer.items.slice(0, 3).map((pi) => (
                      <li
                        key={pi.name}
                        className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-2 py-1.5 text-sm"
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
                <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 border-t border-dashed border-border pt-3 text-sm">
                  <Link
                    href={`/markets/${peer.markets[0].slug}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {peer.markets[0].name}
                  </Link>
                  <SessionLines hours={peer.markets[0].hours.slice(0, 1)} />
                </div>
              ) : null}
            </article>
          ))}
        </div>

        {/* Broad Product Guides Strip */}
        <div className="mt-6 border-t border-dashed border-border pt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-base font-medium text-foreground">
              Jump to broad product guides &amp; category searches:
            </p>
            <div className="flex flex-wrap gap-2">
              {aisleGuides.flatMap((g) => g.findPages).slice(0, 6).map((fp) => (
                <Link
                  key={fp.slug}
                  href={fp.href}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-card px-3 py-1.5 text-sm font-medium text-foreground ring-1 ring-border hover:bg-secondary"
                >
                  <span>{fp.term}</span>
                  <span className="type-nums text-muted-foreground">({fp.vendorsCount})</span>
                </Link>
              ))}
              <Link
                href="/products"
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <span>All product categories</span>
                <CaretRightMark className="size-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Shopper Floor Notes & Reviews */}
      <section className="mt-8 rounded-xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6">
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
