"use client";

import { useState } from "react";
import Link from "next/link";
import { MarketsConceptAtlas } from "@/app/preview/_components/markets-concept-atlas";
import { MarketsConceptBoard } from "@/app/preview/_components/markets-concept-board";
import { MarketsConceptWeek } from "@/app/preview/_components/markets-concept-week";
import type { MarketsPreviewData } from "@/app/preview/_lib/markets-preview-data";
import { CrateMark, TicketMark } from "@/components/marks";
import { cn } from "@/lib/utils";

type ConceptId = "1" | "2" | "3";

const CONCEPTS: Array<{
  id: ConceptId;
  shortLabel: string;
  title: string;
  subtitle: string;
  standaloneHref: string;
  focus: string;
  highlights: string[];
}> = [
  {
    id: "1",
    shortLabel: "1 · Markets & Stalls Atlas",
    title: "The Markets, Stalls & Products Atlas",
    subtitle:
      "Direct counterpart to ProductsAtlas & VendorAtlas — 7/5 dual-plate masthead, 8-column visual market cards, and 4-column sticky market inspector & stalls rail",
    standaloneHref: "/preview/market-1",
    focus:
      "Optimized for browsing markets as rich visual cards (with their stalls, products, and prices) while inspecting any market or filtering stalls in the sticky right rail.",
    highlights: [
      "Dual-plate masthead pairing the 7-column forest-green search, category chip, and census plate with a 5-column Market Spotlight & Live Map toggle plate.",
      "8-column filterable Markets Directory with a 1-click toggle between 2-column Atlas Market Cards (showing each market's stalls, products & prices) and Compact Rows.",
      "Sticky 4-column rail combining a live Market Inspector (click any market to preview its full stall roster) with the Featured Stalls directory (#directory-vendors).",
    ],
  },
  {
    id: "2",
    shortLabel: "2 · Map, Timetable & Stall Explorer",
    title: "The Interactive Map, 7-Day Timetable & Market-Stall Explorer",
    subtitle:
      "Dual-plate search + live map masthead, 2-column 7-day weekly schedule, and a 5/7 master-detail Market & Stall Roster stage",
    standaloneHref: "/preview/market-2",
    focus:
      "Optimized for spatial & day-of-week planning — see the 7-day schedule above the fold, then click any market to explore and filter its full stall & menu roster.",
    highlights: [
      "Dual-plate masthead pairing the 7-column forest-green search & day-of-week filter plate with a 5-column live interactive map and active market telemetry card.",
      "Above-the-fold 2-column 7-Day Weekly Market Schedule where every session's hours sit in an unclipped auto column.",
      "12-column Master-Detail Market Explorer: click any market in the 5-column list to inspect and filter its stalls, menu items, and prices in the 7-column forest-green stage.",
    ],
  },
  {
    id: "3",
    shortLabel: "3 · Dual-Column Markets & Vendors",
    title: "The Dual-Column Markets & Vendors Atlas + Live Floor Strip",
    subtitle:
      "Preserves the signature side-by-side Markets | Vendors split of /markets, elevated with the Dual-Plate Masthead, Live Floor Strip, and Atlas cards",
    standaloneHref: "/preview/market-3",
    focus:
      "Optimized for side-by-side comparison of matching Markets (left) and matching Vendors (right) with an expandable All-Filters drawer.",
    highlights: [
      "Dual-plate masthead with an expandable All-Filters drawer (When, Top districts, Product specialties) and a Featured Market Spotlight switcher card.",
      "Stamp-bordered Live / Next-Up Floor Strip above the directory highlighting Saturday, Sunday, and Midweek markets with their anchor stalls.",
      "Classic side-by-side Markets (5fr) | vertical board rule | Vendors & Map (7fr) layout, upgraded with forest-green Atlas Market Cards and receipt-framed Vendor Cards.",
    ],
  },
];

export function MarketsPreviewWorkbench({
  data,
  initialConcept = "1",
}: {
  data: MarketsPreviewData;
  initialConcept?: ConceptId;
  basePath?: string;
}) {
  const [activeConcept, setActiveConcept] = useState<ConceptId>(initialConcept);
  const [clockMode, setClockMode] = useState<"saturday" | "live">("saturday");
  const [showNotes, setShowNotes] = useState(false);
  const currentSpec = CONCEPTS.find((c) => c.id === activeConcept) ?? CONCEPTS[0]!;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top Workbench Bar */}
      <div className="border-b-2 border-board bg-board text-chalk shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-2.5 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="stall-chip-sm flex size-8 shrink-0 items-center justify-center bg-stamp text-chalk">
                <CrateMark className="size-4" />
              </span>
              <div>
                <p className="type-kicker text-chalk/80">Markets Page Redesign Workbench</p>
                <p className="text-base font-medium text-chalk">
                  Compare 3 Atlas concepts for /markets
                </p>
              </div>
            </div>

            {/* Concept Switcher Tabs */}
            <div
              role="tablist"
              aria-label="Choose markets page concept"
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
                      "stall-chip-sm cursor-pointer px-3.5 py-2 text-sm font-medium transition-colors",
                      selected
                        ? "bg-receipt text-foreground"
                        : "bg-stamp/80 text-chalk hover:bg-stamp",
                    )}
                  >
                    {concept.shortLabel}
                  </button>
                );
              })}
            </div>

            {/* Clock Scenario Toggle + Notes + Links */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center rounded-lg bg-foreground/25 p-0.5 ring-1 ring-chalk/20">
                <button
                  type="button"
                  onClick={() => setClockMode("saturday")}
                  className={cn(
                    "cursor-pointer rounded-md px-2.5 py-1 text-sm font-medium transition-colors",
                    clockMode === "saturday"
                      ? "bg-receipt text-foreground"
                      : "text-chalk/85 hover:text-chalk",
                  )}
                >
                  Saturday peak ({data.saturdayOpenCount} open)
                </button>
                <button
                  type="button"
                  onClick={() => setClockMode("live")}
                  className={cn(
                    "cursor-pointer rounded-md px-2.5 py-1 text-sm font-medium transition-colors",
                    clockMode === "live"
                      ? "bg-receipt text-foreground"
                      : "text-chalk/85 hover:text-chalk",
                  )}
                >
                  Live clock
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowNotes((v) => !v)}
                className="cursor-pointer rounded-md bg-foreground/25 px-2.5 py-1.5 text-sm font-medium text-chalk ring-1 ring-chalk/20 hover:bg-foreground/40"
              >
                {showNotes ? "Hide notes" : "Design notes"}
              </button>
              <Link
                href={currentSpec.standaloneHref}
                className="text-sm font-medium text-chalk underline decoration-chalk/50 underline-offset-4 hover:decoration-chalk"
              >
                {currentSpec.standaloneHref} →
              </Link>
              <Link
                href="/markets"
                className="text-sm text-chalk/80 hover:text-chalk hover:underline"
              >
                Current live page →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Collapsible Concept Brief Banner */}
      {showNotes ? (
        <div className="border-b border-border bg-secondary/45">
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
            <div className="grid gap-4 lg:grid-cols-12 lg:items-center">
              <div className="lg:col-span-5">
                <div className="flex items-center gap-2 text-sm font-medium text-primary">
                  <TicketMark className="size-4" />
                  <span>{currentSpec.shortLabel}</span>
                </div>
                <h2 className="mt-1">{currentSpec.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{currentSpec.subtitle}</p>
                <p className="mt-2 text-sm font-medium text-foreground">{currentSpec.focus}</p>
              </div>
              <div className="lg:col-span-7">
                <ul className="grid gap-2 sm:grid-cols-3">
                  {currentSpec.highlights.map((note) => (
                    <li
                      key={note}
                      className="rounded-lg bg-receipt p-3 text-sm text-foreground ring-1 ring-border"
                    >
                      {note}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <main>
        {activeConcept === "1" ? (
          <MarketsConceptWeek data={data} clockMode={clockMode} />
        ) : activeConcept === "2" ? (
          <MarketsConceptBoard data={data} clockMode={clockMode} />
        ) : (
          <MarketsConceptAtlas data={data} clockMode={clockMode} />
        )}
      </main>
    </div>
  );
}
