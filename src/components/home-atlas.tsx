"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type {
  HomeAtlasData,
  HomeAtlasMarketSlot,
  HomeAtlasVendorSpotlight,
} from "@/lib/home-atlas-data";
import { AddressLink } from "@/components/address-link";
import { useGeo } from "@/components/geo-provider";
import { Hours } from "@/components/hours";
import { ListingScore } from "@/components/listing-score";
import {
  AsteriskMark,
  BlocksMark,
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
  { label: "Sourdough", href: "/find/sourdough-toronto", aisleId: "bread-and-bakery" },
  { label: "Butter tarts", href: "/find/butter-tarts-toronto", aisleId: "pies-and-sweets" },
  { label: "Farmstead cheese", href: "/find/cheese-toronto", aisleId: "cheese-and-dairy" },
  { label: "Heirloom tomatoes", href: "/find/tomatoes-toronto", aisleId: "vegetables" },
  { label: "Ontario apples", href: "/find/apples-toronto", aisleId: "apples-and-fruit" },
  { label: "Farm eggs", href: "/find/eggs-toronto", aisleId: "eggs" },
  { label: "Raw honey", href: "/find/honey-toronto", aisleId: "honey" },
  { label: "Maple syrup", href: "/find/maple-syrup-toronto", aisleId: "maple" },
] as const;

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
                <p className="type-kicker font-medium text-foreground">On their table</p>
                <p className="text-sm text-muted-foreground">
                  {vendor.primaryAisleLabel}
                  {vendor.publishedMenu ? " · Published stall items" : ""}
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

      {/* 3. Market Halls & Unclipped Schedule Hours (With Market Hall Emblem) */}
      <div className="bg-card">
        <div className="flex items-baseline justify-between px-3.5 pt-2.5 pb-1">
          <span className="type-kicker text-muted-foreground">Where they set up</span>
          {extraMarketCount > 0 ? (
            <Link
              href={`/vendors/${vendor.slug}`}
              className="type-nums text-sm font-medium text-primary hover:underline"
            >
              +{extraMarketCount} more {extraMarketCount === 1 ? "hall" : "halls"}
            </Link>
          ) : null}
        </div>
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
                      {market.neighbourhood} walk
                    </button>
                    {market.openNow ? <NowLabel>Hall open</NowLabel> : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
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

export function HomeAtlas({ data }: { data: HomeAtlasData }) {
  const router = useRouter();
  const { coords, requestAsync } = useGeo();

  const [q, setQ] = useState("");
  const [locating, setLocating] = useState(false);

  // Unified Tri-Pillar Filter State (Vendors × Products × Markets)
  const [vendorAisleFilter, setVendorAisleFilter] = useState<string>("all");
  const [vendorAreaFilter, setVendorAreaFilter] = useState<string>("all");
  const [vendorWhenFilter, setVendorWhenFilter] = useState<"all" | "today" | "weekend">("all");

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

  // Map aisleId -> photoUrl for cohesive visual chips
  const aislePhotoMap = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const aisle of data.aisles) {
      map.set(aisle.id, aisle.photoUrl);
    }
    return map;
  }, [data.aisles]);

  // Featured vendors with real uploaded logos for the visual emblem strip
  const logoVendors = useMemo(
    () => data.vendorSpotlights.filter((v) => Boolean(v.logoUrl)).slice(0, 8),
    [data.vendorSpotlights],
  );

  function syncAisleSelection(aisleId: string) {
    setVendorAisleFilter(aisleId);
    if (aisleId !== "all" && data.aisles.some((a) => a.id === aisleId)) {
      setSelectedAisleId(aisleId);
    }
  }

  function syncAreaSelection(areaLabel: string) {
    setVendorAreaFilter(areaLabel);
    if (areaLabel !== "all") {
      const idx = data.neighbourhoodCircuits.findIndex(
        (c) => c.label.toLowerCase() === areaLabel.toLowerCase(),
      );
      if (idx >= 0) setSelectedCircuitIndex(idx);
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

  const topDistrictFilters = data.neighbourhoodCircuits.slice(0, 6);

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
            <span aria-hidden className="hidden text-muted-foreground sm:inline">
              ·
            </span>
            <span className="type-nums text-sm text-muted-foreground">
              {LAUNCH_CITY} vendors, products &amp; markets · {data.todayFormatted}
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
              ·
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
          <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-7">
              <p className="type-kicker font-medium text-primary">
                Stalls, tables &amp; neighbourhood market halls in one view
              </p>
              <h1 className="mt-1">{LAUNCH_CITY} farmers&apos; markets</h1>
              <p className="type-lede mt-2 max-w-2xl text-muted-foreground">
                Meet the growers, bakers, and makers first — see what is on their tables, what it
                costs, and the exact {LAUNCH_CITY} market halls and hours where they set up.
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
                    <span className="type-kicker text-muted-foreground">On the tables</span>
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

              {/* Visual Craving Chips with Category Photo Thumbnails */}
              <div className="mt-3.5 flex flex-wrap items-center gap-2 border-t border-primary-foreground/20 pt-3">
                <span className="type-kicker mr-1 text-chalk">Jump to a craving or filter stalls:</span>
                {CRAVING_SHORTCUTS.map((item) => {
                  const active = vendorAisleFilter === item.aisleId;
                  const thumbUrl = aislePhotoMap.get(item.aisleId) ?? null;
                  return (
                    <button
                      key={item.href}
                      type="button"
                      onClick={() => syncAisleSelection(active ? "all" : item.aisleId)}
                      className={cn(
                        "stall-chip-sm inline-flex cursor-pointer items-center gap-2 py-1 pr-3 pl-1.5 text-sm font-medium transition-colors",
                        active
                          ? "bg-card text-primary"
                          : "bg-primary-foreground/15 text-primary-foreground hover:bg-card hover:text-primary",
                      )}
                    >
                      <ProductThumb src={thumbUrl} size="xs" className="border-chalk/30" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
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
            <div className="flex items-center gap-3">
              <span className="stall-chip-sm flex size-9 shrink-0 items-center justify-center bg-primary text-primary-foreground">
                <CrateMark className="size-5" />
              </span>
              <div>
                <p className="type-kicker text-muted-foreground">
                  Vendors in priority · Paired with their signature products &amp; market halls
                </p>
                <h2>Featured Stalls, Tables &amp; Market Halls</h2>
              </div>
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

          {/* 3-Dimension Filter Bar: Pivot by Product Aisle (with Thumbs), Neighbourhood Walk, or Schedule Window */}
          <div className="grid gap-3 border-b border-border bg-secondary/40 px-4 py-3.5 sm:px-5 lg:grid-cols-12 lg:items-center">
            {/* 1. Filter by Product Aisle (with Visual Thumbnails) */}
            <div className="lg:col-span-6">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="type-kicker mr-1 font-medium text-foreground">
                  1. Product aisle:
                </span>
                <button
                  type="button"
                  onClick={() => syncAisleSelection("all")}
                  className={cn(
                    "stall-chip-sm cursor-pointer px-2.5 py-1 text-sm font-medium transition-colors",
                    vendorAisleFilter === "all"
                      ? "bg-primary text-primary-foreground"
                      : "bg-card text-foreground ring-1 ring-border hover:bg-secondary",
                  )}
                >
                  All tables
                </button>
                {data.aisles.slice(0, 6).map((aisle) => {
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
              </div>
            </div>

            {/* 2. Filter by Market Neighbourhood */}
            <div className="lg:col-span-4">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="type-kicker mr-1 font-medium text-foreground">
                  2. Market walk:
                </span>
                <button
                  type="button"
                  onClick={() => syncAreaSelection("all")}
                  className={cn(
                    "stall-chip-sm cursor-pointer px-2.5 py-1 text-sm font-medium transition-colors",
                    vendorAreaFilter === "all"
                      ? "bg-board text-chalk"
                      : "bg-card text-foreground ring-1 ring-border hover:bg-secondary",
                  )}
                >
                  All areas
                </button>
                {topDistrictFilters.slice(0, 4).map((circuit) => {
                  const active =
                    vendorAreaFilter.toLowerCase() === circuit.label.toLowerCase();
                  return (
                    <button
                      key={circuit.label}
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
              </div>
            </div>

            {/* 3. Filter by Selling Window */}
            <div className="lg:col-span-2 lg:justify-self-end">
              <div className="inline-flex flex-wrap gap-1">
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
                <div>
                  <p className="type-kicker text-muted-foreground">
                    Browse {formatCensus(data.census.menus)} items &amp; the stalls that grow or bake them
                  </p>
                  <h2>Products &amp; Aisle Crates</h2>
                </div>
              </div>
              <Link
                href="/products"
                className="text-sm font-medium text-primary underline underline-offset-4"
              >
                All aisles
              </Link>
            </div>

            {/* Aisle Selector Tabs (with Visual Thumbnails) */}
            <div
              role="tablist"
              aria-label="Select product aisle"
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
                      "stall-chip-sm inline-flex cursor-pointer items-center gap-1.5 py-1.5 pr-3 pl-1.5 text-sm font-medium transition-colors",
                      selected
                        ? "bg-board text-chalk"
                        : "bg-card text-foreground ring-1 ring-border hover:bg-secondary",
                    )}
                  >
                    <ProductThumb src={aisle.photoUrl} size="xs" />
                    <span>{aisle.label}</span>
                    <span
                      className={cn(
                        "type-nums text-sm",
                        selected ? "text-chalk/80" : "text-stamp",
                      )}
                    >
                      {aisle.count}
                    </span>
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

                      {activeAisle.sampleTerms.length > 0 ? (
                        <div className="mt-3">
                          <p className="type-kicker text-muted-foreground">
                            Popular product guides in this crate:
                          </p>
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {activeAisle.sampleTerms.map((term) => (
                              <Link
                                key={term.slug}
                                href={`/find/${term.slug}`}
                                className="stall-chip-sm inline-flex items-center bg-secondary px-3 py-1 text-sm font-medium text-foreground ring-1 ring-border hover:bg-primary hover:text-primary-foreground"
                              >
                                <span>{term.term}</span>
                              </Link>
                            ))}
                          </div>
                        </div>
                      ) : null}
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
                <div>
                  <p className="type-kicker text-muted-foreground">
                    {formatCensus(data.census.markets)} halls pinned across {LAUNCH_CITY}
                  </p>
                  <h2>Markets &amp; Neighbourhood Atlas</h2>
                </div>
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

            {/* Neighbourhood Circuit Selector Strip */}
            <div className="border-b border-border bg-secondary/40 px-4 py-3">
              <p className="type-kicker mb-2 text-muted-foreground">
                Inspect a neighbourhood market walk &amp; its stalls:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {data.neighbourhoodCircuits.slice(0, 7).map((circuit, idx) => {
                  const selected = idx === selectedCircuitIndex;
                  return (
                    <button
                      key={circuit.label}
                      type="button"
                      onClick={() => {
                        setSelectedCircuitIndex(idx);
                        setVendorAreaFilter(circuit.label);
                      }}
                      className={cn(
                        "stall-chip-sm inline-flex cursor-pointer items-baseline gap-1.5 px-3 py-1 text-sm font-medium transition-colors",
                        selected
                          ? "bg-board text-chalk"
                          : "bg-card text-foreground ring-1 ring-border hover:bg-secondary",
                      )}
                    >
                      <span>{circuit.label}</span>
                      <span
                        className={cn(
                          "type-nums text-sm",
                          selected ? "text-chalk/80" : "text-muted-foreground",
                        )}
                      >
                        {circuit.marketCount}
                      </span>
                    </button>
                  );
                })}
              </div>
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

        {/* Full-Width Section: Toronto Neighbourhood Market Walks (With Both Hall & Stall Emblems) */}
        <section
          id="directory"
          aria-label="Neighbourhood market walks"
          className="mt-10 scroll-mt-24 border-t-2 border-board pt-8"
        >
          <div className="flex flex-wrap items-end justify-between gap-3 pb-5">
            <div className="flex items-start gap-3">
              <span className="stall-chip-sm mt-0.5 flex size-9 shrink-0 items-center justify-center bg-primary text-primary-foreground">
                <PlateMark className="size-5" />
              </span>
              <div>
                <p className="type-kicker text-muted-foreground">
                  Every major market district in {LAUNCH_CITY} — paired with its halls &amp; anchor stalls
                </p>
                <h2>Neighbourhood Market Walks</h2>
              </div>
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

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {data.neighbourhoodCircuits.slice(0, 6).map((circuit) => (
              <div
                key={circuit.label}
                className="flex flex-col justify-between bg-card ring-1 ring-border"
              >
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
                    {circuit.topMarkets.map((market) => (
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

                  {circuit.topVendors.length > 0 ? (
                    <div className="border-t border-dashed border-border bg-secondary/30 px-4 py-2.5">
                      <p className="type-kicker text-muted-foreground">Featured stalls here:</p>
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

                <div className="flex items-center justify-between border-t border-border bg-secondary/25 px-4 py-2.5 text-sm">
                  <button
                    type="button"
                    onClick={() => syncAreaSelection(circuit.label)}
                    className="cursor-pointer font-medium text-stamp hover:underline"
                  >
                    Show {circuit.label} stalls above
                  </button>
                  <Link
                    href={`/markets?area=${encodeURIComponent(circuit.q)}`}
                    className="font-medium text-primary hover:underline"
                  >
                    Explore {circuit.label}
                  </Link>
                </div>
              </div>
            ))}
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
                    <div>
                      <p className="type-kicker text-muted-foreground">
                        Live from the group chat at the stalls
                      </p>
                      <h3>Recent shopper notes &amp; finds</h3>
                    </div>
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
                    to share what is fresh on the tables.
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
                    <div>
                      <p className="type-kicker text-muted-foreground">Next on the calendar</p>
                      <h2 className="type-column">Upcoming sessions</h2>
                    </div>
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
