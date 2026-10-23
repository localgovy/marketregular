"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import {
  AsteriskMark,
  CaretDownMark,
  PlateMark,
  SearchMark,
  TagMark,
  TallyMark,
  TicketMark,
  WeekMark,
} from "@/components/marks";
import { SiteWordmark } from "@/components/site-mark";
import { SEARCH_PLACEHOLDER, SITE_NAME } from "@/lib/constants";
import { SITE_NAV } from "@/lib/nav";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Shared mock pieces                                                  */
/* ------------------------------------------------------------------ */

const ACTIVE = "/markets";

function stop(event: FormEvent) {
  event.preventDefault();
}

function MockSearch({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <form
      onSubmit={stop}
      role="search"
      className={cn("relative min-w-0", className)}
    >
      <div className="flex min-w-0 items-stretch rounded-[2px] border border-[#cfc6b6] bg-receipt shadow-[inset_0_1px_0_#fff] focus-within:border-primary focus-within:ring-3 focus-within:ring-primary/20">
        <span className="relative min-w-0 flex-1">
          <SearchMark className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            aria-label="Search markets and vendors"
            placeholder={compact ? "Search markets…" : SEARCH_PLACEHOLDER}
            className="h-10 w-full min-w-0 bg-transparent pr-3 pl-9 text-base text-foreground outline-none placeholder:text-muted-foreground lg:h-11"
          />
        </span>
        {!compact ? (
          <button
            type="submit"
            className="shrink-0 self-stretch bg-primary px-3 text-sm font-medium text-primary-foreground"
          >
            Find
          </button>
        ) : null}
      </div>
    </form>
  );
}

function ChalkSearch({ className }: { className?: string }) {
  return (
    <form
      onSubmit={stop}
      role="search"
      className={cn("relative min-w-0", className)}
    >
      <div className="flex min-w-0 items-stretch border-2 border-dashed border-chalk/50 bg-chalk/10 focus-within:border-chalk">
        <span className="relative min-w-0 flex-1">
          <SearchMark className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-chalk/70" />
          <input
            type="search"
            aria-label="Search markets and vendors"
            placeholder="Chalk in a market, vendor…"
            className="h-10 w-full min-w-0 bg-transparent pr-3 pl-9 text-base text-chalk outline-none placeholder:text-chalk/60"
          />
        </span>
        <button
          type="submit"
          className="shrink-0 self-stretch bg-chalk px-3 text-sm font-medium text-board"
        >
          Find
        </button>
      </div>
    </form>
  );
}

/** Small stretch of page under each header, so the bar is judged in place. */
function PagePeek({ label }: { label: string }) {
  return (
    <div className="bg-background px-4 py-4 sm:px-5" aria-hidden>
      <p className="text-sm text-muted-foreground">Toronto · Saturday</p>
      <p className="font-heading mt-1 text-2xl font-semibold text-foreground">
        Toronto farmers&rsquo; markets
      </p>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{label}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {["Open now", "This week", "Near you"].map((chip) => (
          <span
            key={chip}
            className="stall-chip-sm inline-flex h-8 items-center bg-secondary px-2.5 text-sm font-medium text-foreground"
          >
            {chip}
          </span>
        ))}
      </div>
    </div>
  );
}

function Frame({
  title,
  heightNote,
  children,
}: {
  title: string;
  heightNote: string;
  children: React.ReactNode;
}) {
  return (
    <figure className="min-w-0">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2 pb-2">
        <span className="text-sm font-medium text-foreground">{title}</span>
        <span className="type-nums text-sm text-muted-foreground">
          {heightNote}
        </span>
      </figcaption>
      <div className="border-2 border-board bg-background shadow-[4px_4px_0_0_var(--board)]">
        {children}
      </div>
    </figure>
  );
}

/* ------------------------------------------------------------------ */
/* Concept 0 — current header, for reference                           */
/* ------------------------------------------------------------------ */

function CurrentDesktop() {
  return (
    <header className="bg-background/85">
      <div className="flex h-16 items-stretch border-b-2 border-board">
        <span className="inline-flex items-center bg-board px-5 text-chalk">
          <SiteWordmark className="header-lockup" />
        </span>
        <div className="flex min-w-0 flex-1 items-center gap-3 px-5">
          <nav
            aria-label="Primary (mock)"
            className="flex h-11 shrink-0 items-stretch divide-x divide-border border border-border bg-secondary"
          >
            {SITE_NAV.map((item) => (
              <span
                key={item.href}
                className={cn(
                  "inline-flex items-center px-3 text-sm font-medium whitespace-nowrap",
                  item.href === ACTIVE &&
                    "bg-card shadow-[inset_0_-3px_0_0_var(--primary)]",
                )}
              >
                {item.label}
              </span>
            ))}
          </nav>
          <MockSearch className="min-w-0 flex-1" />
          <span className="hidden shrink-0 items-center gap-1 text-sm font-medium whitespace-nowrap xl:inline-flex">
            Market/Vendor Portal <CaretDownMark className="size-3.5" />
          </span>
          <span className="shrink-0 text-sm font-medium">Sign in</span>
        </div>
      </div>
    </header>
  );
}

function CurrentMobile() {
  return (
    <header className="bg-background">
      <div className="flex h-12 items-center gap-2 px-3">
        <span className="inline-flex shrink-0 items-center text-board">
          <SiteWordmark />
        </span>
        <MockSearch compact className="min-w-0 flex-1" />
        <span className="shrink-0 text-sm font-medium">Sign in</span>
      </div>
      <nav
        aria-label="Primary (mock)"
        className="header-stripe-paper flex h-10 divide-x divide-border border-t border-border bg-secondary"
      >
        {SITE_NAV.map((item) => (
          <span
            key={item.href}
            className={cn(
              "inline-flex h-10 min-w-0 flex-1 items-center justify-center px-1 text-center text-sm font-medium whitespace-nowrap",
              item.href === ACTIVE &&
                "bg-card shadow-[inset_0_-3px_0_0_var(--primary)]",
            )}
          >
            {item.label}
          </span>
        ))}
      </nav>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Concept 1 — The Awning                                              */
/* ------------------------------------------------------------------ */

function AwningStrip({ scallops }: { scallops: number }) {
  return (
    <div aria-hidden>
      <div
        className="h-4"
        style={{
          backgroundImage:
            "repeating-linear-gradient(-45deg, var(--primary) 0 14px, var(--chalk) 14px 28px)",
        }}
      />
      <div className="flex bg-transparent">
        {Array.from({ length: scallops }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-3 flex-1 rounded-b-full",
              i % 2 === 0 ? "bg-primary" : "bg-chalk",
            )}
          />
        ))}
      </div>
    </div>
  );
}

function HangingWordmark() {
  return (
    <span className="relative inline-flex shrink-0 items-center self-start bg-board px-4 pt-4 pb-3 text-chalk shadow-[3px_3px_0_0_rgba(28,25,22,0.35)]">
      <span
        aria-hidden
        className="absolute top-1 left-3 size-1.5 rounded-full bg-chalk/70"
      />
      <span
        aria-hidden
        className="absolute top-1 right-3 size-1.5 rounded-full bg-chalk/70"
      />
      <SiteWordmark className="header-lockup" />
    </span>
  );
}

function PriceTag({
  label,
  active,
  tilt,
}: {
  label: string;
  active?: boolean;
  tilt: string;
}) {
  return (
    <span
      className={cn(
        "stall-chip relative inline-flex h-9 shrink-0 items-center gap-1.5 px-3 pt-1 text-sm font-medium whitespace-nowrap shadow-[2px_2px_0_0_rgba(28,25,22,0.25)]",
        tilt,
        active
          ? "bg-stamp text-chalk"
          : "bg-card text-foreground hover:bg-secondary",
      )}
    >
      <TagMark className="size-3.5 shrink-0 opacity-70" />
      {label}
    </span>
  );
}

const TILTS = ["-rotate-1", "rotate-1", "-rotate-[0.5deg]", "rotate-[0.5deg]"];

function AwningDesktop() {
  return (
    <header className="bg-secondary">
      <AwningStrip scallops={28} />
      <div className="flex items-start gap-4 px-4 pt-1 pb-3">
        <HangingWordmark />
        <div className="min-w-0 flex-1 pt-2">
          <nav
            aria-label="Primary (mock)"
            className="flex flex-wrap items-center gap-2"
          >
            {SITE_NAV.map((item, i) => (
              <PriceTag
                key={item.href}
                label={item.label}
                active={item.href === ACTIVE}
                tilt={TILTS[i % TILTS.length]!}
              />
            ))}
          </nav>
          <div className="flex items-center gap-3 pt-3">
            <MockSearch className="w-full max-w-md min-w-0" />
            <span className="hidden shrink-0 items-center gap-1 text-sm font-medium whitespace-nowrap xl:inline-flex">
              Market/Vendor Portal <CaretDownMark className="size-3.5" />
            </span>
            <span className="stall-chip inline-flex h-9 shrink-0 -rotate-1 items-center bg-foreground px-3 text-sm font-medium text-background">
              Sign in
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

function AwningMobile() {
  return (
    <header className="bg-secondary">
      <AwningStrip scallops={14} />
      <div className="flex items-start gap-2 px-3 pt-1 pb-2">
        <HangingWordmark />
        <span className="stall-chip ml-auto inline-flex h-9 shrink-0 -rotate-1 items-center bg-foreground px-3 pt-1 text-sm font-medium text-background">
          Sign in
        </span>
      </div>
      <nav
        aria-label="Primary (mock)"
        className="flex gap-2 overflow-x-auto px-3 pb-2"
      >
        {SITE_NAV.map((item, i) => (
          <PriceTag
            key={item.href}
            label={item.label}
            active={item.href === ACTIVE}
            tilt={TILTS[i % TILTS.length]!}
          />
        ))}
      </nav>
      <div className="px-3 pb-3">
        <MockSearch compact />
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Concept 2 — The Hall Board                                          */
/* ------------------------------------------------------------------ */

function CensusFigure({ value, label }: { value: string; label: string }) {
  return (
    <span className="inline-flex shrink-0 items-baseline gap-1.5 whitespace-nowrap">
      <span className="type-census text-3xl leading-none text-chalk">
        {value}
      </span>
      <span className="text-sm text-chalk/80">{label}</span>
    </span>
  );
}

function BoardDesktop() {
  return (
    <header
      className="bg-board text-chalk"
      style={{
        backgroundImage:
          "radial-gradient(rgba(243,238,228,0.07) 1px, transparent 1.4px)",
        backgroundSize: "22px 22px",
      }}
    >
      <div className="flex items-center gap-5 px-5 pt-3">
        <span className="inline-flex shrink-0 items-center border-b-2 border-dashed border-chalk/40 pb-2 text-chalk">
          <SiteWordmark className="header-lockup" />
        </span>
        <div className="flex shrink-0 items-center gap-5">
          <CensusFigure value="12" label="open now" />
          <CensusFigure value="39" label="markets this week" />
          <CensusFigure value="214" label="stalls today" />
        </div>
        <ChalkSearch className="ml-auto w-full max-w-xs min-w-0" />
      </div>
      <nav
        aria-label="Primary (mock)"
        className="mt-3 flex items-center gap-2 border-t border-dashed border-chalk/40 px-5 py-2.5"
      >
        <TallyMark className="size-5 shrink-0 text-stamp" />
        {SITE_NAV.map((item) =>
          item.href === ACTIVE ? (
            <span
              key={item.href}
              className="stall-chip relative inline-flex h-9 shrink-0 items-center gap-1.5 bg-chalk px-3 text-sm font-medium whitespace-nowrap text-board"
            >
              <PlateMark className="size-4 shrink-0" />
              {item.label}
            </span>
          ) : (
            <span
              key={item.href}
              className="inline-flex h-9 shrink-0 items-center border border-chalk/50 px-3 text-sm font-medium whitespace-nowrap text-chalk hover:bg-chalk/10"
            >
              {item.label}
            </span>
          ),
        )}
        <span className="ml-auto hidden shrink-0 items-center gap-3 whitespace-nowrap xl:inline-flex">
          <span className="inline-flex items-center gap-1 text-sm font-medium">
            Portal <CaretDownMark className="size-3.5" />
          </span>
          <span className="text-sm font-medium underline decoration-dashed underline-offset-4">
            Sign in
          </span>
        </span>
      </nav>
    </header>
  );
}

function BoardMobile() {
  return (
    <header
      className="bg-board text-chalk"
      style={{
        backgroundImage:
          "radial-gradient(rgba(243,238,228,0.07) 1px, transparent 1.4px)",
        backgroundSize: "22px 22px",
      }}
    >
      <div className="flex items-center gap-3 px-3 pt-3">
        <span className="inline-flex shrink-0 items-center text-chalk">
          <SiteWordmark />
        </span>
        <span className="ml-auto inline-flex shrink-0 items-baseline gap-1.5 whitespace-nowrap">
          <span className="type-census text-2xl leading-none">12</span>
          <span className="text-sm text-chalk/80">open now</span>
        </span>
      </div>
      <div className="px-3 pt-2">
        <ChalkSearch />
      </div>
      <nav
        aria-label="Primary (mock)"
        className="flex gap-2 overflow-x-auto border-t border-dashed border-chalk/40 px-3 py-2.5 mt-2.5"
      >
        {SITE_NAV.map((item) =>
          item.href === ACTIVE ? (
            <span
              key={item.href}
              className="stall-chip inline-flex h-8 shrink-0 items-center bg-chalk px-2.5 text-sm font-medium whitespace-nowrap text-board"
            >
              {item.label}
            </span>
          ) : (
            <span
              key={item.href}
              className="inline-flex h-8 shrink-0 items-center border border-chalk/50 px-2.5 text-sm font-medium whitespace-nowrap text-chalk"
            >
              {item.label}
            </span>
          ),
        )}
      </nav>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Concept 3 — The Ticket                                              */
/* ------------------------------------------------------------------ */

function PunchRow({ holes, className }: { holes: number; className?: string }) {
  return (
    <div aria-hidden className={cn("flex justify-between", className)}>
      {Array.from({ length: holes }).map((_, i) => (
        <span key={i} className="size-2.5 rounded-full bg-stamp" />
      ))}
    </div>
  );
}

function TicketDesktop() {
  return (
    <header className="bg-stamp px-4 pt-3 pb-2">
      <div className="relative flex bg-receipt shadow-[4px_4px_0_0_rgba(28,25,22,0.4)]">
        <div className="min-w-0 flex-1 px-4 py-3">
          <div className="flex items-center gap-4">
            <span className="inline-flex shrink-0 items-center text-board">
              <SiteWordmark green className="h-8 w-auto" />
            </span>
            <MockSearch className="w-full max-w-md min-w-0" />
            <span className="inline-flex h-9 shrink-0 -rotate-3 items-center border-2 border-stamp px-2.5 text-sm font-medium text-stamp">
              Saturday
            </span>
          </div>
          <nav
            aria-label="Primary (mock)"
            className="mt-3 flex items-center gap-1 border-t border-dashed border-foreground/30 pt-2.5"
          >
            {SITE_NAV.map((item) => (
              <span key={item.href} className="inline-flex items-center gap-1">
                <span
                  className={cn(
                    "inline-flex h-8 items-center gap-1.5 px-2 text-sm font-medium whitespace-nowrap",
                    item.href === ACTIVE
                      ? "bg-board text-chalk"
                      : "text-foreground hover:bg-secondary",
                  )}
                >
                  {item.href === ACTIVE ? (
                    <span
                      aria-hidden
                      className="size-2 shrink-0 rounded-full bg-receipt"
                    />
                  ) : null}
                  {item.label}
                </span>
                <span
                  aria-hidden
                  className="size-1 shrink-0 rounded-full bg-foreground/30"
                />
              </span>
            ))}
          </nav>
        </div>
        <div className="relative flex w-36 shrink-0 flex-col items-center justify-center gap-1.5 border-l-2 border-dashed border-foreground/35 px-3 py-3">
          <span
            aria-hidden
            className="absolute -top-2 -left-2 size-4 rounded-full bg-stamp"
          />
          <span
            aria-hidden
            className="absolute -bottom-2 -left-2 size-4 rounded-full bg-stamp"
          />
          <TicketMark className="size-6 text-stamp" />
          <span className="text-sm font-medium">Saved</span>
          <span className="stall-chip-sm inline-flex h-9 items-center bg-stamp px-3 text-sm font-medium text-chalk">
            Sign in
          </span>
          <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
            Portal <CaretDownMark className="size-3.5" />
          </span>
        </div>
      </div>
      <PunchRow holes={36} className="px-1 pt-2" />
    </header>
  );
}

function TicketMobile() {
  return (
    <header className="bg-stamp px-3 pt-3 pb-2">
      <div className="bg-receipt shadow-[4px_4px_0_0_rgba(28,25,22,0.4)]">
        <div className="px-3 py-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex shrink-0 items-center text-board">
              <SiteWordmark green className="h-6 w-auto" />
            </span>
            <span className="stall-chip-sm ml-auto inline-flex h-9 shrink-0 items-center bg-stamp px-3 text-sm font-medium text-chalk">
              Sign in
            </span>
          </div>
          <div className="pt-2.5">
            <MockSearch compact />
          </div>
          <nav
            aria-label="Primary (mock)"
            className="flex gap-1 overflow-x-auto border-t border-dashed border-foreground/30 mt-2.5 pt-2"
          >
            {SITE_NAV.map((item) => (
              <span
                key={item.href}
                className={cn(
                  "inline-flex h-8 shrink-0 items-center gap-1.5 px-2 text-sm font-medium whitespace-nowrap",
                  item.href === ACTIVE
                    ? "bg-board text-chalk"
                    : "text-foreground",
                )}
              >
                {item.href === ACTIVE ? (
                  <span
                    aria-hidden
                    className="size-2 shrink-0 rounded-full bg-receipt"
                  />
                ) : null}
                {item.label}
              </span>
            ))}
          </nav>
        </div>
        <div className="relative flex items-center justify-center gap-2 border-t-2 border-dashed border-foreground/35 px-3 py-2">
          <span
            aria-hidden
            className="absolute -top-2 -left-2 size-4 rounded-full bg-stamp"
          />
          <span
            aria-hidden
            className="absolute -top-2 -right-2 size-4 rounded-full bg-stamp"
          />
          <TicketMark className="size-4 text-stamp" />
          <span className="text-sm font-medium">Saved · Portal</span>
        </div>
      </div>
      <PunchRow holes={16} className="px-1 pt-2" />
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Concept 4 — The Masthead                                            */
/* ------------------------------------------------------------------ */

function MastheadDesktop() {
  return (
    <header className="bg-card">
      <div className="flex items-baseline justify-between gap-4 px-5 pt-3 text-sm text-muted-foreground">
        <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap">
          <WeekMark className="size-4 text-foreground" /> Toronto · Saturday
        </span>
        <span className="shrink-0 whitespace-nowrap">
          Farmers&rsquo; markets across the city, updated weekly
        </span>
        <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap">
          <span className="type-nums font-semibold text-foreground">12</span>
          markets open now
        </span>
      </div>
      <div className="flex justify-center px-5 pt-2 pb-3">
        <span className="inline-flex items-center text-board">
          <SiteWordmark green className="h-14 w-auto" />
        </span>
      </div>
      <div aria-hidden className="mx-5 border-t-[3px] border-foreground" />
      <div aria-hidden className="mx-5 mt-[3px] border-t border-foreground" />
      <nav
        aria-label="Primary (mock)"
        className="flex items-center gap-2 px-5 py-2"
      >
        <span className="inline-flex shrink-0 items-center gap-1.5 border-b border-foreground/40 pb-0.5 text-sm whitespace-nowrap text-muted-foreground">
          <SearchMark className="size-4" /> Search…
        </span>
        <span className="mx-auto flex min-w-0 items-center gap-2.5">
          {SITE_NAV.map((item, i) => (
            <span key={item.href} className="inline-flex items-center gap-2.5">
              {i > 0 ? (
                <AsteriskMark className="size-3 shrink-0 text-stamp" />
              ) : null}
              <span
                className={cn(
                  "text-sm font-medium whitespace-nowrap",
                  item.href === ACTIVE
                    ? "text-foreground underline decoration-stamp decoration-2 underline-offset-4"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
              </span>
            </span>
          ))}
        </span>
        <span className="hidden shrink-0 items-center gap-3 whitespace-nowrap xl:inline-flex">
          <span className="text-sm font-medium">Portal</span>
          <span className="text-sm font-medium">Sign in</span>
        </span>
      </nav>
      <div aria-hidden className="border-b-2 border-board" />
    </header>
  );
}

function MastheadMobile() {
  return (
    <header className="bg-card">
      <p className="flex items-center justify-center gap-1.5 px-3 pt-2.5 text-sm text-muted-foreground">
        <WeekMark className="size-4 text-foreground" /> Toronto · Saturday ·{" "}
        <span className="type-nums font-semibold text-foreground">12</span> open
        now
      </p>
      <div className="flex justify-center px-3 pt-1.5 pb-2.5">
        <span className="inline-flex items-center text-board">
          <SiteWordmark green className="h-10 w-auto" />
        </span>
      </div>
      <div aria-hidden className="mx-3 border-t-[3px] border-foreground" />
      <div aria-hidden className="mx-3 mt-[3px] border-t border-foreground" />
      <div className="px-3 pt-2">
        <MockSearch compact />
      </div>
      <nav
        aria-label="Primary (mock)"
        className="flex items-center gap-2.5 overflow-x-auto px-3 py-2"
      >
        {SITE_NAV.map((item, i) => (
          <span key={item.href} className="inline-flex shrink-0 items-center gap-2.5">
            {i > 0 ? (
              <AsteriskMark className="size-3 shrink-0 text-stamp" />
            ) : null}
            <span
              className={cn(
                "text-sm font-medium whitespace-nowrap",
                item.href === ACTIVE
                  ? "text-foreground underline decoration-stamp decoration-2 underline-offset-4"
                  : "text-muted-foreground",
              )}
            >
              {item.label}
            </span>
          </span>
        ))}
      </nav>
      <div aria-hidden className="border-b-2 border-board" />
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Round 3 — Awning × Masthead                                         */
/* ------------------------------------------------------------------ */

/** Large board sign hung by two cords, centred. Masthead scale, awning hardware. */
function CentredSign({ small = false }: { small?: boolean }) {
  return (
    <span className="relative inline-flex items-center bg-board px-5 pt-3 pb-2.5 text-chalk shadow-[3px_3px_0_0_rgba(28,25,22,0.35)]">
      <span
        aria-hidden
        className="absolute -top-3.5 left-5 h-3.5 w-0.5 bg-foreground/70"
      />
      <span
        aria-hidden
        className="absolute -top-3.5 right-5 h-3.5 w-0.5 bg-foreground/70"
      />
      <span
        aria-hidden
        className="absolute top-1 left-2.5 size-1.5 rounded-full bg-chalk/70"
      />
      <span
        aria-hidden
        className="absolute top-1 right-2.5 size-1.5 rounded-full bg-chalk/70"
      />
      <SiteWordmark className={small ? "h-9 w-[243px]" : "h-12 w-[324px]"} />
    </span>
  );
}

function CanopyDesktop() {
  return (
    <header className="bg-card">
      <AwningStrip scallops={28} />
      <div className="flex items-baseline justify-between gap-4 px-5 pt-2 text-sm text-muted-foreground">
        <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap">
          <WeekMark className="size-4 text-foreground" /> Toronto · Saturday
        </span>
        <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap">
          <span className="type-nums font-semibold text-foreground">12</span>
          markets open now
        </span>
      </div>
      <div className="flex justify-center px-5 pt-5">
        <CentredSign />
      </div>
      <nav
        aria-label="Primary (mock)"
        className="flex flex-wrap items-center justify-center gap-2 px-5 pt-4"
      >
        {SITE_NAV.map((item, i) => (
          <PriceTag
            key={item.href}
            label={item.label}
            active={item.href === ACTIVE}
            tilt={TILTS[i % TILTS.length]!}
          />
        ))}
      </nav>
      <div className="relative flex items-center justify-center px-5 pt-3 pb-4">
        <MockSearch className="w-full max-w-lg min-w-0" />
        <span className="absolute right-5 hidden shrink-0 items-center gap-3 whitespace-nowrap xl:inline-flex">
          <span className="text-sm font-medium">Portal</span>
          <span className="stall-chip-sm inline-flex h-9 items-center bg-foreground px-3 text-sm font-medium text-background">
            Sign in
          </span>
        </span>
      </div>
    </header>
  );
}

function CanopyMobile() {
  return (
    <header className="bg-card">
      <AwningStrip scallops={14} />
      <p className="flex items-center justify-center gap-1.5 px-3 pt-2 text-sm text-muted-foreground">
        <WeekMark className="size-4 text-foreground" /> Toronto · Saturday ·{" "}
        <span className="type-nums font-semibold text-foreground">12</span> open
        now
      </p>
      <div className="flex justify-center px-3 pt-5">
        <CentredSign small />
      </div>
      <nav
        aria-label="Primary (mock)"
        className="flex gap-2 overflow-x-auto px-3 pt-3"
      >
        {SITE_NAV.map((item, i) => (
          <PriceTag
            key={item.href}
            label={item.label}
            active={item.href === ACTIVE}
            tilt={TILTS[i % TILTS.length]!}
          />
        ))}
      </nav>
      <div className="px-3 pt-2.5 pb-3">
        <MockSearch compact />
      </div>
    </header>
  );
}

/** A tag strung on the cord — drop length varies so the line feels hand-hung. */
function StrungTag({
  label,
  active,
  drop,
  tilt,
}: {
  label: string;
  active?: boolean;
  drop: string;
  tilt: string;
}) {
  return (
    <span className="flex shrink-0 flex-col items-center">
      <span aria-hidden className={cn("w-0.5 bg-foreground/60", drop)} />
      <span
        aria-hidden
        className="-mt-0.5 size-2 rounded-full border-2 border-foreground/60 bg-card"
      />
      <PriceTag label={label} active={active} tilt={tilt} />
    </span>
  );
}

const DROPS = ["h-2", "h-4", "h-2.5", "h-5", "h-3", "h-4"];

function StringDesktop() {
  return (
    <header className="bg-secondary">
      <AwningStrip scallops={28} />
      <div className="flex items-start gap-4 px-4 pt-1">
        <HangingWordmark />
        <div className="flex min-w-0 flex-1 items-center gap-3 pt-3">
          <MockSearch className="ml-auto w-full max-w-md min-w-0" />
          <span className="hidden shrink-0 items-center gap-1 text-sm font-medium whitespace-nowrap xl:inline-flex">
            Market/Vendor Portal <CaretDownMark className="size-3.5" />
          </span>
          <span className="stall-chip inline-flex h-9 shrink-0 -rotate-1 items-center bg-foreground px-3 text-sm font-medium text-background">
            Sign in
          </span>
        </div>
      </div>
      <div className="px-4 pt-2 pb-4">
        <div aria-hidden className="border-t-2 border-foreground/60" />
        <nav
          aria-label="Primary (mock)"
          className="flex items-start justify-between gap-2 px-1"
        >
          {SITE_NAV.map((item, i) => (
            <StrungTag
              key={item.href}
              label={item.label}
              active={item.href === ACTIVE}
              drop={DROPS[i % DROPS.length]!}
              tilt={TILTS[i % TILTS.length]!}
            />
          ))}
        </nav>
      </div>
    </header>
  );
}

function StringMobile() {
  return (
    <header className="bg-secondary">
      <AwningStrip scallops={14} />
      <div className="flex items-start gap-2 px-3 pt-1 pb-1">
        <HangingWordmark />
        <span className="stall-chip ml-auto inline-flex h-9 shrink-0 -rotate-1 items-center bg-foreground px-3 pt-1 text-sm font-medium text-background">
          Sign in
        </span>
      </div>
      <div className="px-3 pt-1 pb-3">
        <div aria-hidden className="border-t-2 border-foreground/60" />
        <nav
          aria-label="Primary (mock)"
          className="flex items-start gap-3 overflow-x-auto px-1 pb-1"
        >
          {SITE_NAV.map((item, i) => (
            <StrungTag
              key={item.href}
              label={item.label}
              active={item.href === ACTIVE}
              drop={DROPS[i % DROPS.length]!}
              tilt={TILTS[i % TILTS.length]!}
            />
          ))}
        </nav>
      </div>
      <div className="px-3 pb-3">
        <MockSearch compact />
      </div>
    </header>
  );
}

function FrontPageDesktop() {
  return (
    <header className="bg-card">
      <AwningStrip scallops={28} />
      <div className="flex items-baseline justify-between gap-4 px-5 pt-2.5 text-sm text-muted-foreground">
        <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap">
          <WeekMark className="size-4 text-foreground" /> Toronto · Saturday
        </span>
        <span className="shrink-0 whitespace-nowrap">
          Farmers&rsquo; markets across the city, updated weekly
        </span>
        <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap">
          <span className="type-nums font-semibold text-foreground">12</span>
          markets open now
        </span>
      </div>
      <div className="flex justify-center px-5 pt-2 pb-3">
        <span className="inline-flex items-center text-board">
          <SiteWordmark green className="h-14 w-auto" />
        </span>
      </div>
      <div aria-hidden className="mx-5 border-t-[3px] border-foreground" />
      <div aria-hidden className="mx-5 mt-[3px] border-t border-foreground" />
      <nav
        aria-label="Primary (mock)"
        className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 px-5 py-2"
      >
        {SITE_NAV.map((item, i) => (
          <span key={item.href} className="inline-flex items-center gap-2.5">
            {i > 0 ? (
              <AsteriskMark className="size-3 shrink-0 text-stamp" />
            ) : null}
            {item.href === ACTIVE ? (
              <PriceTag label={item.label} active tilt="-rotate-1" />
            ) : (
              <span className="text-sm font-medium whitespace-nowrap text-muted-foreground hover:text-foreground">
                {item.label}
              </span>
            )}
          </span>
        ))}
      </nav>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border bg-secondary px-5 py-2">
        <span className="text-sm font-medium whitespace-nowrap">
          This morning
        </span>
        {[
          ["Wychwood Barns", "8 AM–2 PM"],
          ["Evergreen Brick Works", "9 AM–1 PM"],
          ["Sorauren Park", "3–7 PM"],
        ].map(([name, hours]) => (
          <span
            key={name}
            className="inline-flex items-baseline gap-1.5 whitespace-nowrap"
          >
            <span className="text-sm">{name}</span>
            <span className="type-nums text-sm font-semibold">{hours}</span>
          </span>
        ))}
        <span className="ml-auto inline-flex shrink-0 items-center gap-3 whitespace-nowrap">
          <span className="text-sm font-medium">Portal</span>
          <span className="text-sm font-medium">Sign in</span>
        </span>
      </div>
      <div className="flex justify-center px-5 py-3">
        <MockSearch className="w-full max-w-lg min-w-0" />
      </div>
    </header>
  );
}

function FrontPageMobile() {
  return (
    <header className="bg-card">
      <AwningStrip scallops={14} />
      <p className="flex items-center justify-center gap-1.5 px-3 pt-2 text-sm text-muted-foreground">
        <WeekMark className="size-4 text-foreground" /> Toronto · Saturday ·{" "}
        <span className="type-nums font-semibold text-foreground">12</span> open
        now
      </p>
      <div className="flex justify-center px-3 pt-1.5 pb-2.5">
        <span className="inline-flex items-center text-board">
          <SiteWordmark green className="h-10 w-auto" />
        </span>
      </div>
      <div aria-hidden className="mx-3 border-t-[3px] border-foreground" />
      <div aria-hidden className="mx-3 mt-[3px] border-t border-foreground" />
      <nav
        aria-label="Primary (mock)"
        className="flex items-center gap-2.5 overflow-x-auto px-3 py-2"
      >
        {SITE_NAV.map((item, i) => (
          <span key={item.href} className="inline-flex shrink-0 items-center gap-2.5">
            {i > 0 ? (
              <AsteriskMark className="size-3 shrink-0 text-stamp" />
            ) : null}
            {item.href === ACTIVE ? (
              <PriceTag label={item.label} active tilt="-rotate-1" />
            ) : (
              <span className="text-sm font-medium whitespace-nowrap text-muted-foreground">
                {item.label}
              </span>
            )}
          </span>
        ))}
      </nav>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border bg-secondary px-3 py-2">
        <span className="text-sm font-medium whitespace-nowrap">
          This morning
        </span>
        <span className="inline-flex items-baseline gap-1.5 whitespace-nowrap">
          <span className="text-sm">Wychwood Barns</span>
          <span className="type-nums text-sm font-semibold">8 AM–2 PM</span>
        </span>
        <span className="inline-flex items-baseline gap-1.5 whitespace-nowrap">
          <span className="text-sm">Sorauren Park</span>
          <span className="type-nums text-sm font-semibold">3–7 PM</span>
        </span>
      </div>
      <div className="px-3 py-2.5">
        <MockSearch compact />
      </div>
    </header>
  );
}

function ScallopEdge({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("flex", className)}>
      {Array.from({ length: 30 }).map((_, i) => (
        <span key={i} className="h-2 flex-1 rounded-b-full bg-board" />
      ))}
    </div>
  );
}

function QuietDesktop() {
  return (
    <header className="bg-background">
      <div
        aria-hidden
        className="h-2"
        style={{
          backgroundImage:
            "repeating-linear-gradient(-45deg, var(--primary) 0 14px, var(--chalk) 14px 28px)",
        }}
      />
      <div className="relative flex h-16 items-center gap-5 px-5">
        <span className="inline-flex shrink-0 translate-y-2 items-center self-start bg-board px-4 pt-3 pb-2.5 text-chalk shadow-[3px_3px_0_0_rgba(28,25,22,0.3)]">
          <SiteWordmark className="header-lockup" />
        </span>
        <nav
          aria-label="Primary (mock)"
          className="mx-auto flex min-w-0 items-center gap-2.5"
        >
          {SITE_NAV.map((item, i) => (
            <span key={item.href} className="inline-flex items-center gap-2.5">
              {i > 0 ? (
                <AsteriskMark className="size-3 shrink-0 text-stamp" />
              ) : null}
              <span
                className={cn(
                  "text-sm font-medium whitespace-nowrap",
                  item.href === ACTIVE
                    ? "text-foreground underline decoration-stamp decoration-2 underline-offset-4"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
              </span>
            </span>
          ))}
        </nav>
        <span className="inline-flex shrink-0 items-center gap-1.5 border-b border-foreground/40 pb-0.5 text-sm whitespace-nowrap text-muted-foreground">
          <SearchMark className="size-4" /> Search…
        </span>
        <span className="shrink-0 text-sm font-medium whitespace-nowrap">
          Sign in
        </span>
      </div>
      <ScallopEdge />
    </header>
  );
}

function QuietMobile() {
  return (
    <header className="bg-background">
      <div
        aria-hidden
        className="h-2"
        style={{
          backgroundImage:
            "repeating-linear-gradient(-45deg, var(--primary) 0 14px, var(--chalk) 14px 28px)",
        }}
      />
      <div className="flex items-center gap-3 px-3">
        <span className="inline-flex shrink-0 translate-y-1.5 items-center self-start bg-board px-3 pt-2.5 pb-2 text-chalk shadow-[3px_3px_0_0_rgba(28,25,22,0.3)]">
          <SiteWordmark />
        </span>
        <span className="ml-auto inline-flex shrink-0 items-center gap-1.5 text-sm text-muted-foreground">
          <SearchMark className="size-4" /> Search
        </span>
        <span className="shrink-0 text-sm font-medium">Sign in</span>
      </div>
      <nav
        aria-label="Primary (mock)"
        className="flex items-center gap-2.5 overflow-x-auto px-3 pt-3 pb-2"
      >
        {SITE_NAV.map((item, i) => (
          <span key={item.href} className="inline-flex shrink-0 items-center gap-2.5">
            {i > 0 ? (
              <AsteriskMark className="size-3 shrink-0 text-stamp" />
            ) : null}
            <span
              className={cn(
                "text-sm font-medium whitespace-nowrap",
                item.href === ACTIVE
                  ? "text-foreground underline decoration-stamp decoration-2 underline-offset-4"
                  : "text-muted-foreground",
              )}
            >
              {item.label}
            </span>
          </span>
        ))}
      </nav>
      <ScallopEdge />
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Round 4 — down the line of Concept 7 (Front Page, Canopy Trim)      */
/* ------------------------------------------------------------------ */

function TrimStripe() {
  return (
    <div
      aria-hidden
      className="h-2"
      style={{
        backgroundImage:
          "repeating-linear-gradient(-45deg, var(--primary) 0 14px, var(--chalk) 14px 28px)",
      }}
    />
  );
}

function SectionLine({
  dark = false,
  className,
}: {
  dark?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn("inline-flex flex-wrap items-center gap-x-2.5 gap-y-1", className)}
    >
      {SITE_NAV.map((item, i) => (
        <span key={item.href} className="inline-flex items-center gap-2.5">
          {i > 0 ? (
            <AsteriskMark
              className={cn("size-3 shrink-0", dark ? "text-chalk" : "text-stamp")}
            />
          ) : null}
          {item.href === ACTIVE ? (
            <PriceTag label={item.label} active tilt="-rotate-1" />
          ) : (
            <span
              className={cn(
                "text-sm font-medium whitespace-nowrap",
                dark
                  ? "text-chalk/80 hover:text-chalk"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
            </span>
          )}
        </span>
      ))}
    </span>
  );
}

const MORNING: Array<[string, string]> = [
  ["Wychwood Barns", "8 AM–2 PM"],
  ["Evergreen Brick Works", "9 AM–1 PM"],
  ["Sorauren Park", "3–7 PM"],
];

function MorningItems({ dark = false }: { dark?: boolean }) {
  return (
    <>
      {MORNING.map(([name, hours]) => (
        <span
          key={name}
          className="inline-flex items-baseline gap-1.5 whitespace-nowrap"
        >
          <span className={cn("text-sm", dark && "text-chalk")}>{name}</span>
          <span
            className={cn(
              "type-nums text-sm font-semibold",
              dark ? "text-chalk" : "text-foreground",
            )}
          >
            {hours}
          </span>
        </span>
      ))}
    </>
  );
}

/* --- 9 · Front Page, Full --- */

function FullFrontDesktop() {
  return (
    <header className="bg-card">
      <AwningStrip scallops={28} />
      <div className="flex items-baseline justify-between gap-4 px-5 pt-2.5 text-sm text-muted-foreground">
        <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap">
          <WeekMark className="size-4 text-foreground" /> Toronto · Saturday
        </span>
        <span className="inline-flex shrink-0 items-center gap-3 whitespace-nowrap">
          <span className="font-medium text-foreground">Portal</span>
          <span className="font-medium text-foreground">Sign in</span>
        </span>
      </div>
      <div className="flex justify-center px-5 pt-2 pb-3">
        <SiteWordmark green className="h-16 w-auto" />
      </div>
      <div aria-hidden className="mx-5 border-t-[3px] border-foreground" />
      <div aria-hidden className="mx-5 mt-[3px] border-t border-foreground" />
      <nav
        aria-label="Primary (mock)"
        className="flex justify-center px-5 py-2"
      >
        <SectionLine />
      </nav>
      <div className="grid grid-cols-3 divide-x divide-border border-t border-border">
        <div className="px-4 py-3">
          <p className="text-sm font-medium">This morning</p>
          <ul className="mt-1.5 space-y-1">
            {MORNING.map(([name, hours]) => (
              <li
                key={name}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3"
              >
                <span className="text-sm">{name}</span>
                <span className="type-nums text-sm font-semibold whitespace-nowrap">
                  {hours}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex items-center gap-5 px-4 py-3">
          <span className="inline-flex items-baseline gap-1.5 whitespace-nowrap">
            <span className="type-census text-4xl leading-none">12</span>
            <span className="text-sm text-muted-foreground">open now</span>
          </span>
          <span className="inline-flex items-baseline gap-1.5 whitespace-nowrap">
            <span className="type-census text-4xl leading-none">214</span>
            <span className="text-sm text-muted-foreground">stalls today</span>
          </span>
        </div>
        <div className="px-4 py-3">
          <p className="text-sm font-medium">Find a market or a stall</p>
          <MockSearch compact className="mt-1.5" />
        </div>
      </div>
    </header>
  );
}

function FullFrontMobile() {
  return (
    <header className="bg-card">
      <AwningStrip scallops={14} />
      <p className="flex items-center justify-center gap-1.5 px-3 pt-2 text-sm text-muted-foreground">
        <WeekMark className="size-4 text-foreground" /> Toronto · Saturday
      </p>
      <div className="flex justify-center px-3 pt-1.5 pb-2.5">
        <SiteWordmark green className="h-11 w-auto" />
      </div>
      <div aria-hidden className="mx-3 border-t-[3px] border-foreground" />
      <div aria-hidden className="mx-3 mt-[3px] border-t border-foreground" />
      <nav
        aria-label="Primary (mock)"
        className="flex justify-start overflow-x-auto px-3 py-2"
      >
        <SectionLine />
      </nav>
      <div className="border-t border-border px-3 py-2.5">
        <p className="flex items-baseline gap-1.5 text-sm">
          <span className="font-medium">This morning</span>
          <span className="type-census text-2xl leading-none">12</span>
          <span className="text-muted-foreground">open now</span>
        </p>
        <ul className="mt-1.5 space-y-1">
          {MORNING.slice(0, 2).map(([name, hours]) => (
            <li
              key={name}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3"
            >
              <span className="text-sm">{name}</span>
              <span className="type-nums text-sm font-semibold whitespace-nowrap">
                {hours}
              </span>
            </li>
          ))}
        </ul>
        <MockSearch compact className="mt-2.5" />
      </div>
    </header>
  );
}

/* --- 10 · Late Edition --- */

function LateDesktop() {
  return (
    <header
      className="bg-board text-chalk"
      style={{
        backgroundImage:
          "radial-gradient(rgba(243,238,228,0.07) 1px, transparent 1.4px)",
        backgroundSize: "22px 22px",
      }}
    >
      <div
        aria-hidden
        className="h-2"
        style={{
          backgroundImage:
            "repeating-linear-gradient(-45deg, var(--stamp) 0 14px, var(--chalk) 14px 28px)",
        }}
      />
      <div className="flex">
        {Array.from({ length: 28 }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-2.5 flex-1 rounded-b-full",
              i % 2 === 0 ? "bg-stamp" : "bg-chalk",
            )}
          />
        ))}
      </div>
      <div className="flex items-baseline justify-between gap-4 px-5 pt-2 text-sm text-chalk/75">
        <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap">
          <WeekMark className="size-4 text-chalk" /> Toronto · Saturday
        </span>
        <span className="shrink-0 whitespace-nowrap">Late edition</span>
        <span className="inline-flex shrink-0 items-center gap-3 whitespace-nowrap">
          <span className="font-medium text-chalk">Portal</span>
          <span className="font-medium text-chalk">Sign in</span>
        </span>
      </div>
      <div className="flex justify-center px-5 pt-2 pb-3">
        <SiteWordmark className="h-14 w-[378px]" />
      </div>
      <div aria-hidden className="mx-5 border-t-[3px] border-chalk" />
      <div aria-hidden className="mx-5 mt-[3px] border-t border-chalk/70" />
      <nav
        aria-label="Primary (mock)"
        className="flex justify-center px-5 py-2"
      >
        <SectionLine dark />
      </nav>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-chalk/30 bg-black/20 px-5 py-2">
        <span className="inline-flex items-baseline gap-1.5 whitespace-nowrap">
          <span className="type-census text-2xl leading-none">12</span>
          <span className="text-sm text-chalk/80">open now</span>
        </span>
        <MorningItems dark />
      </div>
      <div className="flex justify-center px-5 py-3">
        <ChalkSearch className="w-full max-w-lg min-w-0" />
      </div>
    </header>
  );
}

function LateMobile() {
  return (
    <header className="bg-board text-chalk">
      <div
        aria-hidden
        className="h-2"
        style={{
          backgroundImage:
            "repeating-linear-gradient(-45deg, var(--stamp) 0 14px, var(--chalk) 14px 28px)",
        }}
      />
      <div className="flex">
        {Array.from({ length: 14 }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-2.5 flex-1 rounded-b-full",
              i % 2 === 0 ? "bg-stamp" : "bg-chalk",
            )}
          />
        ))}
      </div>
      <p className="flex items-center justify-center gap-1.5 px-3 pt-2 text-sm text-chalk/75">
        <WeekMark className="size-4 text-chalk" /> Toronto · Saturday · Late
        edition
      </p>
      <div className="flex justify-center px-3 pt-1.5 pb-2.5">
        <SiteWordmark className="h-10 w-[270px]" />
      </div>
      <div aria-hidden className="mx-3 border-t-[3px] border-chalk" />
      <div aria-hidden className="mx-3 mt-[3px] border-t border-chalk/70" />
      <nav
        aria-label="Primary (mock)"
        className="flex overflow-x-auto px-3 py-2"
      >
        <SectionLine dark />
      </nav>
      <div className="border-t border-chalk/30 bg-black/20 px-3 py-2">
        <span className="inline-flex items-baseline gap-1.5 whitespace-nowrap">
          <span className="type-census text-2xl leading-none">12</span>
          <span className="text-sm text-chalk/80">open now</span>
        </span>
      </div>
      <div className="px-3 py-2.5">
        <ChalkSearch />
      </div>
    </header>
  );
}

/* --- 11 · Contents Page --- */

function ContentsDesktop() {
  return (
    <header className="bg-card">
      <TrimStripe />
      <div className="flex items-baseline justify-between gap-4 px-5 pt-2.5 text-sm text-muted-foreground">
        <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap">
          <WeekMark className="size-4 text-foreground" /> Toronto · Saturday
        </span>
        <span className="shrink-0 whitespace-nowrap">Contents</span>
        <span className="inline-flex shrink-0 items-center gap-3 whitespace-nowrap">
          <span className="font-medium text-foreground">Portal</span>
          <span className="font-medium text-foreground">Sign in</span>
        </span>
      </div>
      <div className="flex justify-center px-5 pt-1.5 pb-2.5">
        <SiteWordmark green className="h-12 w-auto" />
      </div>
      <div aria-hidden className="mx-5 border-t-[3px] border-foreground" />
      <div aria-hidden className="mx-5 mt-[3px] border-t border-foreground" />
      <nav
        aria-label="Primary (mock)"
        className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 px-5 py-2"
      >
        {SITE_NAV.map((item, i) => (
          <span key={item.href} className="inline-flex items-center gap-1.5">
            <span className="type-nums text-sm font-semibold text-stamp">
              {i + 1}.
            </span>
            {item.href === ACTIVE ? (
              <PriceTag label={item.label} active tilt="-rotate-1" />
            ) : (
              <span className="text-sm font-medium whitespace-nowrap text-muted-foreground hover:text-foreground">
                {item.label}
              </span>
            )}
          </span>
        ))}
      </nav>
      <div className="grid grid-cols-2 gap-x-8 border-t border-border px-5 py-3">
        <div>
          <p className="text-sm font-medium">This morning, in order</p>
          <ul className="mt-1.5 space-y-1.5">
            {MORNING.map(([name, hours]) => (
              <li key={name} className="flex items-baseline gap-2">
                <span className="text-sm whitespace-nowrap">{name}</span>
                <span
                  aria-hidden
                  className="min-w-4 flex-1 border-b border-dotted border-foreground/50"
                />
                <span className="type-nums text-sm font-semibold whitespace-nowrap">
                  {hours}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-sm font-medium">Look something up</p>
          <MockSearch className="mt-1.5" />
          <p className="mt-1.5 text-sm text-muted-foreground">
            A market, a vendor, a cuisine, or a neighbourhood.
          </p>
        </div>
      </div>
    </header>
  );
}

function ContentsMobile() {
  return (
    <header className="bg-card">
      <TrimStripe />
      <p className="flex items-center justify-center gap-1.5 px-3 pt-2 text-sm text-muted-foreground">
        <WeekMark className="size-4 text-foreground" /> Toronto · Saturday ·
        Contents
      </p>
      <div className="flex justify-center px-3 pt-1 pb-2">
        <SiteWordmark green className="h-10 w-auto" />
      </div>
      <div aria-hidden className="mx-3 border-t-[3px] border-foreground" />
      <div aria-hidden className="mx-3 mt-[3px] border-t border-foreground" />
      <nav
        aria-label="Primary (mock)"
        className="flex gap-4 overflow-x-auto px-3 py-2"
      >
        {SITE_NAV.map((item, i) => (
          <span
            key={item.href}
            className="inline-flex shrink-0 items-center gap-1.5"
          >
            <span className="type-nums text-sm font-semibold text-stamp">
              {i + 1}.
            </span>
            {item.href === ACTIVE ? (
              <PriceTag label={item.label} active tilt="-rotate-1" />
            ) : (
              <span className="text-sm font-medium whitespace-nowrap text-muted-foreground">
                {item.label}
              </span>
            )}
          </span>
        ))}
      </nav>
      <div className="border-t border-border px-3 py-2.5">
        <ul className="space-y-1.5">
          {MORNING.slice(0, 2).map(([name, hours]) => (
            <li key={name} className="flex items-baseline gap-2">
              <span className="text-sm whitespace-nowrap">{name}</span>
              <span
                aria-hidden
                className="min-w-4 flex-1 border-b border-dotted border-foreground/50"
              />
              <span className="type-nums text-sm font-semibold whitespace-nowrap">
                {hours}
              </span>
            </li>
          ))}
        </ul>
        <MockSearch compact className="mt-2.5" />
      </div>
    </header>
  );
}

/* --- 12 · Compact Daily --- */

function CompactDesktop() {
  return (
    <header className="bg-card">
      <TrimStripe />
      <div className="flex items-center gap-5 px-5 pt-2">
        <span className="w-36 shrink-0 text-sm leading-snug text-muted-foreground">
          Toronto
          <br />
          Saturday
        </span>
        <span className="mx-auto inline-flex items-center text-board">
          <SiteWordmark green className="h-10 w-auto" />
        </span>
        <span className="inline-flex w-36 shrink-0 items-center justify-end gap-3 whitespace-nowrap">
          <span className="inline-flex items-baseline gap-1.5">
            <span className="type-nums text-sm font-semibold text-foreground">
              12
            </span>
            <span className="text-sm text-muted-foreground">open now</span>
          </span>
          <span className="text-sm font-medium">Sign in</span>
        </span>
      </div>
      <div aria-hidden className="mx-5 mt-2 border-t-[3px] border-foreground" />
      <div aria-hidden className="mx-5 mt-[3px] border-t border-foreground" />
      <div className="flex items-center gap-4 px-5 py-1.5">
        <nav aria-label="Primary (mock)" className="min-w-0 shrink-0">
          <SectionLine />
        </nav>
        <span className="ml-auto inline-flex min-w-0 items-center gap-1.5 border-b border-foreground/40 pb-0.5 text-sm whitespace-nowrap text-muted-foreground">
          <SearchMark className="size-4 shrink-0" /> Search markets, vendors…
        </span>
        <span className="shrink-0 text-sm font-medium whitespace-nowrap">
          Portal
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border bg-secondary px-5 py-1.5">
        <span className="text-sm font-medium whitespace-nowrap">
          This morning
        </span>
        <MorningItems />
      </div>
    </header>
  );
}

function CompactMobile() {
  return (
    <header className="bg-card">
      <TrimStripe />
      <p className="flex items-center justify-center gap-1.5 px-3 pt-2 text-sm text-muted-foreground">
        Toronto · Saturday ·{" "}
        <span className="type-nums font-semibold text-foreground">12</span> open
        now
      </p>
      <div className="flex justify-center px-3 pt-1 pb-2">
        <SiteWordmark green className="h-9 w-auto" />
      </div>
      <div aria-hidden className="mx-3 border-t-[3px] border-foreground" />
      <div aria-hidden className="mx-3 mt-[3px] border-t border-foreground" />
      <nav
        aria-label="Primary (mock)"
        className="flex overflow-x-auto px-3 py-1.5"
      >
        <SectionLine />
      </nav>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border bg-secondary px-3 py-1.5">
        <span className="text-sm font-medium whitespace-nowrap">
          This morning
        </span>
        <span className="inline-flex items-baseline gap-1.5 whitespace-nowrap">
          <span className="text-sm">Wychwood Barns</span>
          <span className="type-nums text-sm font-semibold">8 AM–2 PM</span>
        </span>
      </div>
      <div className="px-3 py-2">
        <MockSearch compact />
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Workbench                                                           */
/* ------------------------------------------------------------------ */

type ConceptId =
  | "current"
  | "awning"
  | "masthead"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "11"
  | "12";

const CONCEPTS: Array<{
  id: ConceptId;
  tab: string;
  title: string;
  pitch: string;
  desktopHeight: string;
  mobileHeight: string;
  changes: string[];
  tradeoffs: string;
  verdict: string;
  Desktop: () => React.ReactNode;
  Mobile: () => React.ReactNode;
  peek: string;
}> = [
  {
    id: "current",
    tab: "Current",
    title: "Current header — baseline",
    pitch:
      "Board-green wordmark block, boxed tab row (desktop only), search, Portal menu, Sign in. Second tab row appears under the bar on smaller screens.",
    desktopHeight: "64px · one row from xl, two rows below xl",
    mobileHeight: "48px + 40px tab row",
    changes: [
      "Reference only — this is what ships today.",
      "Kept here so the four wilder directions have something plain to beat.",
    ],
    tradeoffs:
      "Familiar and already built, but it is a row of boxes. Nothing about it says market, Saturday, or Toronto.",
    verdict: "The yardstick. Every concept below is judged against it.",
    Desktop: CurrentDesktop,
    Mobile: CurrentMobile,
    peek: "The bar as it sits above this page today.",
  },
  {
    id: "awning",
    tab: "Awning · round 2",
    title: "The Awning — round 2, kept for reference",
    pitch:
      "The header is a stall canopy: striped awning with a scalloped edge on top, the wordmark on a hanging board sign, and every nav item as a tilted price tag pinned underneath.",
    desktopHeight: "Awning 28px + hanging sign and two loose rows",
    mobileHeight: "Awning + sign row + scrolling price tags + search",
    changes: [
      "A green-and-chalk striped canopy with scallops runs the full width — the market reference is literal, not a colour hint.",
      "The wordmark hangs on a board sign with bolt heads, overlapping the canopy edge.",
      "Nav items are cut-corner price tags, each tilted a degree or two; the current page is the stamp-red tag. Search and Sign in sit loose below the tags, like things set out for the day.",
    ],
    tradeoffs:
      "Tallest header here and the tilts are a taste call — charming at a degree, messy at three. The canopy stripe also has to be held back everywhere else on the site or it fights the homepage panels. Strip the tilts and scallops and it survives as a quieter version.",
    verdict: "Most physical of the set. Best if MarketRegular should feel like a place, not a directory.",
    Desktop: AwningDesktop,
    Mobile: AwningMobile,
    peek: "Does the page below feel like it is set up underneath something?",
  },
  {
    id: "5",
    tab: "5 · Saturday Canopy",
    title: "Concept 5 — The Saturday Canopy",
    pitch:
      "The full cross of the two you liked: a striped canopy across the top, the masthead's date line under it, the wordmark at nameplate size but hung on cords as a board sign, and price-tag nav underneath.",
    desktopHeight: "Canopy + date line + hung nameplate + tags + search",
    mobileHeight: "Canopy + date line + hung sign + scrolling tags + search",
    changes: [
      "The wordmark gets the Masthead's scale and centre position, but keeps the Awning's hardware — cords, bolt heads, board green, hard shadow.",
      "The date line (Toronto · Saturday · 12 open now) sits between canopy and sign, so the editorial layer and the physical layer each have a band.",
      "Price tags stay as the nav, centred under the sign like tags hung along the front of a stall; search centres below them, Sign in tucked to the right edge.",
    ],
    tradeoffs:
      "The tallest header ever proposed for this site, and it knows it. This is a homepage-and-sections header; on a long market page it spends a lot of height before the content. If it wins, expect a shrunken sticky form to follow it down the page.",
    verdict: "The flagship cross. Best if the header is allowed to be a destination, not a strip.",
    Desktop: CanopyDesktop,
    Mobile: CanopyMobile,
    peek: "Everything centres here. Watch how the left-aligned page feels under a centred header.",
  },
  {
    id: "6",
    tab: "6 · On a String",
    title: "Concept 6 — On a String",
    pitch:
      "The Awning taken one step more literal: after the canopy and hanging wordmark, the nav tags are strung on a cord across the header, each dropping a different length on its ring.",
    desktopHeight: "Canopy + sign row + cord with six hanging tags",
    mobileHeight: "Canopy + sign row + scrolling cord + search",
    changes: [
      "A drawn cord runs the width of the header under the sign row; every section hangs from it on a small ring, at uneven drops, like tags tied on in the morning.",
      "The uneven drops do the visual work the tilts did in round 2 — same hand-hung feeling, more of it, and the tags themselves stay level and readable.",
      "Search and account stay in the sign row, out of the way of the string.",
    ],
    tradeoffs:
      "The drops are decoration with a cost: the header's bottom edge becomes a zigzag, so whatever sits below needs a clean straight start. Uneven also reads as a mistake if it is almost even — the drops have to commit.",
    verdict: "The Awning with the hand-made part turned up. Best if charm beats tidiness.",
    Desktop: StringDesktop,
    Mobile: StringMobile,
    peek: "The zigzag bottom edge is the whole idea. Decide if the page can live under it.",
  },
  {
    id: "7",
    tab: "7 · Front Page Trim",
    title: "Concept 7 — Front Page, Canopy Trim",
    pitch:
      "The Masthead taken one step more editorial, with one awning detail smuggled in: the canopy becomes a thin trim at the very top, the current section is pinned up as the lone price tag, and a “This morning” line runs under the sections.",
    desktopHeight: "Canopy trim + date line + nameplate + rules + sections + morning line + search",
    mobileHeight: "Trim + date line + nameplate + rules + sections + morning line + search",
    changes: [
      "Only two awning moves survive: the striped trim on top, and the current section shown as a stamp-red price tag among plain text sections.",
      "A morning line joins the header: market names with their hours in condensed figures, the front page's first story under the nameplate.",
      "Everything else is the Masthead at full strength — centred nameplate, double rules, asterisk-separated sections.",
    ],
    tradeoffs:
      "The morning line is content, not furniture: it needs the day's real markets and hours, every page, never stale. It is also the second-tallest here. In exchange the header stops being navigation with decoration and becomes the day's front page.",
    verdict: "Best if the homepage habit you want is “check the front page on Saturday morning.”",
    Desktop: FrontPageDesktop,
    Mobile: FrontPageMobile,
    peek: "Market names and hours in the mock are placeholders for the shape.",
  },
  {
    id: "8",
    tab: "8 · Quiet Canopy",
    title: "Concept 8 — The Quiet Canopy",
    pitch:
      "Both ideas turned down to shippable volume: an 8px canopy stripe, the wordmark sign dropped a few pixels over the bar's edge, asterisk-separated sections from the Masthead, and a scalloped board edge where the header meets the page.",
    desktopHeight: "Stripe + one 64px row + scalloped edge",
    mobileHeight: "Stripe + sign row + section line + scalloped edge",
    changes: [
      "The wordmark sign hangs over the bottom edge of the bar by a few pixels instead of sitting inside it — the one physical move, kept small.",
      "Nav borrows the Masthead's voice at bar size: plain text sections, red asterisks, stamp underline for the current page. No boxes, no chips.",
      "Search shrinks to an underlined word at the right; the scalloped edge is the canopy's scallops flattened into the board colour, a texture you feel more than see.",
    ],
    tradeoffs:
      "Some will say this is round 1 with better manners, and they are half right — that is the point. It gives up the big centre moment both parents had. What it keeps is a header that could ship this week and still not look like every other directory.",
    verdict: "The one you could actually launch. Best if you like the family but not the height.",
    Desktop: QuietDesktop,
    Mobile: QuietMobile,
    peek: "Look at the sign overlapping the scallops — that overlap is the concept.",
  },
  {
    id: "masthead",
    tab: "Masthead · round 2",
    title: "The Masthead — round 2, kept for reference",
    pitch:
      "The header is a Saturday paper nameplate: a small date line, the wordmark set large and centred like a newspaper title, double rules above and below, and the sections strung along one line separated by chalk asterisks.",
    desktopHeight: "Date line + 56px nameplate + rules + one nav line",
    mobileHeight: "Date line + nameplate + search + scrolling sections",
    changes: [
      "The wordmark stops being a corner logo and becomes the title of the publication — three times its current size, centred.",
      "Toronto, the day, and the open-now count run as a date line above the nameplate, the way a paper carries its day and city.",
      "Nav reads as sections of the paper on a single centred line, asterisk-separated, with Search, Portal, and Sign in at the ends of the same line.",
    ],
    tradeoffs:
      "Tallest of the set by a distance, and it recentres a header the rest of the site expects to be left-aligned — the homepage rail no longer meets the wordmark block. It also promises an editorial product; the Blog and Feed would need to carry that weight.",
    verdict: "Best if MarketRegular is a weekly read first and a directory second.",
    Desktop: MastheadDesktop,
    Mobile: MastheadMobile,
    peek: "A nameplate this size makes every page feel like a front page. Decide if that is true.",
  },
  {
    id: "9",
    tab: "9 · Front Page, Full",
    title: "Concept 9 — Front Page, Full",
    pitch:
      "Concept 7 with the whole top fold built out: Portal and Sign in move into the date line, the nameplate grows, and under the sections a three-column strip carries the morning list, the day's counts, and search side by side.",
    desktopHeight: "Trim + date line + 64px nameplate + rules + sections + column strip",
    mobileHeight: "Trim + nameplate + rules + sections + morning list + search",
    changes: [
      "The morning line becomes a proper morning column — names and hours stacked, every hour in its own column that cannot be squeezed.",
      "Counts get their own column in Barlow census figures, so the header states the size of the day next to its list.",
      "Search gets the third column with a plain heading, “Find a market or a stall”, instead of floating under everything.",
    ],
    tradeoffs:
      "The most complete front page here and the heaviest header. Three columns of live content must all stay true, and on a stall page this is a lot of Saturday before the stall. It wants to be the homepage header that shrinks on inner pages.",
    verdict: "7 at full size. Best as a homepage top fold with a smaller form inside the site.",
    Desktop: FullFrontDesktop,
    Mobile: FullFrontMobile,
    peek: "Three columns of live content. Imagine each one wrong once, and decide if it still works.",
  },
  {
    id: "10",
    tab: "10 · Late Edition",
    title: "Concept 10 — Late Edition",
    pitch:
      "Concept 7 printed on the board: board-green front page, chalk nameplate and rules, a stamp-and-chalk canopy trim, and the morning line as a chalk strip under the sections. The front page after dark.",
    desktopHeight: "Trim + date line + 56px chalk nameplate + rules + sections + chalk strip + search",
    mobileHeight: "Trim + nameplate + rules + sections + count strip + chalk search",
    changes: [
      "Everything 7 does in ink on paper, this does in chalk on board — same centred nameplate, same double rules, same lone red tag for the current section.",
      "The canopy trim swaps green for stamp red, the one warm note in the chalk.",
      "Search is the dashed chalk field from the Hall Board round, centred under the morning strip.",
    ],
    tradeoffs:
      "A dark front page is a stronger room to walk into, every visit, and chalk rules at phone size need contrast care. It also pulls the header back toward round 2's Hall Board — if that felt heavy then, this is that weight with better posture.",
    verdict: "Best if MarketRegular should feel like the board you read on your way in, not the paper you read at home.",
    Desktop: LateDesktop,
    Mobile: LateMobile,
    peek: "Same front page, night light. Compare its weight with 7 and 9.",
  },
  {
    id: "11",
    tab: "11 · Contents Page",
    title: "Concept 11 — Contents Page",
    pitch:
      "Concept 7 as the inside cover: the sections become a numbered contents list, and the morning markets are set as a contents column with dotted leaders running out to their hours. Search is the second column, headed like an index.",
    desktopHeight: "Trim + date line + 48px nameplate + rules + numbered sections + two columns",
    mobileHeight: "Trim + nameplate + rules + numbered sections + leaders + search",
    changes: [
      "Sections are numbered in condensed stamp figures — Home 1, Events 2, Markets 3 — the way a contents page promises an order to things.",
      "Morning markets get dotted leaders between name and hours, the oldest trick in print for making a list feel set rather than typed.",
      "Search sits in its own column with a sentence under it saying what it covers, like an index note.",
    ],
    tradeoffs:
      "Numbers promise an order the site does not really have — Saved is not chapter 6 of anything. The leaders are lovely and completely still: no hover states, no animation survives contact with them, which some people will read as calm and others as dated.",
    verdict: "The most print-true of the family. Best if the weekly, set-in-type feeling is the brand.",
    Desktop: ContentsDesktop,
    Mobile: ContentsMobile,
    peek: "Watch the dotted leaders. They are doing more work than the nameplate.",
  },
  {
    id: "12",
    tab: "12 · Compact Daily",
    title: "Concept 12 — Compact Daily",
    pitch:
      "Concept 7 folded down to a daily: the nameplate drops to 40px and sits between the date block and the open-now count on one line, sections and search share the next line, and the morning line flattens into a single strip.",
    desktopHeight: "Trim + one nameplate line + rules + one section line + morning strip",
    mobileHeight: "Trim + date line + nameplate + rules + sections + morning strip + search",
    changes: [
      "Date, nameplate, and count share one centred line, so the front page reads at a glance instead of unfolding.",
      "Sections and search share a line under the rules — search as an underlined phrase at the right, Portal after it.",
      "The morning strip survives intact at one line tall; nothing editorial was cut, only stacked less.",
    ],
    tradeoffs:
      "This is the version that survives a real roadmap: roughly two rows tall, sticky-friendly, and it keeps every signature — trim, rules, lone red tag, morning strip. What it gives up is the ceremony. At 40px the nameplate is a logo again, not a title.",
    verdict: "7 at shippable height. Best first build of this family, with 9 waiting for the homepage.",
    Desktop: CompactDesktop,
    Mobile: CompactMobile,
    peek: "This one is meant to be scrolled past ten times a day. Judge it bored, not dazzled.",
  },
];

export function NavConcepts() {
  const [active, setActive] = useState<ConceptId>("9");
  const concept = CONCEPTS.find((c) => c.id === active) ?? CONCEPTS[0]!;
  const { Desktop, Mobile } = concept;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-4 py-6 lg:px-6 lg:py-8">
        <p className="text-sm text-muted-foreground">
          Preview · not live · round 4 · {SITE_NAME}
        </p>
        <h1 className="mt-1">Top nav bar redesign — down the Front Page line</h1>
        <p className="type-lede mt-2 max-w-2xl">
          Concept 7 (Front Page, Canopy Trim) taken four ways: built out to a
          full top fold, printed in chalk as a late edition, set as a
          contents page, and folded down to a compact daily. Concept 7 stays
          as a tab for comparison. “Markets” is the current page in all of
          them.
        </p>

        <div
          role="tablist"
          aria-label="Choose nav concept"
          className="mt-5 flex flex-wrap gap-1.5"
        >
          {CONCEPTS.map((c) => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={c.id === active}
              onClick={() => setActive(c.id)}
              className={cn(
                "stall-chip-sm inline-flex h-10 cursor-pointer items-center px-3.5 text-sm font-medium",
                c.id === active
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-foreground hover:bg-card",
              )}
            >
              {c.tab}
            </button>
          ))}
        </div>

        <section aria-label={concept.title} className="mt-6">
          <h2>{concept.title}</h2>
          <p className="mt-1 max-w-2xl text-base">{concept.pitch}</p>

          <div className="mt-5">
            <Frame title="Desktop" heightNote={concept.desktopHeight}>
              <Desktop />
              <PagePeek label={concept.peek} />
            </Frame>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,390px)_minmax(0,1fr)]">
            <Frame title="Phone" heightNote={concept.mobileHeight}>
              <Mobile />
              <PagePeek label={concept.peek} />
            </Frame>

            <div className="min-w-0">
              <h3>What changes</h3>
              <ul className="mt-2 space-y-1.5 text-base">
                {concept.changes.map((change) => (
                  <li key={change} className="flex items-start gap-2">
                    <span
                      aria-hidden
                      className="mt-2 size-1.5 shrink-0 bg-stamp"
                    />
                    <span>{change}</span>
                  </li>
                ))}
              </ul>
              <h3 className="mt-5">Trade-offs</h3>
              <p className="mt-1 text-base">{concept.tradeoffs}</p>
              <p className="mt-4 border-l-2 border-stamp pl-3 text-base font-medium">
                {concept.verdict}
              </p>
              <p className="mt-5 text-sm text-muted-foreground">
                Four takes on one front page, from the full top fold to the
                compact daily. They can also split by page: a big front page
                on the homepage, the compact daily everywhere else. Pick a
                take and I can build it into the real{" "}
                <code className="text-foreground">SiteHeader</code>, loud or
                toned down. Nothing here touches the live header. Compare
                with the{" "}
                <Link
                  href="/"
                  className="font-medium text-foreground underline underline-offset-4"
                >
                  current home page
                </Link>
                .
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
