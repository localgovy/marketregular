"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  CaretDownMark,
  CloseMark,
  PlateMark,
  SearchMark,
  TagMark,
  TicketMark,
  WeekMark,
} from "@/components/marks";
import { SiteWordmark } from "@/components/site-mark";
import { SITE_NAME } from "@/lib/constants";
import { SITE_NAV } from "@/lib/nav";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Data                                                                */
/* ------------------------------------------------------------------ */

type Mode = "morning" | "evening";

const DAYPART: Record<
  Mode,
  {
    label: string;
    shortLabel: string;
    openCount: string;
    stallCount: string;
    items: Array<[string, string]>;
  }
> = {
  morning: {
    label: "This morning",
    shortLabel: "Morning",
    openCount: "12",
    stallCount: "214",
    items: [
      ["Wychwood Barns", "8 AM–2 PM"],
      ["Evergreen Brick Works", "9 AM–1 PM"],
      ["Sorauren Park", "3–7 PM"],
    ],
  },
  evening: {
    label: "This evening",
    shortLabel: "Evening",
    openCount: "5",
    stallCount: "86",
    items: [
      ["Sorauren Park", "3–7 PM"],
      ["Dufferin Grove", "3–7 PM"],
      ["Trinity Bellwoods", "3–7 PM"],
    ],
  },
};

const RESULTS: Array<{ name: string; kind: string; meta: string }> = [
  { name: "Wychwood Barns", kind: "Market · Wychwood", meta: "8 AM–2 PM" },
  { name: "Evergreen Brick Works", kind: "Market · Don Valley", meta: "9 AM–1 PM" },
  { name: "Sorauren Park", kind: "Market · Roncesvalles", meta: "3–7 PM" },
  { name: "Dufferin Grove", kind: "Market · Dufferin Grove Park", meta: "3–7 PM" },
  { name: "Trinity Bellwoods", kind: "Market · Queen West", meta: "3–7 PM" },
  { name: "Honey, preserves and maple", kind: "Products · 24 stalls", meta: "Citywide" },
  { name: "Sourdough and baked goods", kind: "Products · 31 stalls", meta: "Citywide" },
  { name: "Flowers and plants", kind: "Products · 18 stalls", meta: "Citywide" },
];

const BOARD_TEXTURE = {
  backgroundImage:
    "radial-gradient(rgba(243,238,228,0.07) 1px, transparent 1.4px)",
  backgroundSize: "22px 22px",
} as const;

/* ------------------------------------------------------------------ */
/* Shared interactive state                                            */
/* ------------------------------------------------------------------ */

type MockState = {
  active: string;
  setActive: (href: string) => void;
  query: string;
  setQuery: (value: string) => void;
  saved: boolean;
  toggleSaved: () => void;
  signedIn: boolean;
  toggleSignedIn: () => void;
  picked: string | null;
  pick: (name: string) => void;
  mode: Mode;
  setMode: (mode: Mode) => void;
};

function useMockState(mode: Mode, setMode: (mode: Mode) => void): MockState {
  const [active, setActive] = useState("/markets");
  const [query, setQuery] = useState("");
  const [saved, setSaved] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);

  return {
    active,
    setActive,
    query,
    setQuery,
    saved,
    toggleSaved: () => setSaved((value) => !value),
    signedIn,
    toggleSignedIn: () => setSignedIn((value) => !value),
    picked,
    pick: (name) => {
      setPicked(name);
      setQuery(name);
      setActive("/markets");
    },
    mode,
    setMode,
  };
}

function useTorontoNow() {
  const [now, setNow] = useState<string | null>(null);

  useEffect(() => {
    const format = () =>
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Toronto",
        weekday: "short",
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date());
    setNow(format());
    const timer = window.setInterval(() => setNow(format()), 20_000);
    return () => window.clearInterval(timer);
  }, []);

  return now;
}

function LiveLine({ className }: { className?: string }) {
  const now = useTorontoNow();
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap",
        className,
      )}
    >
      <WeekMark className="size-4 shrink-0" />
      Toronto{now ? ` · ${now}` : ""}
    </span>
  );
}

function OpenDot() {
  return (
    <span aria-hidden className="relative inline-flex size-2 shrink-0">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#9fd3b4] opacity-70 motion-reduce:animate-none" />
      <span className="relative inline-flex size-2 rounded-full bg-[#9fd3b4]" />
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Interactive search with suggestions                                 */
/* ------------------------------------------------------------------ */

function SearchBox({
  state,
  tone,
  compact = false,
  placeholder,
  className,
}: {
  state: MockState;
  tone: "chalk" | "paper";
  compact?: boolean;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const query = state.query.trim().toLowerCase();
  const matches = query
    ? RESULTS.filter((result) => result.name.toLowerCase().includes(query))
    : RESULTS.slice(0, 4);
  const showPanel = open;

  function submit(event: FormEvent) {
    event.preventDefault();
    setOpen(false);
    inputRef.current?.blur();
  }

  const chalk = tone === "chalk";

  return (
    <form
      onSubmit={submit}
      role="search"
      className={cn("relative min-w-0", className)}
    >
      <div
        className={cn(
          "flex min-w-0 items-stretch transition-shadow duration-200",
          chalk
            ? "border-2 border-dashed border-chalk/50 bg-chalk/10 focus-within:border-chalk focus-within:bg-chalk/15"
            : "rounded-[2px] border border-[#cfc6b6] bg-receipt shadow-[inset_0_1px_0_#fff] focus-within:border-primary focus-within:ring-3 focus-within:ring-primary/20",
        )}
      >
        <span className="relative min-w-0 flex-1">
          <SearchMark
            className={cn(
              "pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2",
              chalk ? "text-chalk/70" : "text-muted-foreground",
            )}
          />
          <input
            ref={inputRef}
            type="search"
            value={state.query}
            aria-label="Search markets and vendors"
            placeholder={placeholder ?? (compact ? "Search markets…" : "Market, vendor, cuisine, or neighbourhood")}
            onChange={(event) => {
              state.setQuery(event.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onClick={() => setOpen(true)}
            onBlur={() => window.setTimeout(() => setOpen(false), 120)}
            onKeyDown={(event) => {
              if (event.key === "Escape") setOpen(false);
            }}
            className={cn(
              "h-10 w-full min-w-0 bg-transparent pr-8 pl-9 text-base outline-none lg:h-11",
              chalk
                ? "text-chalk placeholder:text-chalk/60"
                : "text-foreground placeholder:text-muted-foreground",
            )}
          />
          {state.query ? (
            <button
              type="button"
              aria-label="Clear search"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                state.setQuery("");
                inputRef.current?.focus();
              }}
              className={cn(
                "absolute top-1/2 right-1.5 flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center transition-colors",
                chalk
                  ? "text-chalk/70 hover:bg-chalk/15 hover:text-chalk"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              <CloseMark className="size-3.5" />
            </button>
          ) : null}
        </span>
        {!compact ? (
          <button
            type="submit"
            className={cn(
              "shrink-0 cursor-pointer self-stretch px-3.5 text-sm font-medium transition-colors",
              chalk
                ? "bg-chalk text-board hover:bg-white"
                : "bg-foreground text-background hover:bg-primary",
            )}
          >
            Find
          </button>
        ) : null}
      </div>

      {showPanel ? (
        <div className="absolute inset-x-0 top-full z-40 mt-2 border border-border bg-card text-foreground shadow-[5px_5px_0_0_rgba(28,25,22,0.35)]">
          <p className="border-b border-border px-3 py-2 text-sm text-muted-foreground">
            {query ? "Matching markets and products" : "Start with"}
          </p>
          {matches.length ? (
            <ul>
              {matches.slice(0, 5).map((result) => (
                <li key={result.name}>
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      state.pick(result.name);
                      setOpen(false);
                    }}
                    className="grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 px-3 py-2 text-left transition-colors hover:bg-secondary focus-visible:bg-secondary focus-visible:outline-none"
                  >
                    <span className="min-w-0">
                      <span className="block text-base font-medium">{result.name}</span>
                      <span className="block text-sm text-muted-foreground">{result.kind}</span>
                    </span>
                    <span className="type-nums text-sm font-semibold whitespace-nowrap">
                      {result.meta}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-3 py-3 text-sm text-muted-foreground">
              Nothing matches “{state.query}” yet. Try a market or a food.
            </p>
          )}
          <p className="border-t border-border bg-secondary px-3 py-1.5 text-sm text-muted-foreground">
            Enter searches everything. Esc closes this list.
          </p>
        </div>
      ) : null}
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Interactive account, saved, and portal controls                     */
/* ------------------------------------------------------------------ */

function SavedButton({
  state,
  tone,
}: {
  state: MockState;
  tone: "chalk" | "plate";
}) {
  return (
    <button
      type="button"
      onClick={state.toggleSaved}
      aria-pressed={state.saved}
      className={cn(
        "relative inline-flex h-10 shrink-0 cursor-pointer items-center gap-1.5 px-2.5 text-sm font-medium whitespace-nowrap transition-all duration-200 hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2",
        tone === "chalk"
          ? "text-chalk hover:bg-chalk/10 focus-visible:outline-chalk"
          : "bg-chalk text-board hover:bg-white focus-visible:outline-chalk",
      )}
    >
      <TicketMark className="size-4 shrink-0" />
      Saved
      <span
        className={cn(
          "type-nums inline-flex min-w-5 items-center justify-center bg-stamp px-1 text-sm font-semibold text-chalk transition-transform duration-200",
          state.saved && "scale-110",
        )}
      >
        {state.saved ? 4 : 3}
      </span>
    </button>
  );
}

function SignInButton({
  state,
  tone,
}: {
  state: MockState;
  tone: "text" | "plate";
}) {
  if (tone === "plate") {
    return (
      <button
        type="button"
        onClick={state.toggleSignedIn}
        className="stall-chip-sm inline-flex h-10 shrink-0 cursor-pointer items-center gap-1.5 bg-chalk px-3.5 text-sm font-medium whitespace-nowrap text-board transition-all duration-200 hover:-translate-y-px hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-chalk"
      >
        {state.signedIn ? (
          <>
            <PlateMark className="size-4" /> Account
          </>
        ) : (
          "Sign in"
        )}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={state.toggleSignedIn}
      className="inline-flex h-10 shrink-0 cursor-pointer items-center px-1 text-sm font-medium whitespace-nowrap text-chalk underline decoration-dashed underline-offset-4 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-chalk"
    >
      {state.signedIn ? "Account" : "Sign in"}
    </button>
  );
}

function PortalMenu({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState(compact ? "Portal" : "Market/Vendor Portal");

  return (
    <span className="relative inline-flex shrink-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="inline-flex h-10 cursor-pointer items-center gap-1 px-1 text-sm font-medium whitespace-nowrap text-chalk transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-chalk"
      >
        {label}
        <CaretDownMark
          className={cn("size-3.5 transition-transform duration-200", open && "rotate-180")}
        />
      </button>
      {open ? (
        <span className="absolute top-full right-0 z-40 mt-1 block w-44 border border-border bg-card text-foreground shadow-[5px_5px_0_0_rgba(28,25,22,0.35)]">
          {["Market Portal", "Vendor Portal"].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setLabel(item);
                setOpen(false);
              }}
              className="block w-full cursor-pointer px-3 py-2.5 text-left text-sm font-medium transition-colors hover:bg-secondary focus-visible:bg-secondary focus-visible:outline-none"
            >
              {item}
            </button>
          ))}
        </span>
      ) : null}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Sections, day strip, and daypart switch                             */
/* ------------------------------------------------------------------ */

function Dot() {
  return <span aria-hidden className="size-1.5 shrink-0 rotate-45 bg-chalk/60" />;
}

function PriceTag({
  label,
  active,
  tilt = "",
  onClick,
}: {
  label: string;
  active?: boolean;
  tilt?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "stall-chip relative inline-flex h-10 shrink-0 cursor-pointer items-center gap-1.5 px-3 pt-1 text-sm font-medium whitespace-nowrap shadow-[2px_2px_0_0_rgba(0,0,0,0.3)] transition-all duration-200 hover:-translate-y-0.5 hover:rotate-0 hover:shadow-[3px_4px_0_0_rgba(0,0,0,0.3)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-chalk active:translate-y-0",
        tilt,
        active ? "bg-stamp text-chalk" : "bg-chalk/15 text-chalk hover:bg-chalk/25",
      )}
    >
      <TagMark className="size-3.5 shrink-0 opacity-70" />
      {label}
    </button>
  );
}

function TagSections({ state }: { state: MockState }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1.5">
      {SITE_NAV.map((item, i) => (
        <span key={item.href} className="inline-flex items-center gap-3">
          {i > 0 ? <Dot /> : null}
          {item.href === state.active ? (
            <PriceTag label={item.label} active tilt="-rotate-1" onClick={() => state.setActive(item.href)} />
          ) : (
            <button
              type="button"
              onClick={() => state.setActive(item.href)}
              className="inline-flex h-10 cursor-pointer items-center px-1 text-sm font-medium whitespace-nowrap text-chalk/85 transition-colors hover:text-chalk focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-chalk"
            >
              {item.label}
            </button>
          )}
        </span>
      ))}
    </span>
  );
}

function PlateSections({ state }: { state: MockState }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {SITE_NAV.map((item) => {
        const current = item.href === state.active;
        return (
          <button
            key={item.href}
            type="button"
            onClick={() => state.setActive(item.href)}
            aria-current={current ? "page" : undefined}
            className={cn(
              "inline-flex h-10 shrink-0 cursor-pointer items-center gap-1.5 px-3 text-sm font-medium whitespace-nowrap transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-chalk",
              current
                ? "stall-chip bg-chalk text-board shadow-[2px_2px_0_0_rgba(0,0,0,0.3)]"
                : "border border-chalk/40 text-chalk hover:-translate-y-px hover:border-chalk/70 hover:bg-chalk/10",
            )}
          >
            {current ? <PlateMark className="size-4 shrink-0" /> : null}
            {item.label}
          </button>
        );
      })}
    </span>
  );
}

/** Underline sections for the search-first slab — quieter than plates. */
function RuleSections({ state }: { state: MockState }) {
  return (
    <span className="inline-flex flex-wrap items-center justify-center gap-x-1 gap-y-1">
      {SITE_NAV.map((item) => {
        const current = item.href === state.active;
        return (
          <button
            key={item.href}
            type="button"
            onClick={() => state.setActive(item.href)}
            aria-current={current ? "page" : undefined}
            className={cn(
              "relative inline-flex h-10 shrink-0 cursor-pointer items-center px-3 text-sm font-medium whitespace-nowrap transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-chalk",
              current ? "text-chalk" : "text-chalk/75 hover:text-chalk",
            )}
          >
            {item.label}
            <span
              aria-hidden
              className={cn(
                "absolute right-3 bottom-1 left-3 h-0.5 origin-left bg-stamp transition-transform duration-300",
                current ? "scale-x-100" : "scale-x-0",
              )}
            />
          </button>
        );
      })}
    </span>
  );
}

function DayToggle({ state, className }: { state: MockState; className?: string }) {
  return (
    <span
      role="group"
      aria-label="Time of day"
      className={cn("inline-flex shrink-0 border border-chalk/40 p-0.5", className)}
    >
      {(["morning", "evening"] as Mode[]).map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => state.setMode(value)}
          aria-pressed={state.mode === value}
          className={cn(
            "inline-flex h-8 cursor-pointer items-center px-3 text-sm font-medium whitespace-nowrap transition-all duration-200 focus-visible:outline-2 focus-visible:outline-chalk",
            state.mode === value
              ? "bg-chalk text-board shadow-[2px_2px_0_0_rgba(0,0,0,0.3)]"
              : "text-chalk/80 hover:bg-chalk/10 hover:text-chalk",
          )}
        >
          {DAYPART[value].shortLabel}
        </button>
      ))}
    </span>
  );
}

function DaypartStrip({
  state,
  limit,
  className,
  live = false,
}: {
  state: MockState;
  limit?: number;
  className?: string;
  live?: boolean;
}) {
  const day = DAYPART[state.mode];
  const items = limit ? day.items.slice(0, limit) : day.items;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-chalk/25 bg-black/20 px-5 py-1.5",
        className,
      )}
    >
      {live ? <LiveLine className="mr-1 text-sm text-chalk/85" /> : null}
      <span className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap">
        <OpenDot />
        <span className="inline-flex items-baseline gap-1.5">
          <span className="type-census text-2xl leading-none text-chalk">{day.openCount}</span>
          <span className="text-sm text-chalk/80">open now</span>
        </span>
      </span>
      <span className="ml-1 hidden shrink-0 text-sm font-medium text-chalk sm:inline">
        {day.label}
      </span>
      {items.map(([name, hours]) => {
        const picked = state.picked === name;
        return (
          <button
            key={name}
            type="button"
            onClick={() => state.pick(name)}
            aria-pressed={picked}
            className={cn(
              "inline-flex cursor-pointer items-baseline gap-1.5 px-2 py-1 whitespace-nowrap transition-all duration-200 focus-visible:outline-2 focus-visible:outline-chalk",
              picked ? "bg-chalk text-board" : "text-chalk hover:bg-chalk/10",
            )}
          >
            <span className="text-sm">{name}</span>
            <span className="type-nums text-sm font-semibold">{hours}</span>
          </button>
        );
      })}
      <span className="ml-auto hidden shrink-0 text-sm text-chalk/65 lg:inline">
        Tap a market to look it up
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Frames and page peek                                                */
/* ------------------------------------------------------------------ */

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
        <span className="type-nums text-sm text-muted-foreground">{heightNote}</span>
      </figcaption>
      <div className="border-2 border-board bg-background shadow-[4px_4px_0_0_var(--board)]">
        {children}
      </div>
    </figure>
  );
}

/* ------------------------------------------------------------------ */
/* 5A — The Slab, sharpened                                            */
/* ------------------------------------------------------------------ */

/**
 * Sections for the sharpened slab. No icon on the active button and no
 * borders on the rest, so the row never changes width or jumps when the
 * current section moves — background colour alone does the marking.
 */
function SlabSections({ state }: { state: MockState }) {
  return (
    <span className="inline-flex items-center gap-1">
      {SITE_NAV.map((item) => {
        const current = item.href === state.active;
        return (
          <button
            key={item.href}
            type="button"
            onClick={() => state.setActive(item.href)}
            aria-current={current ? "page" : undefined}
            className={cn(
              "inline-flex h-10 shrink-0 cursor-pointer items-center px-3 text-sm font-medium whitespace-nowrap transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-chalk",
              current
                ? "stall-chip bg-chalk text-board shadow-[2px_2px_0_0_rgba(0,0,0,0.3)]"
                : "text-chalk/80 hover:bg-chalk/10 hover:text-chalk",
            )}
          >
            {item.label}
          </button>
        );
      })}
    </span>
  );
}

/** The slab's day strip, on the same 20px edge as the slab above it. */
function SlabStrip({
  state,
  limit,
  bare = false,
  className,
}: {
  state: MockState;
  limit?: number;
  /** Phone size: live line and day label drop out so the strip stays one line. */
  bare?: boolean;
  className?: string;
}) {
  const day = DAYPART[state.mode];
  const items = limit ? day.items.slice(0, limit) : day.items;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-2.5 gap-y-1 border-t border-chalk/25 bg-black/20 px-5 py-2",
        className,
      )}
    >
      {bare ? null : <LiveLine className="text-sm text-chalk/85" />}
      <span className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap">
        <OpenDot />
        <span className="inline-flex items-baseline gap-1.5">
          <span className="type-census text-2xl leading-none text-chalk">{day.openCount}</span>
          <span className="text-sm text-chalk/80">open now</span>
        </span>
      </span>
      {bare ? null : (
        <span className="hidden shrink-0 text-sm font-medium text-chalk sm:inline">{day.label}</span>
      )}
      {items.map(([name, hours]) => {
        const picked = state.picked === name;
        return (
          <button
            key={name}
            type="button"
            onClick={() => state.pick(name)}
            aria-pressed={picked}
            className={cn(
              "inline-flex cursor-pointer items-baseline gap-1.5 px-2 py-1 whitespace-nowrap transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-chalk",
              picked ? "bg-chalk text-board" : "text-chalk hover:bg-chalk/10",
            )}
          >
            <span className="text-sm">{name}</span>
            <span className="type-nums text-sm font-semibold">{hours}</span>
          </button>
        );
      })}
    </div>
  );
}

function SlabRefinedDesktop({ state }: { state: MockState }) {
  return (
    <header className="relative z-10 bg-board text-chalk" style={BOARD_TEXTURE}>
      {/* Two columns on one rhythm: the wordmark (44px) answers the search
          (44px), the section row (40px) answers the account row (40px),
          and both columns share the same 12px gap and 20px side edge. */}
      <div className="grid gap-x-8 gap-y-4 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0">
          <SiteWordmark className="h-11 w-[297px]" />
          <nav aria-label="Primary (mock)" className="pt-3">
            <SlabSections state={state} />
          </nav>
        </div>
        <div className="min-w-0">
          <SearchBox state={state} tone="paper" placeholder="Market, vendor, or food" />
          {/* 10px, not 12: the search box's border makes it 2px taller
              than the wordmark, and this keeps the two 40px rows level. */}
          <div className="flex items-center justify-end pt-2.5">
            <SavedButton state={state} tone="chalk" />
            <PortalMenu compact />
            <SignInButton state={state} tone="text" />
          </div>
        </div>
      </div>
      <SlabStrip state={state} />
    </header>
  );
}

function SlabRefinedMobile({ state }: { state: MockState }) {
  return (
    <header className="relative z-10 bg-board text-chalk" style={BOARD_TEXTURE}>
      {/* One 16px side edge and a steady 12px rhythm all the way down:
          wordmark, account row, search, sections, strip. Left-aligned
          like the desktop slab — no centred stack, no orphan row. */}
      <div className="px-4 pt-4">
        <SiteWordmark className="h-9 w-[243px]" />
        <div className="flex items-center justify-between pt-3">
          <SavedButton state={state} tone="chalk" />
          <span className="inline-flex items-center">
            <PortalMenu compact />
            <SignInButton state={state} tone="text" />
          </span>
        </div>
        <div className="pt-3">
          <SearchBox state={state} tone="paper" compact />
        </div>
      </div>
      <nav
        aria-label="Primary (mock)"
        className="mt-3 flex overflow-x-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <SlabSections state={state} />
      </nav>
      <SlabStrip state={state} limit={1} bare className="px-4" />
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* 5B — The Slab, search first (search takes the middle of the slab)   */
/* ------------------------------------------------------------------ */

function SlabSearchDesktop({ state }: { state: MockState }) {
  return (
    <header className="relative z-10 bg-board text-chalk" style={BOARD_TEXTURE}>
      <div className="flex items-center gap-3 px-5 pt-4">
        <SiteWordmark className="h-10 w-[270px] shrink-0" />
        <span className="ml-auto inline-flex shrink-0 items-center">
          <SavedButton state={state} tone="chalk" />
          <PortalMenu compact />
          <SignInButton state={state} tone="plate" />
        </span>
      </div>

      <div className="mx-auto w-full max-w-2xl px-5 pt-4">
        <p className="pb-2 text-center text-sm text-chalk/80">
          Find a market, a vendor, or something good to eat
        </p>
        <SearchBox state={state} tone="paper" />
      </div>

      <nav aria-label="Primary (mock)" className="flex justify-center px-5 pt-2 pb-1">
        <RuleSections state={state} />
      </nav>

      <DaypartStrip state={state} live />
    </header>
  );
}

function SlabSearchMobile({ state }: { state: MockState }) {
  return (
    <header className="relative z-10 bg-board text-chalk" style={BOARD_TEXTURE}>
      <div className="flex justify-center px-3 pt-3">
        <SiteWordmark className="h-9 w-[243px]" />
      </div>
      <div className="px-3 pt-3">
        <SearchBox state={state} tone="paper" compact />
      </div>
      <div className="flex items-center justify-center px-3 pt-1">
        <SavedButton state={state} tone="chalk" />
        <PortalMenu compact />
        <SignInButton state={state} tone="text" />
      </div>
      <nav aria-label="Primary (mock)" className="flex overflow-x-auto px-3 py-1">
        <RuleSections state={state} />
      </nav>
      <DaypartStrip state={state} limit={1} live className="px-3" />
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* 5C — The Slab, chalk nameplate (the sign is a chalk plate)          */
/* ------------------------------------------------------------------ */

function SlabPlateDesktop({ state }: { state: MockState }) {
  return (
    <header className="relative z-10 bg-board text-chalk" style={BOARD_TEXTURE}>
      <div className="flex flex-wrap items-stretch gap-x-6 gap-y-4 px-5 py-4">
        <div className="shrink-0 bg-chalk px-4 py-3 text-board shadow-[5px_5px_0_0_rgba(0,0,0,0.35)] transition-transform duration-300 hover:-translate-y-0.5">
          <SiteWordmark className="h-11 w-[297px]" />
          <LiveLine className="pt-2 text-sm text-board/70" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start gap-3">
            <SearchBox state={state} tone="paper" className="min-w-56 flex-1" />
            <span className="inline-flex shrink-0 items-center">
              <SavedButton state={state} tone="chalk" />
              <PortalMenu compact />
              <SignInButton state={state} tone="plate" />
            </span>
          </div>
          <nav aria-label="Primary (mock)" className="pt-3">
            <TagSections state={state} />
          </nav>
        </div>
      </div>
      <DaypartStrip state={state} />
    </header>
  );
}

function SlabPlateMobile({ state }: { state: MockState }) {
  return (
    <header className="relative z-10 bg-board text-chalk" style={BOARD_TEXTURE}>
      <div className="px-3 pt-3">
        <div className="bg-chalk px-3 py-2.5 text-center text-board shadow-[4px_4px_0_0_rgba(0,0,0,0.35)]">
          <SiteWordmark className="mx-auto h-9 w-[243px]" />
        </div>
      </div>
      <div className="px-3 pt-2.5">
        <SearchBox state={state} tone="paper" compact />
      </div>
      <nav aria-label="Primary (mock)" className="flex overflow-x-auto px-3 py-2.5">
        <TagSections state={state} />
      </nav>
      <div className="flex items-center justify-center px-3 pb-1">
        <SavedButton state={state} tone="chalk" />
        <SignInButton state={state} tone="text" />
      </div>
      <DaypartStrip state={state} limit={1} live className="px-3" />
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* 5D — The Living Slab (the day switches inside the slab)             */
/* ------------------------------------------------------------------ */

function LivingStrip({ state, limit }: { state: MockState; limit?: number }) {
  const day = DAYPART[state.mode];
  const items = limit ? day.items.slice(0, limit) : day.items;

  return (
    <div
      key={state.mode}
      className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-chalk/25 bg-black/20 px-5 py-2"
    >
      <LiveLine className="mr-1 text-sm text-chalk/85" />
      <span className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap">
        <OpenDot />
        <span className="inline-flex items-baseline gap-1.5">
          <span className="type-census text-2xl leading-none text-chalk">{day.openCount}</span>
          <span className="text-sm text-chalk/80">open now</span>
        </span>
      </span>
      <span className="inline-flex shrink-0 items-baseline gap-1.5 whitespace-nowrap">
        <span className="type-census text-2xl leading-none text-chalk">{day.stallCount}</span>
        <span className="text-sm text-chalk/80">stalls today</span>
      </span>
      <span className="ml-1 hidden shrink-0 text-sm font-medium text-chalk sm:inline">{day.label}</span>
      {items.map(([name, hours]) => {
        const picked = state.picked === name;
        return (
          <button
            key={name}
            type="button"
            onClick={() => state.pick(name)}
            aria-pressed={picked}
            className={cn(
              "inline-flex cursor-pointer items-baseline gap-1.5 px-2 py-1 whitespace-nowrap transition-all duration-200 focus-visible:outline-2 focus-visible:outline-chalk",
              picked ? "bg-chalk text-board" : "text-chalk hover:bg-chalk/10",
            )}
          >
            <span className="text-sm">{name}</span>
            <span className="type-nums text-sm font-semibold">{hours}</span>
          </button>
        );
      })}
    </div>
  );
}

function SlabLivingDesktop({ state }: { state: MockState }) {
  return (
    <header className="relative z-10 bg-board text-chalk" style={BOARD_TEXTURE}>
      <div className="flex flex-wrap items-start gap-x-6 gap-y-3 px-5 py-4">
        <div className="min-w-0">
          <SiteWordmark className="h-11 w-[297px]" />
          <div className="flex items-center gap-3 pt-3">
            <DayToggle state={state} />
            <span className="text-sm text-chalk/75">
              {state.mode === "morning"
                ? "Saturday markets are setting up"
                : "Evening markets, after work"}
            </span>
          </div>
        </div>
        <div className="ml-auto w-80 max-w-full min-w-0 shrink-0">
          <SearchBox state={state} tone="paper" />
          <div className="flex items-center justify-end pt-1.5">
            <SavedButton state={state} tone="chalk" />
            <PortalMenu compact />
            <SignInButton state={state} tone="text" />
          </div>
        </div>
      </div>
      <nav
        aria-label="Primary (mock)"
        className="flex flex-wrap items-center gap-1.5 px-5 pb-3"
      >
        <PlateSections state={state} />
      </nav>
      <LivingStrip state={state} />
    </header>
  );
}

function SlabLivingMobile({ state }: { state: MockState }) {
  return (
    <header className="relative z-10 bg-board text-chalk" style={BOARD_TEXTURE}>
      <div className="flex justify-center px-3 pt-3">
        <SiteWordmark className="h-9 w-[243px]" />
      </div>
      <div className="flex justify-center px-3 pt-2.5">
        <DayToggle state={state} />
      </div>
      <div className="px-3 pt-2.5">
        <SearchBox state={state} tone="paper" compact />
      </div>
      <nav aria-label="Primary (mock)" className="flex gap-1.5 overflow-x-auto px-3 py-2.5">
        <PlateSections state={state} />
      </nav>
      <div className="flex items-center justify-center px-3 pb-1">
        <SavedButton state={state} tone="chalk" />
        <SignInButton state={state} tone="text" />
      </div>
      <LivingStrip state={state} limit={1} />
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Workbench                                                           */
/* ------------------------------------------------------------------ */

type ConceptId = "5a" | "5b" | "5c" | "5d";
type MockProps = { state: MockState };

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
  Desktop: (props: MockProps) => React.ReactNode;
  Mobile: (props: MockProps) => React.ReactNode;
  peek: string;
}> = [
  {
    id: "5a",
    tab: "5A · Slab, sharpened",
    title: "Concept 5A — The Nameplate Slab, sharpened",
    pitch:
      "The original slab, put on a grid: wordmark and sections on the left, search and account on the right, day strip along the bottom — with every row the same height as the row it answers, one side edge throughout, and nothing that moves the layout around while you use it.",
    desktopHeight: "One slab: 44px wordmark/search row, 40px section/account row, day strip",
    mobileHeight: "Wordmark + account row + search + sections + day strip, on one 16px edge",
    changes: [
      "Aligned in pairs: the 44px wordmark sits level with the 44px search, and the 40px section row sits level with the 40px account row, both columns separated by the same 12px gap. The search no longer widens on focus, so nothing shoves anything else aside while you type.",
      "Sections lost their borders and the active plate lost its icon, so the row is the same width no matter which section is current — clicking around no longer makes the slab reflow. Colour and shadow alone mark where you are.",
      "The phone slab was rebuilt left-aligned like the desktop one: the centred wordmark, the loose 10px gaps, and the orphaned centred account row are gone. One 16px side edge, a steady 12px rhythm, Saved at the left of its row and Portal/Sign in at the right — and the day strip drops its live line and label at this size so it holds one line instead of wrapping to three.",
    ],
    tradeoffs:
      "Sharper also means quieter: with the borders, the icon, and the widening search gone, the slab's character rests almost entirely on the wordmark size and the green itself. If it now reads too plain, the character has to come back through the sign, not through more boxes.",
    verdict: "The slab, measured. Best if the shape was right and only the fitting was off.",
    Desktop: SlabRefinedDesktop,
    Mobile: SlabRefinedMobile,
    peek: "Click through the sections and watch the row: nothing changes width, nothing jumps. That stillness is the sharpening.",
  },
  {
    id: "5b",
    tab: "5B · Slab, search first",
    title: "Concept 5B — The Slab, search first",
    pitch:
      "The slab rearranged around its most-used tool: wordmark and account share a quiet top line, the search takes the middle of the slab at full comfort width with a plain sentence above it, and the sections sit underneath as underlined text. The day strip still runs along the bottom.",
    desktopHeight: "Top line + centred search + underlined sections + day strip",
    mobileHeight: "Nameplate + search + account row + sections + day strip",
    changes: [
      "Search is the widest it has been in any slab — 42rem, centred — with the sentence “Find a market, a vendor, or something good to eat” doing the guiding instead of placeholder text alone.",
      "Sections trade their plates for a red underline that slides in under the current one, so the row stays calm while the search stays loud.",
      "Account moves to the top line as a chalk plate, level with the wordmark, so signing in reads as part of the sign rather than part of the search stack.",
    ],
    tradeoffs:
      "Centring everything costs the left-aligned rail the rest of the site uses, and the slab grows a line taller. It also bets that most visits start with a search — if most start with a section click, the middle of the slab is working less hard than it looks.",
    verdict: "The most welcoming slab. Best if search really is the front door.",
    Desktop: SlabSearchDesktop,
    Mobile: SlabSearchMobile,
    peek: "The underline under Markets is the whole section system here. Click around and watch it travel.",
  },
  {
    id: "5c",
    tab: "5C · Slab, chalk nameplate",
    title: "Concept 5C — The Slab, chalk nameplate",
    pitch:
      "The slab with its sign made literal: the wordmark sits on a chalk plate with a hard shadow, hung on the green, with the live Toronto line written underneath it in board green. Search and account fill the space beside the plate, and the sections hang below as price tags.",
    desktopHeight: "Chalk nameplate beside search + hanging tag sections + day strip",
    mobileHeight: "Chalk nameplate + search + tag sections + day strip",
    changes: [
      "The nameplate is now an object: chalk on board-green, shadowed, and it lifts slightly under the pointer like a sign being straightened.",
      "The live Toronto line moved onto the plate itself, so the time belongs to the sign rather than to the day strip — the strip below is purely markets and hours.",
      "Sections come back as hanging price tags beside the plate, the one red tag marking where you are; the tilt straightens on hover.",
    ],
    tradeoffs:
      "The plate spends contrast the other slabs save — a big chalk block on green is the loudest brand moment in the set, and it will set the tone for every page under it. The tag row is also the least compact section treatment here.",
    verdict: "The most characterful slab. Best if the header should feel hung, not rendered.",
    Desktop: SlabPlateDesktop,
    Mobile: SlabPlateMobile,
    peek: "The sign is a plate now. Check whether the live line reads better on chalk than it did in the strip.",
  },
  {
    id: "5d",
    tab: "5D · Living slab",
    title: "Concept 5D — The Living Slab",
    pitch:
      "The slab that knows what time it is: a Morning/Evening switch sits under the wordmark inside the slab, and flipping it restages everything below — the open count, the stall count, and the markets in the strip. Search and sections hold their places while the day changes around them.",
    desktopHeight: "Nameplate + day switch beside search + sections + living day strip",
    mobileHeight: "Nameplate + day switch + search + sections + living strip",
    changes: [
      "The day switch lives in the header itself, not in this page's controls: Morning and Evening are chalk buttons under the wordmark, and the strip answers with new counts and new markets.",
      "The strip gained the day's stall count beside the open count, so the slab states the size of the day, not just its hours.",
      "A short line beside the switch says what the day is doing — “Saturday markets are setting up” in the morning, “Evening markets, after work” later — in plain sentence case, set in Grotesk.",
    ],
    tradeoffs:
      "A switch in the header is a promise to keep it honest: the real version needs real morning and evening data behind it, or the control becomes decoration. It also gives the slab two things competing for the left side — the wordmark and the day — which the other slabs keep separate.",
    verdict: "The most alive slab. Best if the header should change with the day it is describing.",
    Desktop: SlabLivingDesktop,
    Mobile: SlabLivingMobile,
    peek: "Flip Morning and Evening inside the slab. The strip, the counts, and the line beside the switch all answer.",
  },
];

function ConceptStage({
  concept,
  mode,
  setMode,
}: {
  concept: (typeof CONCEPTS)[number];
  mode: Mode;
  setMode: (mode: Mode) => void;
}) {
  const state = useMockState(mode, setMode);
  const { Desktop, Mobile } = concept;

  return (
    <>
      <div className="mt-5">
        <Frame title="Desktop — try it" heightNote={concept.desktopHeight}>
          <Desktop state={state} />
          <PagePeek label={concept.peek} />
        </Frame>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,390px)_minmax(0,1fr)]">
        <Frame title="Phone — same state" heightNote={concept.mobileHeight}>
          <Mobile state={state} />
          <PagePeek label={concept.peek} />
        </Frame>

        <div className="min-w-0">
          <h3>What was refined</h3>
          <ul className="mt-2 space-y-1.5 text-base">
            {concept.changes.map((change) => (
              <li key={change} className="flex items-start gap-2">
                <span aria-hidden className="mt-2 size-1.5 shrink-0 bg-stamp" />
                <span>{change}</span>
              </li>
            ))}
          </ul>
          <h3 className="mt-5">Trade-offs</h3>
          <p className="mt-1 text-base">{concept.tradeoffs}</p>
          <p className="mt-4 border-l-2 border-stamp pl-3 text-base font-medium">{concept.verdict}</p>
          <p className="mt-5 text-sm text-muted-foreground">
            Nothing here touches the live header. When one of these feels right, I can build it
            into the real <code className="text-foreground">SiteHeader</code> with real counts,
            the day&rsquo;s real markets, and search that goes somewhere. Compare with the{" "}
            <Link href="/" className="font-medium text-foreground underline underline-offset-4">
              current home page
            </Link>
            .
          </p>
        </div>
      </div>
    </>
  );
}

export function NavConcepts() {
  const [active, setActive] = useState<ConceptId>("5a");
  const [mode, setMode] = useState<Mode>("morning");
  const concept = CONCEPTS.find((c) => c.id === active) ?? CONCEPTS[0]!;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-4 py-6 lg:px-6 lg:py-8">
        <p className="text-sm text-muted-foreground">
          Preview · not live · interactive prototypes · {SITE_NAME}
        </p>
        <h1 className="mt-1">Top nav bar redesign — the Nameplate Slab, developed</h1>
        <p className="type-lede mt-2 max-w-2xl">
          Concept 5 taken four ways. Every version is one green slab with nothing above it;
          they differ in what the slab puts first — the sign, the search, the plate the sign is
          painted on, or the day itself. All of them are prototypes you can use: click the
          sections, type in the searches, tap the markets in the day strip, save something,
          open the Portal menu, sign in. Desktop and phone share one state, and the
          Morning/Evening switch restages every slab — in 5D, that switch lives inside the
          header itself.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <div role="tablist" aria-label="Choose nav concept" className="flex flex-wrap gap-1.5">
            {CONCEPTS.map((c) => (
              <button
                key={c.id}
                type="button"
                role="tab"
                aria-selected={c.id === active}
                onClick={() => setActive(c.id)}
                className={cn(
                  "stall-chip-sm inline-flex h-10 cursor-pointer items-center px-3.5 text-sm font-medium transition-colors",
                  c.id === active
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-foreground hover:bg-card",
                )}
              >
                {c.tab}
              </button>
            ))}
          </div>

          <div role="group" aria-label="Time of day" className="ml-auto flex items-center gap-1.5">
            <span className="text-sm text-muted-foreground">Daypart</span>
            {(["morning", "evening"] as Mode[]).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                aria-pressed={mode === value}
                className={cn(
                  "stall-chip-sm inline-flex h-9 cursor-pointer items-center px-3 text-sm font-medium transition-colors",
                  mode === value
                    ? "bg-foreground text-background"
                    : "bg-secondary text-foreground hover:bg-card",
                )}
              >
                {DAYPART[value].shortLabel}
              </button>
            ))}
          </div>
        </div>

        <section aria-label={concept.title} className="mt-6">
          <h2>{concept.title}</h2>
          <p className="mt-1 max-w-2xl text-base">{concept.pitch}</p>
          <ConceptStage key={concept.id} concept={concept} mode={mode} setMode={setMode} />
        </section>
      </div>
    </div>
  );
}
