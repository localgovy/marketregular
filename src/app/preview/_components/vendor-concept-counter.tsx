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

type FulfillmentFilter = "all" | "pickup" | "preorder" | "delivery";
type FulfillmentChoice = "pickup" | "preorder" | "delivery";

function ProductThumb({
  url,
  alt,
  className,
}: {
  url: string | null | undefined;
  alt: string;
  className?: string;
}) {
  if (url) {
    return (
      <span className={cn("inline-flex shrink-0 items-center justify-center overflow-hidden bg-secondary", className)}>
        <img
          src={url}
          alt={alt}
          width={56}
          height={56}
          loading="lazy"
          decoding="async"
          className="size-full object-cover"
        />
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center bg-secondary text-primary",
        className,
      )}
    >
      <CrateMark className="size-5" />
    </span>
  );
}

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

export function VendorConceptCounter({
  data,
  storefrontMode = "active",
}: {
  data: VendorPreviewData;
  storefrontMode?: "active" | "live";
}) {
  const { vendor, menus, menuSections, dietaryOptions, aisleGuides, markets, similarAisleVendors } =
    data;
  const homeMarket = markets[0];

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSection, setSelectedSection] = useState<string>("all");
  const [selectedDietary, setSelectedDietary] = useState<string>("all");
  const [fulfillmentFilter, setFulfillmentFilter] = useState<FulfillmentFilter>("all");

  // Order slip state: map of menuId -> quantity
  const initialMenuId = menus[0]?.id ?? "";
  const [orderQuantities, setOrderQuantities] = useState<Record<string, number>>(() =>
    initialMenuId ? { [initialMenuId]: 1 } : {},
  );
  const [fulfillmentChoice, setFulfillmentChoice] = useState<FulfillmentChoice>("pickup");
  const [selectedPickupMarketSlug, setSelectedPickupMarketSlug] = useState<string>(
    homeMarket?.slug ?? "",
  );

  const isSimulated = storefrontMode === "active";

  const resolvedMenus = useMemo(() => {
    return menus.map((item) => {
      const canBuy = isSimulated ? item.activeCanBuy : item.liveCanBuy;
      const priceCents = isSimulated
        ? item.activePriceCents
        : (item.livePriceCents ?? item.activePriceCents);
      const offerPickup = isSimulated ? item.activePickup : item.livePickup;
      const offerPreorder = isSimulated ? item.activePreorder : item.livePreorder;
      const offerDelivery = isSimulated ? item.activeDelivery : item.liveDelivery;
      const offerTerms = isSimulated ? item.activeTerms : item.liveTerms;

      return {
        ...item,
        effectiveCanBuy: canBuy,
        effectivePriceCents: isSimulated ? priceCents : item.livePriceCents,
        effectivePickup: offerPickup,
        effectivePreorder: offerPreorder,
        effectiveDelivery: offerDelivery,
        effectiveTerms: offerTerms,
      };
    });
  }, [menus, isSimulated]);

  const filteredMenus = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return resolvedMenus.filter((item) => {
      if (selectedSection !== "all" && item.section !== selectedSection) return false;
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
  }, [resolvedMenus, searchQuery, selectedSection, selectedDietary, fulfillmentFilter]);

  const groupedFilteredMenus = useMemo(() => {
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
        lineCents: (item.effectivePriceCents ?? item.activePriceCents) * (orderQuantities[item.id] ?? 1),
      }));
  }, [resolvedMenus, orderQuantities]);

  const slipTotalCents = slipItems.reduce((sum, entry) => sum + entry.lineCents, 0);
  const primaryCheckoutItem = slipItems[0]?.item ?? resolvedMenus[0];
  const selectedPickupMarket =
    markets.find((m) => m.slug === selectedPickupMarketSlug) ?? homeMarket;

  function adjustQty(menuId: string, delta: number) {
    setOrderQuantities((prev) => {
      const nextQty = Math.max(0, Math.min(20, (prev[menuId] ?? 0) + delta));
      const copy = { ...prev };
      if (nextQty === 0) {
        delete copy[menuId];
      } else {
        copy[menuId] = nextQty;
      }
      return copy;
    });
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      {/* Top navigation & aisle breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <BackButton href={homeMarket ? `/markets/${homeMarket.slug}` : "/markets"} />
          <Link
            href={`/products?aisle=${encodeURIComponent(vendor.primaryAisleId)}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-card px-3 py-1.5 text-sm font-medium text-foreground ring-1 ring-border hover:bg-secondary"
          >
            <TagMark className="size-3.5 text-primary" />
            <span>{vendor.primaryAisleLabel} aisle</span>
          </Link>
          {homeMarket ? (
            <Link
              href={`/markets/${homeMarket.slug}`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-card px-3 py-1.5 text-sm font-medium text-muted-foreground ring-1 ring-border hover:text-foreground"
            >
              <BlocksMark className="size-3.5 text-primary" />
              <span>{homeMarket.name}</span>
            </Link>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>Compare across Toronto:</span>
          {aisleGuides.slice(0, 2).map((guide) => (
            <Link
              key={guide.id}
              href={guide.href}
              className="font-medium text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary"
            >
              All {guide.label.toLowerCase()} stalls
            </Link>
          ))}
        </div>
      </div>

      {/* Enamel Forest-Green Stall Counter Header Plate */}
      <section className="mt-4 rounded-xl bg-primary p-5 text-primary-foreground ring-2 ring-foreground/15 sm:p-7">
        <div className="grid gap-6 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-8">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm font-medium",
                  vendor.openNow || vendor.sellingToday
                    ? "bg-ticket text-chalk"
                    : "bg-primary-foreground/15 text-primary-foreground",
                )}
              >
                <WeekMark className="size-3.5" />
                <span>{vendor.badge}</span>
              </span>
              <span className="text-sm text-primary-foreground/85">
                {vendor.nextSessionSummary}
              </span>
            </div>

            <div className="mt-3 flex items-start gap-4">
              <StallEmblem name={vendor.name} logoUrl={vendor.logoUrl} size="lg" />
              <div className="min-w-0 flex-1">
                <h1 className="text-primary-foreground">
                  <VerifiedName slug={vendor.slug} name={vendor.name} />
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
                  <ListingScore
                    className="text-base text-primary-foreground/90"
                    ratingAvg={vendor.ratingAvg}
                    reviewCount={vendor.reviewCount}
                  />
                  <span className="type-nums text-sm text-primary-foreground/80">
                    {menus.length} {menus.length === 1 ? "table item" : "table items"} ·{" "}
                    {markets.length} {markets.length === 1 ? "market hall" : "market halls"}
                  </span>
                </div>
              </div>
            </div>

            {vendor.about ? (
              <p className="mt-4 max-w-3xl text-base leading-relaxed text-primary-foreground/90">
                {vendor.about}
              </p>
            ) : null}

            {/* Active fulfillment capabilities strip */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-primary-foreground/15 px-3 py-1 text-sm font-medium text-primary-foreground">
                <CheckMark className="size-3.5 text-primary-foreground" />
                <span>Market stall pickup</span>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-md bg-primary-foreground/15 px-3 py-1 text-sm font-medium text-primary-foreground">
                <TicketMark className="size-3.5 text-primary-foreground" />
                <span>Pre-order for market day</span>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-md bg-primary-foreground/15 px-3 py-1 text-sm font-medium text-primary-foreground">
                <CrateMark className="size-3.5 text-primary-foreground" />
                <span>Local Toronto delivery</span>
              </span>
            </div>
          </div>

          <div className="flex flex-col justify-between gap-4 rounded-xl bg-foreground/25 p-4 ring-1 ring-primary-foreground/20 lg:col-span-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="type-kicker text-primary-foreground/75">Save this stall</p>
                <p className="text-base font-medium text-primary-foreground">
                  Keep {vendor.name} on your list
                </p>
              </div>
              <SaveButton kind="vendor" slug={vendor.slug} name={vendor.name} size="lg" />
            </div>

            <div className="grid grid-cols-3 gap-2 border-t border-primary-foreground/15 pt-3">
              <div className="rounded-lg bg-primary-foreground/12 px-3 py-2">
                <p className="type-census text-2xl text-primary-foreground">{menus.length}</p>
                <p className="text-sm text-primary-foreground/80">Menu items</p>
              </div>
              <div className="rounded-lg bg-primary-foreground/10 px-3 py-2">
                <p className="type-census text-2xl text-primary-foreground">{markets.length}</p>
                <p className="text-sm text-primary-foreground/80">Market halls</p>
              </div>
              <div className="rounded-lg bg-primary-foreground/10 px-3 py-2">
                <p className="type-census text-2xl text-primary-foreground">
                  {aisleGuides.length}
                </p>
                <p className="text-sm text-primary-foreground/80">
                  {aisleGuides.length === 1 ? "Market aisle" : "Market aisles"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main 12-Column Counter Layout: 8-Col Interactive Stall Table + 4-Col Sticky Order Slip & Schedule */}
      <div className="mt-8 grid gap-8 lg:grid-cols-12 lg:items-start">
        {/* Left 8 Columns: Interactive Stall Menu + Category Cross-Links */}
        <div className="flex flex-col gap-8 lg:col-span-8">
          <section
            id="menu"
            className="rounded-xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6"
          >
            {/* Visual Table Banner */}
            <div className="grid gap-4 rounded-xl bg-secondary/55 p-4 ring-1 ring-border sm:grid-cols-[11rem_minmax(0,1fr)] sm:items-center">
              <ProductPhotoFrame
                name={vendor.primaryAisleLabel}
                photo={vendor.bannerPhoto}
                className="aspect-[16/10] w-full rounded-lg ring-1 ring-foreground/10"
              />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2>On the stall table</h2>
                  <span className="rounded-md bg-ticket px-2.5 py-1 text-sm font-medium text-chalk">
                    {isSimulated ? "Online ordering active" : "Published stall menu"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Add items directly to your stall order slip for market pickup or delivery, or click any item&apos;s category link to compare prices across other Toronto vendors.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {aisleGuides.map((guide) => (
                    <Link
                      key={guide.id}
                      href={guide.href}
                      className="inline-flex items-center gap-1.5 rounded-md bg-receipt px-2.5 py-1 text-sm font-medium text-foreground ring-1 ring-border hover:bg-card"
                    >
                      <TagMark className="size-3.5 text-primary" />
                      <span>Browse all {guide.label}</span>
                      <CaretRightMark className="size-3 text-muted-foreground" />
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Interactive Menu Filter & Search Controls */}
            <div className="mt-5 flex flex-col gap-3 border-b border-border pb-4">
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                <label className="flex items-center gap-2 rounded-lg bg-receipt px-3 py-2 ring-1 ring-border focus-within:ring-2 focus-within:ring-primary">
                  <SearchMark className="size-4 shrink-0 text-muted-foreground" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={`Search ${vendor.name}'s ${menus.length} menu items…`}
                    className="w-full bg-transparent text-base text-foreground placeholder:text-muted-foreground focus:outline-none"
                  />
                </label>

                <div className="flex flex-wrap items-center gap-1.5">
                  {(
                    [
                      { id: "all", label: "All items" },
                      { id: "pickup", label: "Market pickup" },
                      { id: "preorder", label: "Pre-order" },
                      { id: "delivery", label: "Delivery" },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setFulfillmentFilter(tab.id)}
                      className={cn(
                        "stall-chip-sm cursor-pointer px-3 py-1.5 text-sm font-medium transition-colors",
                        fulfillmentFilter === tab.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-foreground hover:bg-secondary/80",
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Section & Dietary Filter Pills */}
              {menuSections.length > 1 || dietaryOptions.length > 0 ? (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {menuSections.length > 1 ? (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedSection("all")}
                        className={cn(
                          "rounded-md px-2.5 py-1 text-sm font-medium",
                          selectedSection === "all"
                            ? "bg-stamp text-chalk"
                            : "bg-receipt text-muted-foreground ring-1 ring-border hover:text-foreground",
                        )}
                      >
                        All sections ({menus.length})
                      </button>
                      {menuSections.map((section) => (
                        <button
                          key={section}
                          type="button"
                          onClick={() => setSelectedSection(section)}
                          className={cn(
                            "rounded-md px-2.5 py-1 text-sm font-medium",
                            selectedSection === section
                              ? "bg-stamp text-chalk"
                              : "bg-receipt text-muted-foreground ring-1 ring-border hover:text-foreground",
                          )}
                        >
                          {section}
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {dietaryOptions.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm text-muted-foreground">Dietary:</span>
                      <button
                        type="button"
                        onClick={() => setSelectedDietary("all")}
                        className={cn(
                          "rounded-md px-2 py-0.5 text-sm font-medium",
                          selectedDietary === "all"
                            ? "bg-primary/15 text-primary"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        Any
                      </button>
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

            {/* Grouped Receipt Menu List */}
            {groupedFilteredMenus.length === 0 ? (
              <div className="mt-5 rounded-xl bg-receipt p-6 text-center ring-1 ring-border">
                <p className="text-base font-medium">No menu items match that filter.</p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedSection("all");
                    setSelectedDietary("all");
                    setFulfillmentFilter("all");
                  }}
                  className="mt-2 text-sm font-medium text-primary underline"
                >
                  Reset menu filters
                </button>
              </div>
            ) : (
              <div className="mt-5 flex flex-col gap-6">
                {groupedFilteredMenus.map(([sectionName, sectionItems]) => (
                  <div key={sectionName}>
                    <div className="flex items-center justify-between gap-2">
                      <h3>{sectionName}</h3>
                      <span className="type-nums text-sm text-muted-foreground">
                        {sectionItems.length} {sectionItems.length === 1 ? "item" : "items"}
                      </span>
                    </div>

                    <ul className="mt-2.5 bg-receipt ring-1 ring-border shadow-[inset_3px_0_0_var(--stamp)]">
                      {sectionItems.map((item) => {
                        const qtyInSlip = orderQuantities[item.id] ?? 0;
                        const displayPrice = formatPrice(
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
                              "border-b border-dashed border-border px-4 py-4 last:border-b-0 transition-colors",
                              qtyInSlip > 0 ? "bg-ticket/10" : "",
                            )}
                          >
                            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 gap-y-3">
                              <div className="flex min-w-0 items-start gap-3">
                                <MenuItemPhoto url={item.imageUrl} menuId={item.id} />
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-base font-medium text-foreground">
                                      {item.name}
                                    </p>
                                    {item.season ? (
                                      <span className="rounded bg-secondary px-2 py-0.5 text-sm text-muted-foreground">
                                        {item.season}
                                      </span>
                                    ) : null}
                                    {item.dietary.map((d) => (
                                      <span
                                        key={d}
                                        className="rounded bg-primary/10 px-2 py-0.5 text-sm font-medium text-primary"
                                      >
                                        {d.replaceAll("-", " ")}
                                      </span>
                                    ))}
                                  </div>

                                  {item.description ? (
                                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                                      {item.description}
                                    </p>
                                  ) : null}

                                  {/* Fulfillment & Category Cross-Links Row */}
                                  <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
                                    {item.effectivePickup ? (
                                      <span className="inline-flex items-center gap-1 font-medium text-primary">
                                        <CheckMark className="size-3.5" />
                                        <span>Stall pickup</span>
                                      </span>
                                    ) : null}
                                    {item.effectivePreorder ? (
                                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                                        <span>Pre-order</span>
                                      </span>
                                    ) : null}
                                    {item.effectiveDelivery ? (
                                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                                        <span>Local delivery</span>
                                      </span>
                                    ) : null}

                                    <span className="text-border">·</span>

                                    <Link
                                      href={item.compareHref}
                                      className="inline-flex items-center gap-1 font-medium text-foreground underline decoration-foreground/35 underline-offset-4 hover:text-primary hover:decoration-primary"
                                    >
                                      <span>{item.compareLabel}</span>
                                      <CaretRightMark className="size-3" />
                                    </Link>
                                  </div>
                                </div>
                              </div>

                              {/* Right Column: Price Stamp + Order Controls + Save */}
                              <div className="flex flex-col items-end gap-2">
                                <div className="flex items-center gap-2">
                                  {displayPrice ? (
                                    <span className="type-nums shrink-0 whitespace-nowrap bg-stamp px-2 py-0.5 text-sm text-chalk">
                                      {displayPrice}
                                    </span>
                                  ) : null}
                                  {savedProduct ? (
                                    <ProductSaveButton product={savedProduct} size="sm" />
                                  ) : null}
                                </div>

                                {item.effectiveCanBuy ? (
                                  <div className="flex items-center gap-1.5">
                                    {qtyInSlip > 0 ? (
                                      <div className="inline-flex items-center rounded-md bg-stamp text-chalk ring-1 ring-foreground/20">
                                        <button
                                          type="button"
                                          onClick={() => adjustQty(item.id, -1)}
                                          aria-label={`Decrease quantity of ${item.name}`}
                                          className="cursor-pointer px-2.5 py-1 text-sm font-medium hover:bg-chalk/15"
                                        >
                                          −
                                        </button>
                                        <span className="type-nums px-2 text-sm">
                                          {qtyInSlip} in slip
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => adjustQty(item.id, 1)}
                                          aria-label={`Increase quantity of ${item.name}`}
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
                                        + Add to slip
                                      </button>
                                    )}
                                    <Link
                                      href={`/vendors/${vendor.slug}/buy/${item.id}`}
                                      className="rounded-md bg-card px-2.5 py-1 text-sm font-medium text-foreground ring-1 ring-border hover:bg-secondary"
                                    >
                                      Buy now
                                    </Link>
                                  </div>
                                ) : (
                                  <span className="text-sm text-muted-foreground">
                                    At the stall counter
                                  </span>
                                )}
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

          {/* Broad Product & Category Crates (Cross-Directory Search Links) */}
          <section className="rounded-xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <p className="type-kicker text-primary">Compare across the market directory</p>
                <h2 className="mt-0.5">Browse broad product guides &amp; aisles</h2>
              </div>
              <Link
                href="/products"
                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                <span>Search all market products</span>
                <CaretRightMark className="size-3.5" />
              </Link>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Looking for more stalls that carry what {vendor.name} sells? Jump straight to the Toronto product guides or full aisle directories.
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {aisleGuides.map((guide) => (
                <div
                  key={guide.id}
                  className="flex flex-col justify-between gap-3 rounded-xl bg-receipt p-4 ring-1 ring-border"
                >
                  <div className="flex items-start gap-3">
                    <ProductThumb
                      url={guide.photoUrl}
                      alt={guide.photoAlt ?? guide.label}
                      className="size-14 rounded-lg ring-1 ring-foreground/10"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <Link
                          href={guide.href}
                          className="text-base font-medium text-foreground hover:text-primary hover:underline"
                        >
                          {guide.label}
                        </Link>
                        <span className="type-nums rounded bg-secondary px-2 py-0.5 text-sm text-muted-foreground">
                          {guide.itemCountOnMenu} on this menu
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Compare every Toronto stall carrying {guide.label.toLowerCase()}.
                      </p>
                    </div>
                  </div>

                  {guide.findPages.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 border-t border-dashed border-border pt-3">
                      {guide.findPages.map((fp) => (
                        <Link
                          key={fp.slug}
                          href={fp.href}
                          className="inline-flex items-center gap-1.5 rounded-md bg-card px-2.5 py-1 text-sm font-medium text-foreground ring-1 ring-border hover:bg-secondary"
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
              ))}
            </div>
          </section>

          {/* Similar Stalls in This Aisle */}
          {similarAisleVendors.length > 0 ? (
            <section className="rounded-xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <p className="type-kicker text-primary">Peer stalls in this aisle</p>
                  <h2 className="mt-0.5">
                    Other stalls known for {vendor.primaryAisleLabel.toLowerCase()}
                  </h2>
                </div>
                <Link
                  href={`/products?aisle=${encodeURIComponent(vendor.primaryAisleId)}`}
                  className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  <span>See all {vendor.primaryAisleLabel.toLowerCase()} stalls</span>
                  <CaretRightMark className="size-3.5" />
                </Link>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {similarAisleVendors.slice(0, 4).map((peer) => (
                  <div
                    key={peer.slug}
                    className="flex flex-col justify-between gap-3 rounded-xl bg-receipt p-4 ring-1 ring-border"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <StallEmblem name={peer.name} logoUrl={peer.logoUrl} size="sm" />
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

                      {peer.items.length > 0 ? (
                        <ul className="mt-3 divide-y divide-dashed divide-border border-y border-dashed border-border py-1.5">
                          {peer.items.slice(0, 2).map((pi) => (
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
                          className="font-medium text-muted-foreground hover:text-foreground hover:underline"
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
          ) : null}

          {/* Shopper Floor Notes & Reviews */}
          <section className="rounded-xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6">
            <h2>Shopper notes &amp; reviews</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Notes from regulars who stopped by {vendor.name} at the market.
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
        </div>

        {/* Right 4 Columns: Sticky Stall Order Slip + Unclipped Market Hall Schedule + Contact */}
        <aside className="flex flex-col gap-6 lg:sticky lg:top-20 lg:col-span-4">
          {/* Interactive Stall Order Slip */}
          <div className="rounded-xl bg-receipt p-5 ring-2 ring-stamp shadow-[inset_4px_0_0_var(--primary)]">
            <div className="flex items-start justify-between gap-2 border-b border-dashed border-border pb-3">
              <div>
                <p className="type-kicker text-primary">Direct from the stall</p>
                <h2 className="mt-0.5">Stall order slip</h2>
              </div>
              <span className="type-nums rounded bg-ticket px-2.5 py-1 text-sm font-medium text-chalk">
                {slipItems.reduce((acc, e) => acc + e.qty, 0)} selected
              </span>
            </div>

            {/* Fulfillment Selector */}
            <div className="mt-4">
              <p className="text-sm font-medium text-foreground">How you&apos;ll get your order</p>
              <div className="mt-2 grid grid-cols-3 gap-1.5">
                {(
                  [
                    { id: "pickup", label: "Hall pickup" },
                    { id: "preorder", label: "Pre-order" },
                    { id: "delivery", label: "Delivery" },
                  ] as const
                ).map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setFulfillmentChoice(mode.id)}
                    className={cn(
                      "cursor-pointer rounded-lg px-2.5 py-2 text-center text-sm font-medium transition-colors",
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

            {/* Market Hall Pickup Selector */}
            {fulfillmentChoice !== "delivery" && markets.length > 0 ? (
              <div className="mt-4">
                <label
                  htmlFor="counter-pickup-hall"
                  className="block text-sm font-medium text-foreground"
                >
                  Pickup market hall
                </label>
                <select
                  id="counter-pickup-hall"
                  value={selectedPickupMarket?.slug ?? ""}
                  onChange={(e) => setSelectedPickupMarketSlug(e.target.value)}
                  className="mt-1.5 w-full rounded-lg bg-card px-3 py-2 text-sm font-medium text-foreground ring-1 ring-border"
                >
                  {markets.map((m) => (
                    <option key={m.slug} value={m.slug}>
                      {m.name} ({m.hours[0] ? `${m.hours[0].day} ${m.hours[0].hours}` : m.nextOpen})
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            {/* Selected Order Items */}
            <div className="mt-4 border-t border-dashed border-border pt-3">
              {slipItems.length === 0 ? (
                <p className="py-3 text-sm text-muted-foreground">
                  Click <span className="font-medium text-foreground">+ Add to slip</span> on any menu item to build your market order.
                </p>
              ) : (
                <ul className="divide-y divide-dashed divide-border">
                  {slipItems.map(({ item, qty, lineCents }) => (
                    <li
                      key={item.id}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">{item.name}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => adjustQty(item.id, -1)}
                            className="cursor-pointer rounded bg-card px-2 py-0.5 text-sm ring-1 ring-border hover:bg-secondary"
                          >
                            −
                          </button>
                          <span className="type-nums text-sm">{qty}</span>
                          <button
                            type="button"
                            onClick={() => adjustQty(item.id, 1)}
                            className="cursor-pointer rounded bg-card px-2 py-0.5 text-sm ring-1 ring-border hover:bg-secondary"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <span className="type-nums text-sm font-medium text-foreground">
                        {formatPrice(lineCents)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Subtotal & Checkout Handoff */}
            <div className="mt-3 border-t border-border pt-3">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  Estimated stall total
                </span>
                <span className="type-nums text-xl text-foreground">
                  {formatPrice(slipTotalCents) ?? "$0.00"}
                </span>
              </div>
              {primaryCheckoutItem?.effectiveTerms ? (
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {primaryCheckoutItem.effectiveTerms}
                </p>
              ) : null}

              {primaryCheckoutItem ? (
                <Link
                  href={`/vendors/${vendor.slug}/buy/${primaryCheckoutItem.id}`}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-base font-medium text-primary-foreground hover:bg-primary/90"
                >
                  <TicketMark className="size-4 text-ticket" />
                  <span>
                    Continue to checkout ({primaryCheckoutItem.name})
                  </span>
                </Link>
              ) : null}
            </div>
          </div>

          {/* Where They Set Up — Unclipped Market Schedule Card */}
          <div className="rounded-xl bg-card p-5 ring-1 ring-foreground/10">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <SlatsMark className="size-4 text-primary" />
                <h2>Where they set up</h2>
              </div>
              <span className="type-nums text-sm text-muted-foreground">
                {markets.length} {markets.length === 1 ? "hall" : "halls"}
              </span>
            </div>

            <ul className="mt-3 divide-y divide-dashed divide-border">
              {markets.map((market) => (
                <li key={market.id} className="py-3 first:pt-1 last:pb-0">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3">
                    <div className="min-w-0">
                      <Link
                        href={`/markets/${market.slug}`}
                        className="text-base font-medium text-foreground hover:text-primary hover:underline"
                      >
                        {market.name}
                      </Link>
                      <p className="mt-0.5 text-sm text-muted-foreground">
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
                </li>
              ))}
            </ul>
          </div>

          {/* Contact, Socials & Tags */}
          <div className="rounded-xl bg-card p-5 ring-1 ring-foreground/10">
            <h3>Stall contact &amp; links</h3>
            <div className="mt-3">
              <ListingContact phone={vendor.contact.phone} email={vendor.contact.email} />
              <ListingWebsite href={vendor.contact.website} />
              <ListingInstagram href={vendor.contact.instagram} />
              <ListingTiktok href={vendor.contact.tiktok} />
              <ListingFacebook href={vendor.contact.facebook} />
            </div>
            {vendor.tags.length > 0 ? (
              <div className="mt-4 border-t border-dashed border-border pt-4">
                <p className="mb-2 text-sm font-medium text-muted-foreground">
                  Browse stalls by tag
                </p>
                <TagList tags={vendor.tags} />
              </div>
            ) : null}
          </div>

          {/* Vendor Portal Claim / Edit CTA */}
          <div id="account">
            <ListingPortalCta kind="vendor" listingId={vendor.id} taken={vendor.claimed} />
          </div>
        </aside>
      </div>

      {/* Bottom Cross-Links */}
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
