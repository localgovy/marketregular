"use client";

import type { ReactNode, SVGProps } from "react";
import { useState } from "react";
import Link from "next/link";
import {
  BlocksMark,
  CrateMark,
  RulesMark,
  SignMark,
  SlatsMark,
  TallyMark,
  TicketMark,
  WeekMark,
} from "@/components/marks";
import { cn } from "@/lib/utils";

type SvgProps = SVGProps<SVGSVGElement>;

type SectionKey =
  | "find"
  | "week"
  | "vendorsToday"
  | "vendorsWeek"
  | "saved"
  | "weekly"
  | "map"
  | "directory";

interface SectionSpec {
  key: SectionKey;
  idLabel: string;
  kicker: string;
  title: string;
  action?: string;
  how: string;
  place: "page" | "rail";
  tone: "leaf" | "open" | "vendors" | "menus" | "saved" | "weekly" | "map" | "directory";
  currentMarkName: string;
  currentCritique: string;
  conceptNoteA: string;
  conceptNoteB: string;
  conceptNoteC: string;
}

const SECTIONS: SectionSpec[] = [
  {
    key: "find",
    idLabel: "section#find",
    kicker: "Find market and vendor profiles, quick and simple.",
    title: "Quick Market Finder",
    how: "Choose when, a neighbourhood or city, what they sell, or a cuisine.",
    place: "page",
    tone: "leaf",
    currentMarkName: "SlatsMark",
    currentCritique: "Three uneven horizontal bars read as a generic hamburger/skeleton placeholder.",
    conceptNoteA: "Mechanical brass-dial compass & reticle — precise wayfinding.",
    conceptNoteB: "5-pleat striped market canopy & valance over a search lens.",
    conceptNoteC: "Index tab register `" + "01 / FIND" + "`.",
  },
  {
    key: "week",
    idLabel: "section#week",
    kicker: "This week",
    title: "Upcoming markets",
    action: "Month calendar",
    how: "Open now means the market is selling right now. Tap a name for vendors and the map.",
    place: "page",
    tone: "open",
    currentMarkName: "WeekMark",
    currentCritique: "Seven vertical sticks with #6 taller looks like an audio equalizer or cell signal bars.",
    conceptNoteA: "Split-leaf desk almanac with twin rings, 7-day grid, and Saturday stamped.",
    conceptNoteB: "Hanging market-day chalkboard flip-calendar with twin hooks and date rule.",
    conceptNoteC: "Index tab register `" + "02 / WEEK" + "`.",
  },
  {
    key: "vendorsToday",
    idLabel: "section#vendors-today",
    kicker: "Vendors at market",
    title: "Vendors today",
    action: "18 listed",
    how: "Tap a vendor for the menu.",
    place: "rail",
    tone: "vendors",
    currentMarkName: "CrateMark",
    currentCritique: "Trapezoid roof over two vertical slots reads as a generic store/trash icon.",
    conceptNoteA: "Market counter scale with dual brass pans & central dial.",
    conceptNoteB: "Dovetail slatted harvest bushel crate brimming with root & leaf produce.",
    conceptNoteC: "Index tab register `" + "LIVE / STALLS" + "`.",
  },
  {
    key: "vendorsWeek",
    idLabel: "section#vendors-week",
    kicker: "This week's vendors",
    title: "Top 5 this week",
    how: "Five stalls with the most going on this week. Tap a name to learn more.",
    place: "rail",
    tone: "menus",
    currentMarkName: "TallyMark",
    currentCritique: "Four thick vertical bars and a rotated polygon feels crude and unrefined.",
    conceptNoteA: "Pleated County Fair Blue-Ribbon Rosette with twin notched tails.",
    conceptNoteB: "Five-star enamel hall plaque with precision 1–5 rank steps.",
    conceptNoteC: "Index tab register `" + "TOP 05" + "`.",
  },
  {
    key: "saved",
    idLabel: "section#saved",
    kicker: "On your list",
    title: "Saved",
    action: "Open list",
    how: "Markets, vendors, products, blog posts, and reviews on this account.",
    place: "rail",
    tone: "saved",
    currentMarkName: "TicketMark",
    currentCritique: "Off-center box with a single left bite and 3 lines looks misaligned at 16px.",
    conceptNoteA: "Symmetric twin-notched market admission stub with perforated tear line.",
    conceptNoteB: "Woven market basket with twin handles & tucked personal list slip.",
    conceptNoteC: "Index tab register `" + "KEPT" + "`.",
  },
  {
    key: "weekly",
    idLabel: "section#weekly",
    kicker: "This week",
    title: "Field notes from the Saturday circuit",
    action: "Read",
    how: "What came off the trucks first at Wychwood, Withrow, and St. Lawrence.",
    place: "page",
    tone: "weekly",
    currentMarkName: "SignMark",
    currentCritique: "Cut-corner square with 3 thick bars looks identical to a generic document icon.",
    conceptNoteA: "Folded broadsheet gazette with masthead rule, column divider & lead photo block.",
    conceptNoteB: "Fountain nib & field reporter’s brass-clip dispatch board.",
    conceptNoteC: "Index tab register `" + "03 / NOTE" + "`.",
  },
  {
    key: "map",
    idLabel: "section#map",
    kicker: "Around Toronto",
    title: "Map of Toronto markets",
    how: "The map loads here. Click a pin or cluster for the name and address.",
    place: "page",
    tone: "map",
    currentMarkName: "BlocksMark",
    currentCritique: "Tic-tac-toe # grid with a tiny box in the bottom-right corner.",
    conceptNoteA: "Toronto Lakefront & Don Valley street grid with precision surveyor’s pin.",
    conceptNoteB: "Triptych folded street atlas with plotted market route & cardinal rose.",
    conceptNoteC: "Index tab register `" + "04 / MAP" + "`.",
  },
  {
    key: "directory",
    idLabel: "section#directory",
    kicker: "A short list",
    title: "Markets",
    action: "All 130",
    how: "Open ones first. Tap a name, then save the ones you actually go to.",
    place: "page",
    tone: "directory",
    currentMarkName: "RulesMark",
    currentCritique: "Four horizontal bars — indistinguishable from a text-align-left icon.",
    conceptNoteA: "Archival Hall Ledger with notched A–Z thumb tabs & ruled entries.",
    conceptNoteB: "Grand Market Hall arched truss roof & colonnade facade.",
    conceptNoteC: "Index tab register `" + "05 / INDEX" + "`.",
  },
];

/* ============================================================================
 * LEGACY BASELINE MARKS (preserved here for side-by-side comparison)
 * ========================================================================== */
function LegacyBaselineMark({ section, className }: { section: SectionKey; className?: string }) {
  const base: SvgProps = {
    viewBox: "0 0 24 24",
    fill: "currentColor",
    className,
    "aria-hidden": true,
  };
  const platePath = (x: number, y: number, w: number, h: number, c = 1.6) =>
    `M${x + c} ${y}H${x + w - c}L${x + w} ${y + c}V${y + h - c}L${x + w - c} ${y + h}H${x + c}L${x} ${y + h - c}V${y + c}Z`;

  switch (section) {
    case "find":
      return (
        <svg {...base}>
          <path d={platePath(3, 3.4, 18, 4.4, 1.3)} />
          <path d={platePath(3, 9.8, 14.2, 4.4, 1.3)} />
          <path d={platePath(3, 16.2, 16.2, 4.4, 1.3)} />
        </svg>
      );
    case "week":
      return (
        <svg {...base}>
          <rect x="2.6" y="9" width="1.7" height="8" />
          <rect x="5.5" y="9" width="1.7" height="8" />
          <rect x="8.4" y="9" width="1.7" height="8" />
          <rect x="11.3" y="9" width="1.7" height="8" />
          <rect x="14.2" y="9" width="1.7" height="8" />
          <rect x="17.1" y="4.6" width="1.85" height="12.4" />
          <rect x="20.1" y="9" width="1.7" height="8" />
        </svg>
      );
    case "vendorsToday":
      return (
        <svg {...base}>
          <path d="M5.5 5h13l2.2 3.4H3.3Z" />
          <path
            fillRule="evenodd"
            d="M4 8.4h16v11.2H4Zm4.35 1.6h1.7v8h-1.7Zm5.6 0h1.7v8h-1.7Z"
          />
        </svg>
      );
    case "vendorsWeek":
      return (
        <svg {...base}>
          <rect x="3.2" y="3.8" width="2.15" height="16.4" />
          <rect x="6.9" y="3.8" width="2.15" height="16.4" />
          <rect x="10.6" y="3.8" width="2.15" height="16.4" />
          <rect x="14.3" y="3.8" width="2.15" height="16.4" />
          <polygon points="15.4,4.6 21.1,18.2 18.7,19.4 13,5.8" />
        </svg>
      );
    case "saved":
      return (
        <svg {...base}>
          <path
            fillRule="evenodd"
            d="M3 6.2h18v11.6H3ZM0.85 12a2.15 2.15 0 1 0 4.3 0 2.15 2.15 0 1 0-4.3 0ZM13.6 8.8h5.2v1.45h-5.2Zm0 2.7h4.1v1.45h-4.1Zm0 2.7h5.2v1.45h-5.2Z"
          />
        </svg>
      );
    case "weekly":
      return (
        <svg {...base}>
          <path
            fillRule="evenodd"
            d={`${platePath(3, 3, 18, 18, 2.4)}M7 7.2h10v2.4H7zm0 3.8h10v2.4H7zm0 3.8h7.2v2.4H7z`}
          />
        </svg>
      );
    case "map":
      return (
        <svg {...base}>
          <rect x="3" y="7.2" width="18" height="2.1" />
          <rect x="3" y="14.7" width="18" height="2.1" />
          <rect x="7.2" y="3" width="2.1" height="18" />
          <rect x="14.7" y="3" width="2.1" height="18" />
          <path d={platePath(16.6, 16.6, 4.6, 4.6, 1)} />
        </svg>
      );
    case "directory":
      return (
        <svg {...base}>
          <rect x="3" y="4.2" width="18" height="2.2" />
          <rect x="3" y="8.7" width="13.5" height="2.2" />
          <rect x="3" y="13.2" width="16.2" height="2.2" />
          <rect x="3" y="17.7" width="10.4" height="2.2" />
        </svg>
      );
  }
}

/* ============================================================================
 * DIRECTION 1: SWISS ARCHITECTURAL DRAFTING (1.5px Precision Line + Fill Accents)
 * Inspired by vintage architectural blueprints, surveyor instruments, and
 * municipal market hall signage.
 * ========================================================================== */
function DraftMark({ section, className }: { section: SectionKey; className?: string }) {
  const base: SvgProps = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.65,
    strokeLinecap: "square",
    strokeLinejoin: "miter",
    className,
    "aria-hidden": true,
  };

  switch (section) {
    case "find":
      // Precision Wayfinding Compass & Crosshair Reticle
      return (
        <svg {...base}>
          <circle cx="12" cy="12" r="8.25" />
          <line x1="12" y1="1.75" x2="12" y2="4.25" />
          <line x1="12" y1="19.75" x2="12" y2="22.25" />
          <line x1="1.75" y1="12" x2="4.25" y2="12" />
          <line x1="19.75" y1="12" x2="22.25" y2="12" />
          {/* Precision compass needle: North half filled, South half open */}
          <polygon
            points="12,12 9.8,9.8 15.8,8.2 14.2,14.2"
            fill="currentColor"
            stroke="none"
          />
          <polygon points="15.8,8.2 14.2,14.2 8.2,15.8 9.8,9.8" />
          <circle cx="12" cy="12" r="1.15" fill="currentColor" stroke="none" />
        </svg>
      );

    case "week":
      // Split-leaf Almanac Calendar with 7-day grid & highlighted Saturday cell
      return (
        <svg {...base}>
          <rect x="3" y="4.5" width="18" height="16.5" />
          <line x1="3" y1="9" x2="21" y2="9" />
          <line x1="7.5" y1="2.25" x2="7.5" y2="6" />
          <line x1="16.5" y1="2.25" x2="16.5" y2="6" />
          {/* 7-day precision matrix */}
          <rect x="5.5" y="11.2" width="2.2" height="2.2" fill="currentColor" stroke="none" />
          <rect x="9.2" y="11.2" width="2.2" height="2.2" fill="currentColor" stroke="none" />
          <rect x="12.9" y="11.2" width="2.2" height="2.2" fill="currentColor" stroke="none" />
          {/* Saturday highlighted with an outer frame */}
          <rect x="16.2" y="10.9" width="2.8" height="6.8" fill="currentColor" stroke="none" />
          <rect x="5.5" y="15.2" width="2.2" height="2.2" fill="currentColor" stroke="none" />
          <rect x="9.2" y="15.2" width="2.2" height="2.2" fill="currentColor" stroke="none" />
          <rect x="12.9" y="15.2" width="2.2" height="2.2" fill="currentColor" stroke="none" />
        </svg>
      );

    case "vendorsToday":
      // Countertop Brass Produce Scale (weighing pans + central dial)
      return (
        <svg {...base}>
          {/* Central pillar and base */}
          <path d="M8 20.5H16" />
          <path d="M10 20.5L11 14.5H13L14 20.5" />
          <circle cx="12" cy="11.5" r="2.75" />
          <line x1="12" y1="11.5" x2="13.2" y2="10.1" />
          {/* Balance beam & twin produce pans */}
          <line x1="4.5" y1="7.5" x2="19.5" y2="7.5" />
          <line x1="12" y1="5" x2="12" y2="8.75" />
          <path d="M2.75 7.5C2.75 9.6 4.2 10.8 6 10.8C7.8 10.8 9.25 9.6 9.25 7.5Z" fill="currentColor" stroke="none" />
          <path d="M14.75 7.5C14.75 9.6 16.2 10.8 18 10.8C19.8 10.8 21.25 9.6 21.25 7.5Z" fill="currentColor" stroke="none" />
        </svg>
      );

    case "vendorsWeek":
      // Prize Blue-Ribbon Rosette (County Fair Best-in-Show)
      return (
        <svg {...base}>
          {/* Twin notched tails */}
          <path d="M9.5 14.5L7.5 21.2L10.5 19.6L11.8 21.5L12 15" />
          <path d="M14.5 14.5L16.5 21.2L13.5 19.6L12.2 21.5" />
          {/* Scalloped 12-point rosette rim */}
          <polygon
            points="12,2.4 14.1,3.7 16.5,3.4 17.5,5.6 19.7,6.6 19.4,9.0 20.7,11.1 19.4,13.2 19.7,15.6 17.5,16.6 16.5,18.8 14.1,18.5 12,19.8 9.9,18.5 7.5,18.8 6.5,16.6 4.3,15.6 4.6,13.2 3.3,11.1 4.6,9.0 4.3,6.6 6.5,5.6 7.5,3.4 9.9,3.7"
          />
          <circle cx="12" cy="11.1" r="4.2" fill="currentColor" stroke="none" />
        </svg>
      );

    case "saved":
      // Symmetric Twin-Notch Perforated Admission Ticket
      return (
        <svg {...base}>
          <path d="M3 6.5H21V9.6C19.5 9.6 18.4 10.65 18.4 12C18.4 13.35 19.5 14.4 21 14.4V17.5H3V14.4C4.5 14.4 5.6 13.35 5.6 12C5.6 10.65 4.5 9.6 3 9.6V6.5Z" />
          <line x1="14.5" y1="6.5" x2="14.5" y2="8.4" />
          <line x1="14.5" y1="10.8" x2="14.5" y2="13.2" />
          <line x1="14.5" y1="15.6" x2="14.5" y2="17.5" />
          <line x1="7.5" y1="10.2" x2="11.8" y2="10.2" />
          <line x1="7.5" y1="13.8" x2="10.5" y2="13.8" />
        </svg>
      );

    case "weekly":
      // Folded Broadsheet Gazette with Masthead & Column Rule
      return (
        <svg {...base}>
          <path d="M3.5 4.5H17.5V19.5H5.5C4.4 19.5 3.5 18.6 3.5 17.5V4.5Z" />
          <path d="M17.5 8.5H20.5V17.5C20.5 18.6 19.6 19.5 18.5 19.5H17.5" />
          {/* Masthead block */}
          <rect x="6.2" y="7" width="8.6" height="2.4" fill="currentColor" stroke="none" />
          {/* 2-column broadsheet lines */}
          <line x1="6.2" y1="12" x2="9.6" y2="12" />
          <line x1="6.2" y1="14.5" x2="9.6" y2="14.5" />
          <line x1="6.2" y1="17" x2="9.6" y2="17" />
          <line x1="11.4" y1="12" x2="14.8" y2="12" />
          <line x1="11.4" y1="14.5" x2="14.8" y2="14.5" />
          <line x1="11.4" y1="17" x2="14.8" y2="17" />
        </svg>
      );

    case "map":
      // Toronto Shoreline & Street Grid with Surveyor Pin
      return (
        <svg {...base}>
          <rect x="3" y="3.5" width="18" height="17" />
          {/* Street grid lines */}
          <line x1="3" y1="14.5" x2="21" y2="11.5" />
          <line x1="9.2" y1="3.5" x2="7.5" y2="20.5" />
          {/* Surveyor location pin */}
          <path
            d="M14.5 6.2C12.7 6.2 11.3 7.6 11.3 9.4C11.3 11.7 14.5 15.2 14.5 15.2C14.5 15.2 17.7 11.7 17.7 9.4C17.7 7.6 16.3 6.2 14.5 6.2Z"
            fill="currentColor"
            stroke="none"
          />
          <circle cx="14.5" cy="9.3" r="1.25" fill="var(--card)" stroke="none" />
        </svg>
      );

    case "directory":
      // Archival Hall Ledger with A-Z Index Tabs
      return (
        <svg {...base}>
          <rect x="4" y="3.5" width="13.5" height="17" />
          {/* Spine rule */}
          <line x1="7.2" y1="3.5" x2="7.2" y2="20.5" />
          {/* Stepped index tabs on right edge */}
          <path d="M17.5 5.5H20.2V9H17.5" fill="currentColor" stroke="none" />
          <path d="M17.5 10.2H20.2V13.7H17.5" />
          <path d="M17.5 15H20.2V18.5H17.5" />
          {/* Ledger lines */}
          <line x1="9.8" y1="8" x2="14.8" y2="8" />
          <line x1="9.8" y1="12" x2="14.8" y2="12" />
          <line x1="9.8" y1="16" x2="13.2" y2="16" />
        </svg>
      );
  }
}

/* ============================================================================
 * DIRECTION 2: FARMERS' HALL WOODCUT & SIGNWRITER STAMPS (Canonical Production Marks)
 * Renders the exact production components from @/components/marks.
 * ========================================================================== */
function WoodcutMark({ section, className }: { section: SectionKey; className?: string }) {
  switch (section) {
    case "find":
      return <SlatsMark className={className} />;
    case "week":
      return <WeekMark className={className} />;
    case "vendorsToday":
      return <CrateMark className={className} />;
    case "vendorsWeek":
      return <TallyMark className={className} />;
    case "saved":
      return <TicketMark className={className} />;
    case "weekly":
      return <SignMark className={className} />;
    case "map":
      return <BlocksMark className={className} />;
    case "directory":
      return <RulesMark className={className} />;
  }
}

/* ============================================================================
 * DIRECTION 3: ENAMEL STALL NUMBER PLATES & TICKET PUNCHES (No Pictograms)
 * Replaces little icons altogether with authentic stall-board typography,
 * brass rivets, or clean architectural rules so nothing ever reads as an
 * icon pack or AI-drawn glyph.
 * ========================================================================== */
const STALL_NUMBERS: Record<SectionKey, { num: string; code: string }> = {
  find: { num: "01", code: "FIND" },
  week: { num: "02", code: "WEEK" },
  vendorsToday: { num: "LIVE", code: "NOW" },
  vendorsWeek: { num: "TOP", code: "five" },
  saved: { num: "KEPT", code: "LIST" },
  weekly: { num: "03", code: "NOTE" },
  map: { num: "04", code: "MAP" },
  directory: { num: "05", code: "HALLS" },
};

/* ============================================================================
 * PANEL HEADER MOCKUP RENDERER
 * Renders the exact HomePanel header context so the user can judge how each
 * design looks inside the actual section header.
 * ========================================================================== */
type DesignVariant =
  | "current"
  | "swiss-framed"
  | "woodcut-seal"
  | "bare-botanical"
  | "enamel-number"
  | "ruled-ledger";

function MockupPanelHeader({
  spec,
  variant,
}: {
  spec: SectionSpec;
  variant: DesignVariant;
}) {
  const leaf = spec.tone === "leaf";
  const rail = spec.place === "rail";

  const shellClass = leaf
    ? "bg-panel-find text-primary-foreground"
    : "bg-card text-card-foreground ring-1 ring-border";

  const bandClass =
    spec.tone === "leaf"
      ? "awning-leaf"
      : spec.tone === "open"
        ? "bg-[color-mix(in_srgb,var(--primary)_9%,var(--card))]"
        : undefined;

  // Current mark container colors from home-panel.tsx
  const currentChipTone =
    spec.tone === "leaf"
      ? "bg-primary-foreground/15 text-primary-foreground"
      : spec.tone === "open"
        ? "bg-primary text-primary-foreground"
        : spec.tone === "vendors"
          ? "bg-stamp/15 text-stamp"
          : spec.tone === "menus"
            ? "bg-foreground text-receipt"
            : spec.tone === "map"
              ? "bg-secondary text-primary"
              : "bg-secondary text-muted-foreground";

  // Refined double-bordered architectural plate colors
  const swissPlateTone =
    spec.tone === "leaf"
      ? "border-chalk/50 bg-board/60 text-chalk shadow-[inset_0_0_0_2px_rgba(243,238,228,0.12)]"
      : spec.tone === "open"
        ? "border-primary bg-primary/10 text-primary shadow-[inset_0_0_0_2px_rgba(58,101,88,0.12)]"
        : spec.tone === "vendors"
          ? "border-stamp/60 bg-stamp/10 text-stamp shadow-[inset_0_0_0_2px_rgba(158,74,62,0.1)]"
          : spec.tone === "menus"
            ? "border-foreground bg-secondary text-foreground shadow-[inset_0_0_0_2px_rgba(28,25,22,0.08)]"
            : "border-border bg-secondary/70 text-foreground shadow-[inset_0_0_0_2px_rgba(28,25,22,0.05)]";

  // Woodcut solid enamel stamp colors
  const woodcutPlateTone =
    spec.tone === "leaf"
      ? "bg-chalk text-board shadow-[2px_2px_0_0_rgba(28,25,22,0.35)]"
      : spec.tone === "open"
        ? "bg-primary text-chalk shadow-[2px_2px_0_0_var(--board)]"
        : spec.tone === "vendors"
          ? "bg-stamp text-chalk shadow-[2px_2px_0_0_rgba(28,25,22,0.28)]"
          : spec.tone === "menus"
            ? "bg-foreground text-receipt shadow-[2px_2px_0_0_var(--stamp)]"
            : "bg-board text-chalk shadow-[2px_2px_0_0_rgba(28,25,22,0.25)]";

  return (
    <div className={cn(" flex flex-col justify-between", shellClass)}>
      {spec.tone === "leaf" ? <div className="awning-leaf h-[7px] w-full" aria-hidden /> : null}
      <div
        className={cn(
          rail
            ? "flex flex-col gap-1 px-4 pt-4 pb-3"
            : "flex flex-wrap items-end justify-between gap-3 px-4 pt-3.5 pb-3.5",
          spec.tone !== "leaf" && bandClass,
        )}
      >
        <div className="flex min-w-0 items-start gap-3">
          {/* BADGE / MARK VARIANT */}
          {variant === "current" && (
            <span
              className={cn(
                "mt-0.5 flex shrink-0 items-center justify-center stall-chip-sm",
                rail ? "size-8" : "size-9",
                currentChipTone,
              )}
            >
              <LegacyBaselineMark section={spec.key} className={rail ? "size-4" : "size-5"} />
            </span>
          )}

          {variant === "swiss-framed" && (
            <span
              className={cn(
                "mt-0.5 flex shrink-0 items-center justify-center border",
                rail ? "size-8" : "size-9",
                swissPlateTone,
              )}
            >
              <DraftMark section={spec.key} className={rail ? "size-[18px]" : "size-5"} />
            </span>
          )}

          {variant === "woodcut-seal" && (
            <span
              className={cn(
                "mt-0.5 flex shrink-0 items-center justify-center",
                rail ? "size-8" : "size-9",
                woodcutPlateTone,
              )}
            >
              <WoodcutMark section={spec.key} className={rail ? "size-[18px]" : "size-5"} />
            </span>
          )}

          {variant === "bare-botanical" && (
            <span
              className={cn(
                "mt-1 flex shrink-0 items-center justify-center border-r pr-2.5",
                leaf
                  ? "border-chalk/30 text-chalk"
                  : spec.tone === "vendors"
                    ? "border-border text-stamp"
                    : "border-border text-primary",
              )}
            >
              <DraftMark section={spec.key} className={rail ? "size-5" : "size-6"} />
            </span>
          )}

          {variant === "enamel-number" && (
            <span
              className={cn(
                "mt-0.5 flex shrink-0 flex-col items-center justify-center border px-1.5 leading-none",
                rail ? "h-8 min-w-9" : "h-9 min-w-10",
                leaf
                  ? "border-chalk/50 bg-board text-chalk"
                  : spec.tone === "vendors"
                    ? "border-stamp bg-stamp text-chalk"
                    : spec.tone === "menus"
                      ? "border-foreground bg-foreground text-receipt"
                      : "border-foreground/80 bg-secondary text-foreground",
              )}
            >
              <span className="type-census text-sm leading-none">
                {STALL_NUMBERS[spec.key].num}
              </span>
            </span>
          )}

          {variant === "ruled-ledger" && (
            <span
              aria-hidden
              className={cn(
                "mt-1 w-1.5 shrink-0 self-stretch",
                leaf
                  ? "bg-chalk"
                  : spec.tone === "vendors"
                    ? "bg-stamp"
                    : spec.tone === "menus"
                      ? "bg-foreground"
                      : "bg-primary",
              )}
            />
          )}

          {/* TEXT BLOCK */}
          <div className="min-w-0">
            <p className={cn("type-kicker", leaf ? "text-chalk" : "text-muted-foreground")}>
              {spec.kicker}
              {rail && spec.action ? (
                <span className={cn(leaf ? "text-primary-foreground" : "text-primary")}>
                  {" "}
                  · <span className="underline underline-offset-4">{spec.action}</span>
                </span>
              ) : null}
            </p>
            <h2 className={rail ? "type-column" : undefined}>{spec.title}</h2>
          </div>
        </div>

        {!rail && spec.action ? (
          <div
            className={cn(
              "shrink-0 text-base font-medium underline underline-offset-4",
              leaf ? "text-primary-foreground" : "text-primary",
            )}
          >
            {spec.action}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function MarksPreviewPage() {
  const [activeDirection, setActiveDirection] = useState<DesignVariant>("woodcut-seal");

  const directions: Array<{
    id: DesignVariant;
    label: string;
    subtitle: string;
    summary: string;
  }> = [
    {
      id: "swiss-framed",
      label: "Direction A · Architectural Drafting Plates",
      subtitle: "1.65px geometric line + selective solid fills inside a double-hairline square plate",
      summary:
        "Drops the octagonal `stall-chip-sm` bevel clip-path. Uses crisp 90° architectural framing with bespoke instruments: a split-needle wayfinding compass, 7-day almanac grid, twin-pan brass produce scale, county-fair prize rosette, perforated admission stub, folded broadsheet, street map pin, and tabbed ledger.",
    },
    {
      id: "woodcut-seal",
      label: "Direction B · Market Hall Woodcut Stamps",
      subtitle: "High-contrast linocut/signwriter silhouettes on tactile offset-shadow enamel tiles",
      summary:
        "Bold negative-space stamps inspired by physical farmers' market artifacts: a 5-pleat striped stall canopy, hanging iron-hook calendar board, slatted dovetail crate overflowing with leafy produce, crown hall plaque, woven shopper's basket, brass-clip dispatch board, folded triptych atlas, and brick market hall arch.",
    },
    {
      id: "bare-botanical",
      label: "Direction C · Unboxed Hairline Divider + Mark",
      subtitle: "No square box around the icon — the mark sits cleanly beside a vertical rule",
      summary:
        "Eliminates the 36×36 background tile altogether. The precision architectural mark sits directly on the paper or green panel surface, separated from the kicker and heading by a crisp vertical hairline rule.",
    },
    {
      id: "enamel-number",
      label: "Direction D · Stall Number Plates (Zero Icons)",
      subtitle: "Replaces pictograms with Barlow Condensed ExtraBold (`type-census`) stall numbers",
      summary:
        "If any icon feels superfluous, this direction uses the site's existing `type-census` face (`01`, `02`, `LIVE`, `TOP`, `03`, `04`, `05`) stamped into a sharp enamel stall number plate — 100% typographic and impossible to mistake for an icon pack.",
    },
    {
      id: "ruled-ledger",
      label: "Direction E · Pure Editorial Rule Bar (No Badge)",
      subtitle: "Removes the badge box completely in favor of a solid color-coded vertical bar",
      summary:
        "Follows the same language as the `FloorStrip` (`shadow-[inset_4px_0_0_var(--stamp)]`). Lets the kicker and Mona Sans heading carry the hierarchy without any square badge.",
    },
    {
      id: "current",
      label: "Current (Baseline to Replace)",
      subtitle: "Octagonal `stall-chip-sm` with abstract rectangles (`SlatsMark`, `WeekMark`, `RulesMark`, etc.)",
      summary:
        "Shown for direct A/B comparison so you can see every flaw side-by-side.",
    },
  ];

  const activeSpec = directions.find((d) => d.id === activeDirection) ?? directions[0]!;

  return (
    <div className="min-h-screen bg-background pb-20 text-foreground">
      {/* Top Workbench Bar */}
      <div className="sticky top-0 z-30 border-b-2 border-board bg-board text-chalk">
        <div className="mx-auto max-w-7xl px-4 py-4 lg:px-6">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <div>
              <p className="type-kicker text-chalk/80">Section Header &amp; Mark Redesign Lab</p>
              <h1 className="text-chalk">Panel Marks &amp; Header Lockups</h1>
            </div>
            <Link
              href="/"
              className="border border-chalk/40 bg-chalk/10 px-3.5 py-2 text-sm font-medium text-chalk hover:bg-chalk/20"
            >
              View live homepage
            </Link>
          </div>

          {/* Direction Selector Tabs */}
          <div className="mt-4 flex flex-wrap gap-2">
            {directions.map((dir) => {
              const on = dir.id === activeDirection;
              return (
                <button
                  key={dir.id}
                  type="button"
                  onClick={() => setActiveDirection(dir.id)}
                  className={cn(
                    "cursor-pointer border px-3.5 py-2 text-left text-sm font-medium transition-colors",
                    on
                      ? "border-chalk bg-card text-foreground"
                      : "border-chalk/30 bg-board text-chalk hover:bg-chalk/15",
                  )}
                >
                  {dir.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 pt-6 lg:px-6">
        {/* Section 0: 10x (240px) SVG Construction Grid Loupe */}
        <section className="mb-8 bg-card p-5 ring-1 ring-border">
          <div className="border-b border-border pb-3">
            <h2>10× Construction Grid Loupe — Direction B Woodcut Stamps</h2>
            <p className="mt-1 text-base text-muted-foreground">
              Every stamp inspected at 240×240px on its 24×24 coordinate grid alongside its exact 36px page tile and 32px rail tile.
            </p>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {SECTIONS.map((spec) => (
              <figure
                key={spec.key}
                className="flex flex-col justify-between border border-border bg-background p-3.5"
              >
                <figcaption className="mb-2.5 flex items-baseline justify-between gap-2">
                  <span className="text-base font-medium text-foreground">{spec.title}</span>
                  <span className="type-nums text-sm text-muted-foreground">{spec.idLabel}</span>
                </figcaption>
                <div className="relative mx-auto size-60 bg-secondary/70 ring-1 ring-border">
                  <svg
                    viewBox="0 0 24 24"
                    className="absolute inset-0 size-full text-foreground/15"
                    aria-hidden
                  >
                    {Array.from({ length: 25 }, (_, index) => (
                      <g key={index}>
                        <line
                          x1={index}
                          y1="0"
                          x2={index}
                          y2="24"
                          stroke="currentColor"
                          strokeWidth="0.04"
                        />
                        <line
                          x1="0"
                          y1={index}
                          x2="24"
                          y2={index}
                          stroke="currentColor"
                          strokeWidth="0.04"
                        />
                      </g>
                    ))}
                  </svg>
                  <WoodcutMark section={spec.key} className="relative size-60 text-board" />
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-9 items-center justify-center bg-board text-chalk shadow-[2px_2px_0_0_rgba(28,25,22,0.25)]">
                      <WoodcutMark section={spec.key} className="size-5" />
                    </span>
                    <span className="flex size-8 items-center justify-center bg-stamp text-chalk shadow-[2px_2px_0_0_rgba(28,25,22,0.28)]">
                      <WoodcutMark section={spec.key} className="size-[18px]" />
                    </span>
                  </div>
                  <span className="type-nums text-sm text-muted-foreground">36px / 32px</span>
                </div>
              </figure>
            ))}
          </div>
        </section>

        {/* Section 1: Close-Up Mark Inspection Sheet (All 8 Sections Side by Side) */}
        <section className="mb-8 bg-card p-5 ring-1 ring-border">
          <div className="border-b border-border pb-3">
            <h2>1. Precision Drawing Sheet — All 8 Section Marks Compared</h2>
            <p className="mt-1 text-base text-muted-foreground">
              Every mark drawn from scratch on a 24×24 grid specifically for the section&apos;s actual role on MarketRegular.
            </p>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SECTIONS.map((spec) => (
              <div
                key={spec.key}
                className="flex flex-col justify-between border border-border bg-background/60 p-4"
              >
                <div>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-base font-medium text-foreground">{spec.title}</span>
                    <span className="type-nums text-sm text-muted-foreground">{spec.idLabel}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{spec.currentCritique}</p>
                </div>

                {/* 3-Way Icon Comparison Strip */}
                <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-3">
                  {/* Current */}
                  <div className="flex flex-col items-center gap-1.5 bg-card p-2.5 ring-1 ring-border">
                    <span className="stall-chip-sm flex size-10 items-center justify-center bg-secondary text-muted-foreground">
                      <LegacyBaselineMark section={spec.key} className="size-5" />
                    </span>
                    <span className="text-sm text-muted-foreground">Old</span>
                  </div>

                  {/* Direction A: Architectural Drafting */}
                  <div className="flex flex-col items-center gap-1.5 bg-card p-2.5 ring-1 ring-primary/40">
                    <span className="flex size-10 items-center justify-center border border-primary bg-primary/10 text-primary shadow-[inset_0_0_0_2px_rgba(58,101,88,0.12)]">
                      <DraftMark section={spec.key} className="size-5" />
                    </span>
                    <span className="text-sm font-medium text-primary">A · Draft</span>
                  </div>

                  {/* Direction B: Woodcut Stamp */}
                  <div className="flex flex-col items-center gap-1.5 bg-card p-2.5 ring-1 ring-board/40">
                    <span className="flex size-10 items-center justify-center bg-board text-chalk shadow-[2px_2px_0_0_rgba(28,25,22,0.28)]">
                      <WoodcutMark section={spec.key} className="size-5" />
                    </span>
                    <span className="text-sm font-medium text-board">B · Stamp</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 2: Interactive Live Context Preview (Homepage Layout Simulation) */}
        <section className="mb-8">
          <div className="mb-4 bg-card p-4 ring-1 ring-border">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2>2. In-Context Homepage Header Preview — {activeSpec.label}</h2>
              <span className="text-sm font-medium text-primary">{activeSpec.subtitle}</span>
            </div>
            <p className="mt-1 text-base text-muted-foreground">{activeSpec.summary}</p>
          </div>

          {/* Simulated Homepage Main Column + Right Rail */}
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start">
            {/* Main Column */}
            <div className="flex flex-col gap-5">
              {SECTIONS.filter((s) => s.place === "page").map((spec) => (
                <div key={spec.key} className="grid gap-2">
                  <MockupPanelHeader spec={spec} variant={activeDirection} />
                </div>
              ))}
            </div>

            {/* Right Rail */}
            <div className="flex flex-col gap-5">
              {SECTIONS.filter((s) => s.place === "rail").map((spec) => (
                <div key={spec.key} className="grid gap-2">
                  <MockupPanelHeader spec={spec} variant={activeDirection} />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 3: Side-by-Side All 5 Alternatives on "Quick Market Finder", "Upcoming Markets", and "Markets Directory" */}
        <section className="bg-card p-5 ring-1 ring-border">
          <div className="border-b border-border pb-3">
            <h2>3. Side-by-Side Header Lockup Matrix</h2>
            <p className="mt-1 text-base text-muted-foreground">
              Compare how all 5 original directions handle the green Finder panel, the Upcoming Markets timetable header, the Vendors Today rail header, and the Markets directory header.
            </p>
          </div>

          <div className="mt-5 grid gap-6 lg:grid-cols-2">
            {(
              [
                "swiss-framed",
                "woodcut-seal",
                "bare-botanical",
                "enamel-number",
              ] as DesignVariant[]
            ).map((variantId) => {
              const info = directions.find((d) => d.id === variantId)!;
              return (
                <div key={variantId} className="border border-border bg-background p-4">
                  <div className="mb-3 border-b border-border pb-2">
                    <h3>{info.label}</h3>
                    <p className="text-sm text-muted-foreground">{info.subtitle}</p>
                  </div>
                  <div className="grid gap-3">
                    <MockupPanelHeader
                      spec={SECTIONS.find((s) => s.key === "find")!}
                      variant={variantId}
                    />
                    <MockupPanelHeader
                      spec={SECTIONS.find((s) => s.key === "week")!}
                      variant={variantId}
                    />
                    <MockupPanelHeader
                      spec={SECTIONS.find((s) => s.key === "vendorsToday")!}
                      variant={variantId}
                    />
                    <MockupPanelHeader
                      spec={SECTIONS.find((s) => s.key === "directory")!}
                      variant={variantId}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
