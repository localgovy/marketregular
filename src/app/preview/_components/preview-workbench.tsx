"use client";

import { useState } from "react";
import Link from "next/link";
import { ConceptBroadsheet } from "@/app/preview/_components/concept-broadsheet";
import { ConceptDispatchBoard } from "@/app/preview/_components/concept-dispatch-board";
import { ConceptNeighbourhoodAtlas } from "@/app/preview/_components/concept-neighbourhood-atlas";
import type { HomePreviewData } from "@/app/preview/_lib/home-preview-data";
import {
  BlocksMark,
  CrateMark,
  RulesMark,
  SlatsMark,
  TagMark,
  TicketMark,
  WeekMark,
} from "@/components/marks";
import { cn } from "@/lib/utils";

type ConceptId = "1" | "2" | "3";

const CONCEPTS: Array<{
  id: ConceptId;
  shortLabel: string;
  title: string;
  subtitle: string;
  standaloneHref: string;
  primaryQuestion: string;
  keyInnovations: string[];
  critiqueRefinement: string;
}> = [
  {
    id: "1",
    shortLabel: "Concept 1 · Broadsheet",
    title: "The Saturday Broadsheet & Almanac",
    subtitle: "Editorial print-inspired weekly schedule, compact enamel finder & 3-column stall gazette",
    standaloneHref: "/preview/home-1",
    primaryQuestion: "“When can I go this week, and what is the weekly market rhythm?”",
    keyInnovations: [
      "Replaces the tall vertical filter form with a compact, single-ribbon Quick Market Finder featuring expandable Neighbourhood, Product, and Cuisine drawers.",
      "Elevates the 7-day Market Schedule above the fold as a 2-column broadsheet spread with day-by-day tabs and a live Open Now masthead ribbon.",
      "Pairs the schedule with a featured Field Note dispatch, a 2x2 photographic Category grid, a 6-card Neighbourhood strip, and a 3-column Stall Gazette.",
    ],
    critiqueRefinement:
      "Refined in Iteration 2 to default the schedule to the full 6-day weekday grid (avoiding duplication with the Open Now masthead strip), added a vertical broadsheet column rule, and balanced column heights across the spread.",
  },
  {
    id: "2",
    shortLabel: "Concept 2 · Departure Board",
    title: "The Grand Hall Departure Board",
    subtitle: "High-contrast chalkboard command console, live client-side filterable hall ledger & tabbed floor wire",
    standaloneHref: "/preview/home-2",
    primaryQuestion: "“Which of the 130 halls are operating, and how do I filter them right on the page?”",
    keyInnovations: [
      "Architectural chalkboard-green command masthead with live hall telemetry (open halls, active stalls today, and Barlow Condensed ExtraBold census figures).",
      "Instant client-side filtering of all 130 Toronto & GTA markets right on the homepage by time window, neighbourhood, indoor/outdoor setup, or stall category — plus a 1-click toggle between Board and Board + Map views.",
      "Docks a 3-tab Stalls & Floor Wire (Selling Today, Top 5 Week, Floor Notes) and a compact 2-column Weekly Hall Frequency filter beside the ledger.",
    ],
    critiqueRefinement:
      "Refined in Iteration 2 to unlock all 130 markets for live client-side filtering, populate real product photos across all 8 Produce & Pantry Exchange cards, and compact the Weekly Hall Frequency into a 2-column grid for symmetrical column termination.",
  },
  {
    id: "3",
    shortLabel: "Concept 3 · Vendors, Products & Atlas",
    title: "The Priority Stall, Product & Neighbourhood Atlas",
    subtitle: "Unified Vendor × Product × Market matrix above the fold with synchronized category crates & live map",
    standaloneHref: "/preview/home-3",
    primaryQuestion: "“Which vendors make what I'm craving, what do they sell, and which markets do they set up at?”",
    keyInnovations: [
      "Puts Vendors in priority above the fold in a 6-card Featured Stalls, Products & Markets showcase: each card pairs the vendor's stall plate, live status, dashed-rule menu items/prices ('Menu highlights'), and exact markets + unclipped hours ('Where they set up').",
      "Provides a 3-way interactive filter bar (Category × Neighbourhood × Selling Window) that synchronizes in real time with the Products & Categories explorer and the Live Neighbourhood Atlas below.",
      "Enriches every Product Crate with the top stalls known for that category, and every neighbourhood card with both its markets and anchor vendors.",
    ],
    critiqueRefinement:
      "Evolved to unify Vendors, Products, and Markets as equal first-class citizens — elevating vendor cards above the fold and cross-linking every category and neighbourhood with its participating stalls.",
  },
];

export function PreviewWorkbench({
  data,
  initialConcept = "1",
}: {
  data: HomePreviewData;
  initialConcept?: ConceptId;
}) {
  const [activeConcept, setActiveConcept] = useState<ConceptId>(initialConcept);
  const [showNotes, setShowNotes] = useState<boolean>(true);

  const currentSpec = CONCEPTS.find((c) => c.id === activeConcept) ?? CONCEPTS[0]!;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Sticky 1-Line Design Comparison Switcher Dock */}
      <div className="sticky top-0 z-50 border-b-2 border-board bg-board text-chalk shadow-md">
        <div className="mx-auto max-w-7xl px-4 py-2.5 lg:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="stall-chip-sm flex size-8 shrink-0 items-center justify-center bg-stamp text-chalk">
                <SlatsMark className="size-4" />
              </span>
              <div>
                <p className="type-kicker text-chalk/80">Homepage UI/UX Design Workbench</p>
                <p className="text-base font-medium text-chalk">
                  Compare 3 isolated homepage concepts
                </p>
              </div>
            </div>

            {/* Concept Switcher Tabs */}
            <div
              role="tablist"
              aria-label="Choose homepage concept"
              className="flex flex-wrap items-center gap-1.5"
            >
              {CONCEPTS.map((concept) => {
                const selected = concept.id === activeConcept;
                return (
                  <button
                    key={concept.id}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => setActiveConcept(concept.id)}
                    className={cn(
                      "stall-chip-sm inline-flex h-10 cursor-pointer items-center gap-2 px-3.5 text-sm font-medium transition-colors",
                      selected
                        ? "bg-card text-primary"
                        : "bg-chalk/12 text-chalk hover:bg-chalk/22",
                    )}
                  >
                    <span className="type-nums font-semibold">{concept.id}.</span>
                    <span>{concept.shortLabel.replace(/^Concept \d · /, "")}</span>
                  </button>
                );
              })}
            </div>

            {/* Utility Controls: Toggle Spec Sheet, Open Standalone, View Production */}
            <div className="flex flex-wrap items-center gap-2">
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
                <span>{showNotes ? "Hide design notes" : "Show design notes"}</span>
              </button>
              <Link
                href={currentSpec.standaloneHref}
                className="stall-chip-sm inline-flex h-9 items-center bg-chalk/15 px-3 text-sm font-medium text-chalk hover:bg-chalk/25"
              >
                Standalone URL
              </Link>
              <Link
                href="/"
                className="stall-chip-sm inline-flex h-9 items-center bg-chalk/15 px-3 text-sm font-medium text-chalk hover:bg-chalk/25"
              >
                Current live home
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Non-sticky Collapsible Design Rationale & Critique Drawer */}
      {showNotes ? (
        <div className="border-b-2 border-board bg-board/95 text-chalk">
          <div className="mx-auto max-w-7xl px-4 py-4 lg:px-6">
            <div className="grid gap-4 lg:grid-cols-12">
              <div className="lg:col-span-5">
                <div className="flex items-baseline gap-2">
                  <span className="stall-chip-sm bg-stamp px-2 py-0.5 text-sm font-medium text-chalk">
                    {currentSpec.shortLabel}
                  </span>
                  <span className="type-nums text-sm text-chalk/75">
                    Route: {currentSpec.standaloneHref}
                  </span>
                </div>
                <h2 className="mt-1.5 text-chalk">{currentSpec.title}</h2>
                <p className="mt-1 text-sm text-chalk/85">{currentSpec.subtitle}</p>
                <p className="mt-2 border-l-2 border-stamp pl-3 text-sm font-medium text-chalk">
                  Core shopper question: {currentSpec.primaryQuestion}
                </p>
              </div>

              <div className="lg:col-span-4">
                <p className="type-kicker font-medium text-chalk/80">
                  Architectural &amp; UX decisions
                </p>
                <ul className="mt-1.5 space-y-1 text-sm text-chalk/90">
                  {currentSpec.keyInnovations.map((bullet, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="type-nums font-semibold text-stamp">{i + 1}.</span>
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-col justify-between bg-black/20 p-3 ring-1 ring-chalk/15 lg:col-span-3">
                <div>
                  <p className="type-kicker font-medium text-chalk/80">
                    Visual critique &amp; refinement
                  </p>
                  <p className="mt-1 text-sm leading-snug text-chalk/90">
                    {currentSpec.critiqueRefinement}
                  </p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 border-t border-chalk/15 pt-2 text-sm">
                  <Link
                    href="/preview/home-1"
                    className="text-chalk underline underline-offset-4 hover:text-white"
                  >
                    /preview/home-1
                  </Link>
                  <span aria-hidden className="text-chalk/40">
                    ·
                  </span>
                  <Link
                    href="/preview/home-2"
                    className="text-chalk underline underline-offset-4 hover:text-white"
                  >
                    /preview/home-2
                  </Link>
                  <span aria-hidden className="text-chalk/40">
                    ·
                  </span>
                  <Link
                    href="/preview/home-3"
                    className="text-chalk underline underline-offset-4 hover:text-white"
                  >
                    /preview/home-3
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Active Concept Viewport */}
      <div role="tabpanel" aria-label={currentSpec.title}>
        {activeConcept === "1" ? <ConceptBroadsheet data={data} /> : null}
        {activeConcept === "2" ? <ConceptDispatchBoard data={data} /> : null}
        {activeConcept === "3" ? <ConceptNeighbourhoodAtlas data={data} /> : null}
      </div>
    </div>
  );
}
