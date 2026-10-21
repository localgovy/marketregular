"use client";

import { useState } from "react";
import Link from "next/link";
import { VendorConceptAtlas } from "@/app/preview/_components/vendor-concept-atlas";
import { VendorConceptCatalogue } from "@/app/preview/_components/vendor-concept-catalogue";
import { VendorConceptCounter } from "@/app/preview/_components/vendor-concept-counter";
import type { VendorPreviewData } from "@/app/preview/_lib/vendor-preview-data";
import {
  CrateMark,
  TicketMark,
} from "@/components/marks";
import { cn } from "@/lib/utils";

type VendorConceptId = "1" | "2" | "3";

const VENDOR_CONCEPTS: Array<{
  id: VendorConceptId;
  shortLabel: string;
  title: string;
  subtitle: string;
  standaloneHref: string;
  focus: string;
  highlights: string[];
}> = [
  {
    id: "1",
    shortLabel: "1 · Market Counter & Slip",
    title: "The Market Counter & Sticky Order Slip",
    subtitle: "High-conversion stall counter with interactive order slip, fulfillment selector & per-item category comparison",
    standaloneHref: "/preview/vendor-1",
    focus: "Optimized for direct stall ordering, pickup hall selection, and fast menu filtering.",
    highlights: [
      "8-column filterable stall menu with section tabs, dietary chips, fulfillment filters (Pickup, Pre-order, Delivery), and per-item Compare (/find/*) links.",
      "Sticky 4-column Stall Order Slip with quantity steppers, pickup market hall selector, subtotal in .type-nums, and direct checkout handoff (/vendors/[slug]/buy/[itemId]).",
      "Bottom discovery spread pairing Broad Product & Category Crates with Peer Stalls in the same aisle.",
    ],
  },
  {
    id: "2",
    shortLabel: "2 · Visual Catalogue & Aisle Explorer",
    title: "The Visual Stall Catalogue & Aisle Explorer",
    subtitle: "Visual product cards, 1-click Card/Receipt toggle, and an interactive Market-Wide Aisle Explorer band",
    standaloneHref: "/preview/vendor-2",
    focus: "Optimized for visual merchandising, browsing products as cards, and comparing peer stalls across aisles.",
    highlights: [
      "Split masthead pairing the stall identity, story, and 3-stamp census strip with a Signature Table Showcase & Express Checkout card.",
      "Shoppers can toggle between 3-column Visual Product Cards (with fulfillment badges, + Add to order, Buy now, and category comparison footer) and the compact Receipt List.",
      "Interactive dark-board Market-Wide Aisle Explorer band lets shoppers switch between the vendor's product categories to inspect curated /find guides and peer stalls.",
    ],
  },
  {
    id: "3",
    shortLabel: "3 · Hall Circuit, Table & Maker Atlas",
    title: "The Hall Circuit, Table & Maker Atlas",
    subtitle: "Direct sibling to the Priority Atlas Homepage — unifying the Stall Table, Quick-Buy Drawer & Fellow Hall Stalls",
    standaloneHref: "/preview/vendor-3",
    focus: "Optimized for planning a market visit around this vendor, their table items, and fellow stalls at the same halls.",
    highlights: [
      "Tri-panel Atlas header pairing the enamel stall plate with a Next Market Setup & Table Photo card.",
      "Docked Quick-Buy & Pre-Order Drawer at the top of the 8-column Stall Table, synchronized with the active market hall.",
      "Interactive 4-column Market Hall Circuit rail: click any hall where the vendor sets up to see unclipped hours AND fellow stalls at that exact hall.",
    ],
  },
];

export function VendorPreviewWorkbench({
  data,
  initialConcept = "3",
  basePath = "/preview/vendors",
}: {
  data: VendorPreviewData;
  initialConcept?: VendorConceptId;
  basePath?: string;
}) {
  const [activeConcept, setActiveConcept] = useState<VendorConceptId>(initialConcept);
  const [storefrontMode, setStorefrontMode] = useState<"active" | "live">("active");
  const [showNotes, setShowNotes] = useState<boolean>(true);

  const currentSpec =
    VENDOR_CONCEPTS.find((c) => c.id === activeConcept) ?? VENDOR_CONCEPTS[0]!;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Sticky Top Workbench Bar */}
      <div className="sticky top-0 z-50 border-b-2 border-board bg-board text-chalk shadow-md">
        <div className="mx-auto max-w-7xl px-4 py-2.5 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="stall-chip-sm flex size-8 shrink-0 items-center justify-center bg-stamp text-chalk">
                <CrateMark className="size-4" />
              </span>
              <div>
                <p className="type-kicker text-chalk/80">Vendor Page Redesign Workbench</p>
                <p className="text-base font-medium text-chalk">
                  Active selling, stall profile &amp; cross-vendor discovery
                </p>
              </div>
            </div>

            {/* Concept Switcher Tabs */}
            <div
              role="tablist"
              aria-label="Choose vendor page concept"
              className="flex flex-wrap items-center gap-1.5"
            >
              {VENDOR_CONCEPTS.map((concept) => {
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

            {/* Storefront Selling Mode Toggle + Notes Toggle */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center rounded-lg bg-foreground/25 p-0.5 ring-1 ring-chalk/20">
                <button
                  type="button"
                  onClick={() => setStorefrontMode("active")}
                  className={cn(
                    "cursor-pointer rounded-md px-2.5 py-1 text-sm font-medium transition-colors",
                    storefrontMode === "active"
                      ? "bg-receipt text-foreground"
                      : "text-chalk/85 hover:text-chalk",
                  )}
                >
                  Active storefront
                </button>
                <button
                  type="button"
                  onClick={() => setStorefrontMode("live")}
                  className={cn(
                    "cursor-pointer rounded-md px-2.5 py-1 text-sm font-medium transition-colors",
                    storefrontMode === "live"
                      ? "bg-receipt text-foreground"
                      : "text-chalk/85 hover:text-chalk",
                  )}
                >
                  Live DB state
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowNotes((v) => !v)}
                className="cursor-pointer rounded-md bg-foreground/25 px-2.5 py-1.5 text-sm font-medium text-chalk ring-1 ring-chalk/20 hover:bg-foreground/40"
              >
                {showNotes ? "Hide notes" : "Design notes"}
              </button>
            </div>
          </div>

          {/* Sample Vendor Switcher Bar */}
          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-chalk/15 pt-2 text-sm">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-chalk/75">Sample stall:</span>
              {data.sampleVendors.map((sample) => {
                const isCurrent = sample.slug === data.vendor.slug;
                return (
                  <Link
                    key={sample.slug}
                    href={`${basePath}?vendor=${encodeURIComponent(sample.slug)}`}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-sm font-medium transition-colors",
                      isCurrent
                        ? "bg-receipt text-foreground"
                        : "bg-foreground/25 text-chalk/90 hover:bg-foreground/40 hover:text-chalk",
                    )}
                  >
                    <span>{sample.name}</span>
                    <span className={isCurrent ? "ml-1 text-muted-foreground" : "ml-1 text-chalk/70"}>
                      · {sample.label}
                    </span>
                  </Link>
                );
              })}
            </div>

            <div className="flex items-center gap-3">
              <Link
                href={`${currentSpec.standaloneHref}?vendor=${encodeURIComponent(data.vendor.slug)}`}
                className="text-sm font-medium text-chalk underline decoration-chalk/50 underline-offset-4 hover:decoration-chalk"
              >
                Standalone route ({currentSpec.standaloneHref}) →
              </Link>
              <Link
                href={`/vendors/${data.vendor.slug}`}
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
              </div>
              <div className="lg:col-span-7">
                <ul className="grid gap-2 sm:grid-cols-3">
                  {currentSpec.highlights.map((note, idx) => (
                    <li
                      key={idx}
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

      {/* Active Vendor Concept Render */}
      <main>
        {activeConcept === "1" ? (
          <VendorConceptCounter data={data} storefrontMode={storefrontMode} />
        ) : activeConcept === "2" ? (
          <VendorConceptCatalogue data={data} storefrontMode={storefrontMode} />
        ) : (
          <VendorConceptAtlas data={data} storefrontMode={storefrontMode} />
        )}
      </main>
    </div>
  );
}
