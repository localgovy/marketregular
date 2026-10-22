"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type {
  ClockScenarioId,
  ClockScenarioSnapshot,
  EnrichedLiveMarketSlot,
  LiveMarketsPreviewData,
} from "@/app/preview/_lib/live-markets-preview-data";
import type { HomeAtlasVendorSpotlight } from "@/lib/home-atlas-data";
import { AddressLink } from "@/components/address-link";
import { useGeo } from "@/components/geo-provider";
import { Hours } from "@/components/hours";
import { ListingScore } from "@/components/listing-score";
import {
  BlocksMark,
  CrateMark,
  MapleMark,
  MenuItemPhoto,
  NowLabel,
  ProductPhotoFrame,
  RulesMark,
  SaveButton,
  SearchField,
  SlatsMark,
  TagMark,
  TicketMark,
  VerifiedName,
  WeekMark,
} from "@/app/preview/_components/live-markets-shared-imports";
import { SEARCH_LABEL, SEARCH_PLACEHOLDER, WEEKDAYS } from "@/lib/constants";
import { marketsHref } from "@/lib/find-paths";
import { formatPrice, listingMarkSrc } from "@/lib/format";
import { LAUNCH_CITY } from "@/lib/launch";
import { cn } from "@/lib/utils";

type VariantId = "A" | "B" | "C";

const VARIANTS: Array<{
  id: VariantId;
  shortLabel: string;
  title: string;
  subtitle: string;
  summary: string;
  highlights: string[];
}> = [
  {
    id: "A",
    shortLabel: "Option A · Masthead Floor Strip",
    title: "Masthead Live Floor Strip + Next-Up Dispatch",
    subtitle:
      "Restores the signature stamp-red FloorStrip directly inside the masthead, upgraded with hall emblems, neighbourhood links, and active stall chips.",
    summary:
      "Keeps the new homepage's vertical rhythm tight while giving live markets immediate above-the-fold prominence right between the title/census and the green search bar.",
    highlights: [
      "Left-bordered stamp-red FloorStrip (`shadow-[inset_4px_0_0_var(--stamp)]`) sits above the search bar so open halls are the first interactive element on the page.",
      "Each live hall card shows its StallEmblem, VerifiedName, ListingScore, neighbourhood, unclipped hours in `type-nums`, and quick-links to stalls set up inside.",
      "Graceful after-hours state: when today's markets have closed, the strip automatically pivots to highlight tomorrow's opening halls alongside a compact toggle for earlier today.",
    ],
  },
  {
    id: "B",
    shortLabel: "Option B · Live Hall & Day Tabs",
    title: "Above-the-Fold Live Hall & 7-Day Timetable Deck",
    subtitle:
      "Brings the interactive Upcoming Markets timetable directly above the Featured Stalls showcase with 1-click tabs for Open Now, Today, Tomorrow, and the week.",
    summary:
      "Bridges the classic homepage's `TorontoWeek` schedule with the new Atlas aesthetic — letting shoppers inspect live halls or any day of the week without scrolling to the footer.",
    highlights: [
      "Dedicated `tone=\"open\"` panel with `WeekMark` woodcut stamp and live hall count badge positioned immediately below the green search bar.",
      "Day-by-day tab bar (`Open now`, `Later today`, `Tomorrow`, and upcoming weekdays) renders a 2-column unclipped market grid where hours never shrink or truncate.",
      "Clicking a hall's neighbourhood pill synchronizes directly with the Featured Stalls showcase below.",
    ],
  },
  {
    id: "C",
    shortLabel: "Option C · Split Live Halls + Stalls",
    title: "Live Floor Command Deck (Open Halls × Active Stalls Today)",
    subtitle:
      "Pairs live market halls (7 cols) with the active Stalls on the Floor roster (5 cols) above the fold so shoppers see both open venues and who is selling today.",
    summary:
      "Previously, 'Stalls on the floor' was buried at the very bottom of the 1,600-line page. Option C unites live market halls and today's active vendors into a cohesive above-the-fold dispatch.",
    highlights: [
      "Left 7 columns showcase open (or next opening) market halls with full street addresses, unclipped hours, indoor/outdoor setup badges, and participating vendor emblems.",
      "Right 5 columns elevate `Stalls on the floor` (`sellingToday`) with live status chips, hall locations, and unclipped hours.",
      "Includes a 1-click 'Filter Featured Stalls to Open Today' link that locks the 6-card vendor showcase below to today's active roster.",
    ],
  },
];

function formatCensus(n: number) {
  return n.toLocaleString("en-CA");
}

function directPublicImageSrc(src: string | null | undefined): string | null {
  if (!src) return null;
  if (src.includes("/storage/v1/render/image/") || src.startsWith("/_next/image")) {
    return null;
  }
  return src;
}

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
            align === "end"
              ? "grid-cols-[auto_auto] justify-end"
              : "grid-cols-[minmax(0,1fr)_auto]",
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

/* ============================================================================
 * LIVE MARKET CARD / ROW ATOMS (Shared across Variants A, B, C)
 * ========================================================================== */
function LiveMarketHallCard({
  slot,
  statusBadge,
  onSelectNeighbourhood,
  compact = false,
}: {
  slot: EnrichedLiveMarketSlot;
  statusBadge?: "open" | "later" | "earlier" | "upcoming";
  onSelectNeighbourhood?: (area: string) => void;
  compact?: boolean;
}) {
  const isOpen = statusBadge === "open" || slot.open;

  return (
    <li
      className={cn(
        "flex flex-col justify-between bg-card transition-colors hover:bg-secondary/35",
        compact ? "px-3.5 py-3" : "p-4",
      )}
    >
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
                {onSelectNeighbourhood ? (
                  <button
                    type="button"
                    onClick={() => onSelectNeighbourhood(slot.neighbourhood)}
                    className="cursor-pointer font-medium text-primary hover:underline"
                  >
                    {slot.neighbourhood}
                  </button>
                ) : (
                  <span className="font-medium text-foreground/85">{slot.neighbourhood}</span>
                )}
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

              {!compact && slot.address ? (
                <p className="mt-0.5 text-sm text-muted-foreground">
                  <AddressLink
                    address={slot.address}
                    city={slot.city}
                    province={slot.province}
                    name={slot.name}
                    lat={slot.lat}
                    lng={slot.lng}
                  />
                </p>
              ) : null}
            </div>
          </div>

          {/* Right unclipped hours + SaveButton */}
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

      {/* Participating Stall Emblems at this Market Hall */}
      {slot.sampleVendors.length > 0 ? (
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-dashed border-border pt-2 pl-10">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm text-muted-foreground">Stalls here:</span>
            {slot.sampleVendors.slice(0, compact ? 2 : 3).map((v) => (
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

/* ============================================================================
 * VARIANT A: MASTHEAD LIVE FLOOR STRIP + NEXT-UP DISPATCH
 * ========================================================================== */
function VariantAMastheadFloorStrip({
  scenario,
  onSelectNeighbourhood,
  onFilterTodayStalls,
}: {
  scenario: ClockScenarioSnapshot;
  onSelectNeighbourhood: (area: string) => void;
  onFilterTodayStalls: () => void;
}) {
  const hasOpen = scenario.openNowSlots.length > 0;
  const hasLater = scenario.laterTodaySlots.length > 0;
  const nextGroup = scenario.upcomingDays[0] ?? null;

  const [tab, setTab] = useState<"live" | "next" | "earlier">("live");

  const activeMode =
    tab === "live" && !hasOpen && !hasLater
      ? "next"
      : tab;

  const displayedSlots: EnrichedLiveMarketSlot[] =
    activeMode === "live"
      ? [...scenario.openNowSlots, ...scenario.laterTodaySlots]
      : activeMode === "earlier"
        ? scenario.earlierTodaySlots
        : (nextGroup?.slots ?? []);

  const badgeMode: "open" | "later" | "earlier" | "upcoming" =
    activeMode === "live"
      ? hasOpen
        ? "open"
        : "later"
      : activeMode === "earlier"
        ? "earlier"
        : "upcoming";

  return (
    <nav
      aria-label="Live markets on the floor"
      className="mt-5 bg-card shadow-[inset_4px_0_0_var(--stamp)] ring-1 ring-board"
    >
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-secondary/55 px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-3">
          {hasOpen ? (
            <NowLabel className="text-base">
              <span>
                <span className="type-nums font-semibold">{scenario.openNowSlots.length}</span>{" "}
                {scenario.openNowSlots.length === 1
                  ? "market hall open right now"
                  : "market halls open right now"}
              </span>
            </NowLabel>
          ) : hasLater ? (
            <span className="inline-flex items-center gap-2 text-base font-medium text-primary">
              <WeekMark className="size-4 text-primary" />
              <span>
                <span className="type-nums">{scenario.laterTodaySlots.length}</span>{" "}
                {scenario.laterTodaySlots.length === 1
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

          {scenario.sellingTodayCount > 0 ? (
            <>
              <span aria-hidden className="text-muted-foreground">
                ·
              </span>
              <button
                type="button"
                onClick={onFilterTodayStalls}
                className="cursor-pointer text-sm font-medium text-primary hover:underline"
              >
                <span className="type-nums">{scenario.sellingTodayCount}</span> stalls active today
                (show below)
              </button>
            </>
          ) : null}
        </div>

        {/* Mode Switcher Pills + All Open Today Link */}
        <div className="flex flex-wrap items-center gap-1.5">
          {(hasOpen || hasLater) && (
            <button
              type="button"
              onClick={() => setTab("live")}
              className={cn(
                "stall-chip-sm cursor-pointer px-2.5 py-1 text-sm font-medium transition-colors",
                activeMode === "live"
                  ? "bg-stamp text-receipt"
                  : "bg-card text-foreground ring-1 ring-border hover:bg-secondary",
              )}
            >
              {hasOpen ? `Open now (${scenario.openNowSlots.length})` : "Today"}
            </button>
          )}
          {nextGroup ? (
            <button
              type="button"
              onClick={() => setTab("next")}
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
          {scenario.earlierTodaySlots.length > 0 ? (
            <button
              type="button"
              onClick={() => setTab("earlier")}
              className={cn(
                "stall-chip-sm cursor-pointer px-2.5 py-1 text-sm font-medium transition-colors",
                activeMode === "earlier"
                  ? "bg-board text-chalk"
                  : "bg-card text-foreground ring-1 ring-border hover:bg-secondary",
              )}
            >
              Earlier today ({scenario.earlierTodaySlots.length})
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

      {/* 2-Column Unclipped Live Hall Grid */}
      {displayedSlots.length > 0 ? (
        <ul className="grid gap-px bg-border md:grid-cols-2">
          {displayedSlots.slice(0, 6).map((slot) => (
            <LiveMarketHallCard
              key={slot.id}
              slot={slot}
              statusBadge={slot.open ? "open" : badgeMode}
              onSelectNeighbourhood={onSelectNeighbourhood}
              compact
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

/* ============================================================================
 * VARIANT B: ABOVE-THE-FOLD LIVE HALL & 7-DAY TIMETABLE DECK
 * ========================================================================== */
function VariantBLiveTimetableDeck({
  scenario,
  onSelectNeighbourhood,
}: {
  scenario: ClockScenarioSnapshot;
  onSelectNeighbourhood: (area: string) => void;
}) {
  const defaultTabId =
    scenario.openNowSlots.length > 0
      ? "open"
      : scenario.laterTodaySlots.length > 0
        ? "later"
        : (scenario.upcomingDays[0]?.id ?? "all");

  const [selectedGroupId, setSelectedGroupId] = useState<string>(defaultTabId);
  const [prevScenarioId, setPrevScenarioId] = useState<string>(scenario.id);

  if (scenario.id !== prevScenarioId) {
    setPrevScenarioId(scenario.id);
    setSelectedGroupId(
      scenario.openNowSlots.length > 0
        ? "open"
        : scenario.laterTodaySlots.length > 0
          ? "later"
          : (scenario.upcomingDays[0]?.id ?? "all"),
    );
  }

  const activeGroup =
    scenario.allGroups.find((g) => g.id === selectedGroupId) ??
    scenario.allGroups[0] ??
    null;

  return (
    <section
      aria-label="Live Markets and Weekly Timetable"
      className="mt-8 bg-card ring-1 ring-board"
    >
      {/* Header matching HomePanel tone="open" + HomeAtlas header bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-board bg-[color-mix(in_srgb,var(--primary)_9%,var(--card))] px-4 py-3.5 sm:px-5">
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center bg-primary text-chalk shadow-[2px_2px_0_0_var(--board)]">
            <WeekMark className="size-5" />
          </span>
          <div>
            <p className="type-kicker text-muted-foreground">
              Live hall status &amp; seven-day market schedule · {scenario.todayFormatted}
            </p>
            <h2>Live &amp; Upcoming Markets</h2>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {scenario.openNowSlots.length > 0 ? (
            <span className="stall-chip-sm inline-flex items-center gap-2 bg-card px-3 py-1.5 ring-1 ring-board">
              <NowLabel className="text-sm">
                <span>
                  <span className="type-nums font-semibold">
                    {scenario.openNowSlots.length}
                  </span>{" "}
                  {scenario.openNowSlots.length === 1 ? "hall open now" : "halls open now"}
                </span>
              </NowLabel>
            </span>
          ) : (
            <span className="stall-chip-sm inline-flex items-center gap-1.5 bg-card px-3 py-1.5 text-sm font-medium text-board ring-1 ring-border">
              <span>Next doors open {scenario.upcomingDays[0]?.label ?? "soon"}</span>
            </span>
          )}
          <Link
            href="/markets/open-today"
            className="stall-chip-sm inline-flex h-9 items-center bg-primary px-3.5 text-sm font-medium text-primary-foreground hover:brightness-110"
          >
            Open today page
          </Link>
          <Link
            href="/events"
            className="text-sm font-medium text-primary underline underline-offset-4"
          >
            Month calendar
          </Link>
        </div>
      </div>

      {/* Interactive Day & Live Status Tabs */}
      <div
        role="tablist"
        aria-label="Choose market day"
        className="flex flex-wrap items-center gap-1.5 border-b border-border bg-secondary/45 px-4 py-3 sm:px-5"
      >
        {scenario.allGroups.map((group) => {
          const selected = activeGroup?.id === group.id;
          const isOpenGroup = group.id === "open";
          return (
            <button
              key={group.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setSelectedGroupId(group.id)}
              className={cn(
                "stall-chip-sm inline-flex cursor-pointer items-baseline gap-2 px-3 py-1.5 text-sm font-medium transition-colors",
                selected
                  ? isOpenGroup
                    ? "bg-stamp text-receipt"
                    : "bg-board text-chalk"
                  : isOpenGroup
                    ? "bg-card text-stamp ring-1 ring-stamp/50 hover:bg-secondary"
                    : "bg-card text-foreground ring-1 ring-border hover:bg-secondary",
              )}
            >
              <span>{group.label}</span>
              <span
                className={cn(
                  "type-nums text-sm",
                  selected
                    ? "text-chalk/85"
                    : isOpenGroup
                      ? "text-stamp"
                      : "text-muted-foreground",
                )}
              >
                {group.date} · {group.slots.length}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active Day Group Sub-Banner & 2-Column Unclipped Market Cards */}
      {activeGroup ? (
        <div>
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border bg-card px-4 py-2.5 sm:px-5">
            <div className="flex items-baseline gap-2.5">
              <h3>{activeGroup.label}</h3>
              <span className="text-sm text-muted-foreground">{activeGroup.hint}</span>
            </div>
            <span className="type-nums text-sm font-medium text-primary">
              {activeGroup.date} · {activeGroup.slots.length}{" "}
              {activeGroup.slots.length === 1 ? "market hall" : "market halls"}
            </span>
          </div>

          <ul className="grid gap-px bg-border md:grid-cols-2">
            {activeGroup.slots.map((slot) => (
              <LiveMarketHallCard
                key={slot.id}
                slot={slot}
                statusBadge={
                  activeGroup.id === "open"
                    ? "open"
                    : activeGroup.id === "later"
                      ? "later"
                      : activeGroup.id === "earlier"
                        ? "earlier"
                        : "upcoming"
                }
                onSelectNeighbourhood={onSelectNeighbourhood}
              />
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

/* ============================================================================
 * VARIANT C: SPLIT LIVE COMMAND DECK (7-COL LIVE HALLS + 5-COL STALLS ON FLOOR)
 * ========================================================================== */
function VariantCSplitLiveDispatch({
  scenario,
  onSelectNeighbourhood,
  onFilterTodayStalls,
}: {
  scenario: ClockScenarioSnapshot;
  onSelectNeighbourhood: (area: string) => void;
  onFilterTodayStalls: () => void;
}) {
  const hasOpen = scenario.openNowSlots.length > 0;
  const nextGroup = scenario.upcomingDays[0] ?? null;

  const primaryHalls = hasOpen
    ? scenario.openNowSlots
    : scenario.laterTodaySlots.length > 0
      ? scenario.laterTodaySlots
      : (nextGroup?.slots ?? []);

  return (
    <section
      aria-label="Live Halls and Stalls on the Floor"
      className="mt-8 grid gap-6 lg:grid-cols-12 lg:items-start"
    >
      {/* Left 7 Columns: Live / Next Up Market Halls */}
      <div className="bg-card shadow-[inset_4px_0_0_var(--stamp)] ring-1 ring-board lg:col-span-7">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-board bg-secondary px-4 py-3.5">
          <div className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center bg-stamp text-chalk shadow-[2px_2px_0_0_rgba(28,25,22,0.28)]">
              <RulesMark className="size-5" />
            </span>
            <div>
              <p className="type-kicker text-muted-foreground">
                {hasOpen
                  ? `Doors open right now · ${scenario.todayFormatted}`
                  : `Next market halls on the calendar · ${nextGroup?.label ?? scenario.todayFormatted}`}
              </p>
              <h2>
                {hasOpen
                  ? `${scenario.openNowSlots.length} ${scenario.openNowSlots.length === 1 ? "Market Open Now" : "Markets Open Now"}`
                  : `Next Opening Markets (${nextGroup?.label ?? "Upcoming"})`}
              </h2>
            </div>
          </div>

          <Link
            href="/markets/open-today"
            className="text-sm font-medium text-primary underline underline-offset-4"
          >
            All today&apos;s hours
          </Link>
        </div>

        <ul className="divide-y divide-border">
          {primaryHalls.slice(0, 4).map((slot) => (
            <LiveMarketHallCard
              key={slot.id}
              slot={slot}
              statusBadge={hasOpen ? "open" : "upcoming"}
              onSelectNeighbourhood={onSelectNeighbourhood}
            />
          ))}
        </ul>

        {/* Tomorrow / Upcoming Preview Strip at foot of Hall Card */}
        {hasOpen && nextGroup ? (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-secondary/45 px-4 py-2.5 text-sm">
            <span className="text-muted-foreground">
              Next on deck:{" "}
              <span className="font-medium text-foreground">
                {nextGroup.label} ({nextGroup.date})
              </span>{" "}
              — {nextGroup.slots.length}{" "}
              {nextGroup.slots.length === 1 ? "market hall" : "market halls"}
            </span>
            <Link href="/events" className="font-medium text-primary hover:underline">
              Full week timetable
            </Link>
          </div>
        ) : null}
      </div>

      {/* Right 5 Columns: Stalls Selling on the Floor Today */}
      <div className="bg-card ring-1 ring-board lg:col-span-5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-board bg-secondary px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 shrink-0 items-center justify-center bg-primary text-chalk shadow-[2px_2px_0_0_var(--board)]">
              <CrateMark className="size-5" />
            </span>
            <div>
              <p className="type-kicker text-muted-foreground">
                Growers, bakers &amp; makers at today&apos;s stalls
              </p>
              <h2>Stalls on the Floor</h2>
            </div>
          </div>
          <span className="type-nums text-sm font-medium text-stamp">
            {scenario.sellingTodayCount} active
          </span>
        </div>

        {scenario.sellingToday.length > 0 ? (
          <>
            <ul className="divide-y divide-border">
              {scenario.sellingToday.slice(0, 6).map((row) => {
                const logoUrl = scenario.vendorLogoBySlug[row.vendorSlug] ?? null;
                return (
                  <li
                    key={`${row.vendorSlug}-${row.marketSlug}`}
                    className="px-4 py-3 hover:bg-secondary/35"
                  >
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3">
                      <div className="flex min-w-0 items-start gap-2.5">
                        <StallEmblem
                          src={logoUrl}
                          name={row.vendorName}
                          kind="vendor"
                          size="sm"
                          className="mt-0.5"
                        />
                        <div className="min-w-0">
                          <p className="min-w-0">
                            <Link
                              href={`/vendors/${row.vendorSlug}`}
                              className="text-base font-medium text-foreground hover:text-primary hover:underline"
                            >
                              <VerifiedName slug={row.vendorSlug} name={row.vendorName} />
                            </Link>
                            <ListingScore
                              parens
                              ratingAvg={row.ratingAvg}
                              reviewCount={row.reviewCount}
                              className="ml-1.5 text-stamp"
                            />
                          </p>
                          <p className="mt-0.5 text-sm text-muted-foreground">
                            At{" "}
                            <Link
                              href={`/markets/${row.marketSlug}`}
                              className="font-medium text-foreground/85 hover:underline"
                            >
                              {row.marketName}
                            </Link>
                            {row.stall ? (
                              <span className="type-nums"> · Stall {row.stall}</span>
                            ) : null}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-x-2">
                            {row.open ? <NowLabel>Selling now</NowLabel> : null}
                            <Hours
                              value={row.hours}
                              className={
                                row.open ? "font-medium text-stamp" : "text-muted-foreground"
                              }
                            />
                          </div>
                        </div>
                      </div>

                      <SaveButton kind="vendor" slug={row.vendorSlug} name={row.vendorName} />
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="flex items-center justify-between border-t border-border bg-secondary/35 px-4 py-2.5 text-sm">
              <button
                type="button"
                onClick={onFilterTodayStalls}
                className="cursor-pointer font-medium text-stamp hover:underline"
              >
                Show today&apos;s stalls in the showcase below
              </button>
              <Link
                href="/markets#directory-vendors"
                className="font-medium text-primary hover:underline"
              >
                All stalls
              </Link>
            </div>
          </>
        ) : (
          <div className="p-4">
            <p className="text-base text-muted-foreground">
              Today&apos;s market stalls have packed up for the evening. Switch the clock bar above
              to <span className="font-medium text-foreground">Saturday 10:30 AM</span> or{" "}
              <span className="font-medium text-foreground">Tuesday 4:00 PM</span> to preview the
              live floor roster in action.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

/* ============================================================================
 * VENDOR TABLE CARD (From current HomeAtlas redesign so context is 100% real)
 * ========================================================================== */
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

        <div className="border-b border-border bg-secondary">
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
          {shownMarkets.map((market) => (
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
          ))}
        </ul>
      </div>
    </li>
  );
}

/* ============================================================================
 * MAIN LIVE MARKETS WORKBENCH COMPONENT
 * ========================================================================== */
export function LiveMarketsWorkbench({
  previewData,
  initialVariant = "A",
  initialScenario,
}: {
  previewData: LiveMarketsPreviewData;
  initialVariant?: VariantId;
  initialScenario?: ClockScenarioId;
}) {
  const router = useRouter();
  const { coords, requestAsync } = useGeo();

  const data = previewData.atlas;
  const [activeVariant, setActiveVariant] = useState<VariantId>(initialVariant);
  const [scenarioId, setScenarioId] = useState<ClockScenarioId>(
    initialScenario ?? previewData.defaultScenario,
  );
  const [showNotes, setShowNotes] = useState<boolean>(true);

  const scenario = previewData.scenarios[scenarioId];
  const currentSpec = VARIANTS.find((v) => v.id === activeVariant) ?? VARIANTS[0]!;

  const [q, setQ] = useState("");
  const [locating, setLocating] = useState(false);

  const [vendorAisleFilter, setVendorAisleFilter] = useState<string>("all");
  const [vendorAreaFilter, setVendorAreaFilter] = useState<string>("all");
  const [vendorWhenFilter, setVendorWhenFilter] = useState<"all" | "today" | "weekend">("all");

  const aislePhotoMap = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const aisle of data.aisles) {
      map.set(aisle.id, aisle.photoUrl);
    }
    return map;
  }, [data.aisles]);

  const logoVendors = useMemo(
    () => data.vendorSpotlights.filter((v) => Boolean(v.logoUrl)).slice(0, 8),
    [data.vendorSpotlights],
  );

  // Overlay scenario open/today state onto vendor cards so simulation feels live
  const scenarioVendorSpotlights = useMemo(() => {
    const openMarketSlugs = new Set(scenario.openNowSlots.map((s) => s.slug));
    const todayVendorSlugs = new Set(scenario.sellingToday.map((r) => r.vendorSlug));

    return data.vendorSpotlights.map((vendor) => {
      const updatedMarkets = vendor.markets.map((m) => ({
        ...m,
        openNow: openMarketSlugs.has(m.slug),
      }));
      const openNow = updatedMarkets.some((m) => m.openNow);
      const sellingToday = openNow || todayVendorSlugs.has(vendor.slug);
      const badge: HomeAtlasVendorSpotlight["badge"] = openNow
        ? "Selling now"
        : sellingToday
          ? "Later today"
          : vendor.onWeekend
            ? "Selling this weekend"
            : "On the schedule";

      return {
        ...vendor,
        openNow,
        sellingToday,
        badge,
        markets: updatedMarkets,
      };
    });
  }, [data.vendorSpotlights, scenario]);

  const filteredVendorSpotlights = useMemo(() => {
    const strict = scenarioVendorSpotlights.filter((vendor) => {
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
  }, [scenarioVendorSpotlights, vendorAisleFilter, vendorAreaFilter, vendorWhenFilter]);

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
    <div className="min-h-screen bg-background text-foreground">
      {/* Sticky Top Mockup Switcher & Clock State Simulator Bar */}
      <div className="sticky top-0 z-50 border-b-2 border-board bg-board text-chalk shadow-md">
        <div className="mx-auto max-w-7xl px-4 py-2.5 lg:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="stall-chip-sm flex size-8 shrink-0 items-center justify-center bg-stamp text-chalk">
                <WeekMark className="size-4" />
              </span>
              <div>
                <p className="type-kicker text-chalk/80">
                  Homepage Live Markets Visibility Mockup
                </p>
                <p className="text-base font-medium text-chalk">
                  Compare 3 cohesive placements &amp; test live vs. after-hours states
                </p>
              </div>
            </div>

            {/* 3 Layout Option Tabs */}
            <div
              role="tablist"
              aria-label="Choose live markets layout option"
              className="flex flex-wrap items-center gap-1.5"
            >
              {VARIANTS.map((v) => {
                const selected = v.id === activeVariant;
                return (
                  <button
                    key={v.id}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => setActiveVariant(v.id)}
                    className={cn(
                      "stall-chip-sm inline-flex h-9 cursor-pointer items-center gap-1.5 px-3 text-sm font-medium transition-colors",
                      selected
                        ? "bg-card text-primary"
                        : "bg-chalk/12 text-chalk hover:bg-chalk/22",
                    )}
                  >
                    <span>{v.shortLabel}</span>
                  </button>
                );
              })}
            </div>

            {/* Clock Simulator & Notes Toggle */}
            <div className="flex flex-wrap items-center gap-2">
              <div
                role="group"
                aria-label="Simulate time of day"
                className="flex flex-wrap items-center gap-1 border border-chalk/25 bg-black/20 p-1"
              >
                {(
                  [
                    { id: "tuesday-afternoon", label: "Tue 4 PM (7 open)" },
                    { id: "saturday-peak", label: "Sat 10:30 AM (Peak)" },
                    { id: "live-now", label: "After-hours (0 open)" },
                  ] as const
                ).map((item) => {
                  const on = scenarioId === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setScenarioId(item.id)}
                      className={cn(
                        "cursor-pointer px-2.5 py-1 text-sm font-medium transition-colors",
                        on
                          ? "bg-stamp text-receipt"
                          : "text-chalk/85 hover:bg-chalk/15 hover:text-chalk",
                      )}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setShowNotes((prev) => !prev)}
                className={cn(
                  "stall-chip-sm inline-flex h-9 cursor-pointer items-center gap-1.5 px-3 text-sm font-medium",
                  showNotes
                    ? "bg-primary text-primary-foreground"
                    : "bg-chalk/12 text-chalk hover:bg-chalk/22",
                )}
              >
                <TicketMark className="size-4" />
                <span>{showNotes ? "Hide notes" : "Design notes"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Collapsible Design Rationale Drawer */}
      {showNotes ? (
        <div className="border-b-2 border-board bg-board/95 text-chalk">
          <div className="mx-auto max-w-7xl px-4 py-3.5 lg:px-6">
            <div className="grid gap-4 lg:grid-cols-12 lg:items-center">
              <div className="lg:col-span-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="stall-chip-sm bg-stamp px-2.5 py-0.5 text-sm font-medium text-receipt">
                    {currentSpec.shortLabel}
                  </span>
                  <span className="text-sm text-chalk/80">
                    Clock: {scenario.shortLabel}
                  </span>
                </div>
                <h2 className="mt-1.5 text-chalk">{currentSpec.title}</h2>
                <p className="mt-1 text-sm text-chalk/85">{currentSpec.subtitle}</p>
              </div>

              <div className="lg:col-span-7">
                <ul className="grid gap-2 sm:grid-cols-3">
                  {currentSpec.highlights.map((bullet, idx) => (
                    <li
                      key={idx}
                      className="bg-black/20 p-2.5 text-sm leading-snug text-chalk/90 ring-1 ring-chalk/15"
                    >
                      <span className="type-nums mr-1.5 font-semibold text-stamp">
                        {idx + 1}.
                      </span>
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* ====================================================================
       * ACTUAL REDESIGNED HOMEPAGE (`HomeAtlas`) WITH LIVE MARKETS ELEVATED
       * ================================================================== */}
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
              {LAUNCH_CITY} vendors, products &amp; markets · {scenario.todayFormatted}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            {scenario.openNowSlots.length > 0 ? (
              <Link href="/markets/open-today" className="hover:underline">
                <NowLabel>
                  <span>
                    <span className="type-nums">{scenario.openNowSlots.length}</span>{" "}
                    {scenario.openNowSlots.length === 1 ? "hall open now" : "halls open now"}
                  </span>
                </NowLabel>
              </Link>
            ) : (
              <Link
                href="/markets/open-today"
                className="font-medium text-stamp hover:underline"
              >
                Next markets open {scenario.upcomingDays[0]?.label ?? "tomorrow"}
              </Link>
            )}
            <Link
              href="/markets#directory-vendors"
              className="font-medium text-primary hover:underline"
            >
              <span className="type-nums">{scenario.sellingTodayCount}</span> stalls active today
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
        {/* Masthead + Tri-Pillar Visual Census + (Variant A FloorStrip) + Search Deck */}
        <header id="find" className="scroll-mt-24 border-b-2 border-board pb-6">
          <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-7">
              <p className="type-kicker font-medium text-primary">
                Stalls, products &amp; neighbourhood markets in one view
              </p>
              <h1 className="mt-1">{LAUNCH_CITY} farmers&apos; markets</h1>
              <p className="type-lede mt-2 max-w-2xl text-muted-foreground">
                See which {LAUNCH_CITY} markets are open right now, meet the
                growers and bakers inside, and inspect what they sell.
              </p>
            </div>

            {/* 3-Stamp Ticket Strip */}
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

          {/* OPTION A: Masthead FloorStrip sits directly above the Search Deck */}
          {activeVariant === "A" ? (
            <VariantAMastheadFloorStrip
              scenario={scenario}
              onSelectNeighbourhood={(area) => setVendorAreaFilter(area)}
              onFilterTodayStalls={() => setVendorWhenFilter("today")}
            />
          ) : null}

          {/* Search & Visual Craving Shortcut Bar */}
          <div className="mt-5 bg-panel-find text-primary-foreground ring-1 ring-board">
            <div className="awning-leaf h-[7px] w-full" aria-hidden />
            <div className="p-4 sm:p-5">
              <form
                action="/markets"
                className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-center"
              >
                <div>
                  <label className="sr-only" htmlFor="atlas-live-search">
                    {SEARCH_LABEL}
                  </label>
                  <SearchField
                    id="atlas-live-search"
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

              <div className="mt-3.5 flex flex-wrap items-center gap-2 border-t border-primary-foreground/20 pt-3">
                <span className="type-kicker mr-1 text-chalk">
                  Jump to a craving or filter stalls:
                </span>
                {CRAVING_SHORTCUTS.map((item) => {
                  const active = vendorAisleFilter === item.aisleId;
                  const thumbUrl = aislePhotoMap.get(item.aisleId) ?? null;
                  return (
                    <button
                      key={item.href}
                      type="button"
                      onClick={() => setVendorAisleFilter(active ? "all" : item.aisleId)}
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

        {/* OPTION B: Above-the-Fold Live Hall & 7-Day Timetable Deck */}
        {activeVariant === "B" ? (
          <VariantBLiveTimetableDeck
            scenario={scenario}
            onSelectNeighbourhood={(area) => setVendorAreaFilter(area)}
          />
        ) : null}

        {/* OPTION C: Split Live Command Deck (7-Col Open Halls + 5-Col Stalls on Floor) */}
        {activeVariant === "C" ? (
          <VariantCSplitLiveDispatch
            scenario={scenario}
            onSelectNeighbourhood={(area) => setVendorAreaFilter(area)}
            onFilterTodayStalls={() => setVendorWhenFilter("today")}
          />
        ) : null}

        {/* PRIORITY VENDOR × PRODUCT × MARKET SHOWCASE (Cohesive Continuation) */}
        <section
          aria-label="Priority Vendor, Product, and Market Showcase"
          className="mt-8 bg-card ring-1 ring-board"
        >
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
              {logoVendors.length > 0 ? (
                <div
                  className="hidden items-center gap-1.5 xl:flex"
                  aria-label="Featured stall emblems"
                >
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

          <div className="grid gap-3 border-b border-border bg-secondary/40 px-4 py-3.5 sm:px-5 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-6">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="type-kicker mr-1 font-medium text-foreground">
                  1. Category:
                </span>
                <button
                  type="button"
                  onClick={() => setVendorAisleFilter("all")}
                  className={cn(
                    "stall-chip-sm cursor-pointer px-2.5 py-1 text-sm font-medium transition-colors",
                    vendorAisleFilter === "all"
                      ? "bg-primary text-primary-foreground"
                      : "bg-card text-foreground ring-1 ring-border hover:bg-secondary",
                  )}
                >
                  All stalls
                </button>
                {data.aisles.slice(0, 5).map((aisle) => {
                  const active = vendorAisleFilter === aisle.id;
                  return (
                    <button
                      key={aisle.id}
                      type="button"
                      onClick={() => setVendorAisleFilter(active ? "all" : aisle.id)}
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

            <div className="lg:col-span-4">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="type-kicker mr-1 font-medium text-foreground">
                  2. Neighbourhood:
                </span>
                <button
                  type="button"
                  onClick={() => setVendorAreaFilter("all")}
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
                      onClick={() => setVendorAreaFilter(active ? "all" : circuit.label)}
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

          <div className="p-4 sm:p-5">
            {filteredVendorSpotlights.length ? (
              <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {filteredVendorSpotlights.map((vendor) => (
                  <VendorTableCard
                    key={vendor.id}
                    vendor={vendor}
                    todayWeekday={scenario.todayWeekday}
                    onSelectAisle={(id) => setVendorAisleFilter(id)}
                    onSelectNeighbourhood={(area) => setVendorAreaFilter(area)}
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
      </div>
    </div>
  );
}
