"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
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
};

function useMockState(mode: Mode): MockState {
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
  };
}

/** Live Toronto weekday and time, so the board always feels current. */
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
  className,
}: {
  state: MockState;
  tone: "chalk" | "paper";
  compact?: boolean;
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
            placeholder={compact ? "Search markets…" : "Market, vendor, cuisine, or neighbourhood"}
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
                      <span className="block text-base font-medium">
                        {result.name}
                      </span>
                      <span className="block text-sm text-muted-foreground">
                        {result.kind}
                      </span>
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
/* Sections and daypart strip                                          */
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
        active
          ? "bg-stamp text-chalk"
          : "bg-chalk/15 text-chalk hover:bg-chalk/25",
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
      {live ? (
        <LiveLine className="mr-1 text-sm text-chalk/85" />
      ) : null}
      <span className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap">
        <OpenDot />
        <span className="inline-flex items-baseline gap-1.5">
          <span className="type-census text-2xl leading-none text-chalk">
            {day.openCount}
          </span>
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
              picked
                ? "bg-chalk text-board"
                : "text-chalk hover:bg-chalk/10",
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

function StampTrim({ scallops }: { scallops: number }) {
  return (
    <div aria-hidden>
      <div
        className="h-2"
        style={{
          backgroundImage:
            "repeating-linear-gradient(-45deg, var(--stamp) 0 14px, var(--chalk) 14px 28px)",
        }}
      />
      <div className="flex">
        {Array.from({ length: scallops }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-2.5 flex-1 rounded-b-full",
              i % 2 === 0 ? "bg-stamp" : "bg-chalk",
            )}
          />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Concept 2 — The Board Bar, refined                                  */
/* ------------------------------------------------------------------ */

function BoardBarDesktop({ state }: { state: MockState }) {
  return (
    <header className="relative z-10 bg-board text-chalk" style={BOARD_TEXTURE}>
      <div className="flex min-h-16 flex-wrap items-center gap-x-3 gap-y-2 px-5 py-2">
        <span className="inline-flex shrink-0 items-center text-chalk">
          <SiteWordmark className="header-lockup" />
        </span>
        <nav aria-label="Primary (mock)" className="min-w-0 shrink-0">
          <PlateSections state={state} />
        </nav>
        <SearchBox
          state={state}
          tone="chalk"
          compact
          className="ml-auto w-52 shrink transition-[width] duration-300 ease-out focus-within:w-72"
        />
        <SavedButton state={state} tone="chalk" />
        <PortalMenu compact />
        <SignInButton state={state} tone="text" />
      </div>

      <DaypartStrip state={state} live />
    </header>
  );
}

function BoardBarMobile({ state }: { state: MockState }) {
  return (
    <header className="relative z-10 bg-board text-chalk" style={BOARD_TEXTURE}>
      <div className="flex h-12 items-center gap-2 px-3">
        <span className="inline-flex shrink-0 items-center text-chalk">
          <SiteWordmark />
        </span>
        <span className="ml-auto inline-flex shrink-0 items-center">
          <SavedButton state={state} tone="chalk" />
          <SignInButton state={state} tone="text" />
        </span>
      </div>
      <div className="px-3">
        <SearchBox state={state} tone="chalk" compact />
      </div>
      <nav
        aria-label="Primary (mock)"
        className="flex gap-1.5 overflow-x-auto px-3 py-2.5"
      >
        <PlateSections state={state} />
      </nav>
      <DaypartStrip state={state} limit={1} live className="px-3" />
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Concept 3 — Canopy Board, refined                                   */
/* ------------------------------------------------------------------ */

function BoardScallops({ count }: { count: number }) {
  return (
    <div aria-hidden className="flex bg-background">
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} className="h-3 flex-1 rounded-b-full bg-board" />
      ))}
    </div>
  );
}

function CanopyDesktop({ state }: { state: MockState }) {
  const day = DAYPART[state.mode];
  return (
    <header className="relative z-10 bg-board text-chalk" style={BOARD_TEXTURE}>
      <StampTrim scallops={28} />
      <div className="flex items-center justify-between gap-4 px-5 pt-2 text-sm text-chalk/80">
        <LiveLine />
        <span className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap">
          <OpenDot />
          <span>
            <span className="type-nums font-semibold text-chalk">
              {day.openCount}
            </span>{" "}
            markets open now
          </span>
        </span>
        <span className="inline-flex shrink-0 items-center">
          <SavedButton state={state} tone="chalk" />
          <PortalMenu compact />
          <SignInButton state={state} tone="plate" />
        </span>
      </div>

      <div className="flex justify-center px-5 pt-1 pb-3">
        <SiteWordmark className="h-12 w-[324px]" />
      </div>

      <div className="flex justify-center px-5">
        <SearchBox state={state} tone="paper" className="w-full max-w-lg min-w-0" />
      </div>

      <nav
        aria-label="Primary (mock)"
        className="flex flex-wrap items-center justify-center gap-2 px-5 pt-3.5 pb-3"
      >
        {SITE_NAV.map((item, i) => (
          <PriceTag
            key={item.href}
            label={item.label}
            active={item.href === state.active}
            tilt={i % 2 === 0 ? "-rotate-1" : "rotate-1"}
            onClick={() => state.setActive(item.href)}
          />
        ))}
      </nav>

      <DaypartStrip state={state} className="border-chalk/20 bg-black/15" />
      <BoardScallops count={28} />
    </header>
  );
}

function CanopyMobile({ state }: { state: MockState }) {
  return (
    <header className="relative z-10 bg-board text-chalk" style={BOARD_TEXTURE}>
      <StampTrim scallops={14} />
      <div className="flex items-center justify-between gap-2 px-3 pt-2 text-sm text-chalk/80">
        <LiveLine />
        <SignInButton state={state} tone="plate" />
      </div>
      <div className="flex justify-center px-3 pt-1 pb-2.5">
        <SiteWordmark className="h-9 w-[243px]" />
      </div>
      <div className="px-3">
        <SearchBox state={state} tone="paper" compact />
      </div>
      <nav
        aria-label="Primary (mock)"
        className="flex gap-2 overflow-x-auto px-3 pt-3 pb-3"
      >
        {SITE_NAV.map((item, i) => (
          <PriceTag
            key={item.href}
            label={item.label}
            active={item.href === state.active}
            tilt={i % 2 === 0 ? "-rotate-1" : "rotate-1"}
            onClick={() => state.setActive(item.href)}
          />
        ))}
      </nav>
      <DaypartStrip state={state} limit={1} className="px-3" />
      <BoardScallops count={14} />
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Concept 4 — Two Greens, refined                                     */
/* ------------------------------------------------------------------ */

function TwoGreensDesktop({ state }: { state: MockState }) {
  const day = DAYPART[state.mode];
  return (
    <header className="relative z-10 text-chalk">
      <div className="flex min-h-16 flex-wrap items-center gap-x-3 gap-y-2 bg-primary px-5 py-2">
        <span className="inline-flex shrink-0 items-center text-primary-foreground">
          <SiteWordmark className="header-lockup" />
        </span>
        <SearchBox
          state={state}
          tone="paper"
          className="mx-auto w-full max-w-xl min-w-0 flex-1"
        />
        <PortalMenu compact />
        <SavedButton state={state} tone="plate" />
        <SignInButton state={state} tone="plate" />
      </div>

      <nav
        aria-label="Primary (mock)"
        className="flex items-stretch bg-board"
        style={BOARD_TEXTURE}
      >
        {SITE_NAV.map((item) => {
          const current = item.href === state.active;
          return (
            <button
              key={item.href}
              type="button"
              onClick={() => state.setActive(item.href)}
              aria-current={current ? "page" : undefined}
              className={cn(
                "inline-flex h-11 shrink-0 cursor-pointer items-center border-r border-chalk/20 px-3.5 text-sm font-medium whitespace-nowrap transition-colors duration-200 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-chalk",
                current
                  ? "bg-stamp text-chalk"
                  : "text-chalk/85 hover:bg-chalk/10 hover:text-chalk",
              )}
            >
              {item.label}
            </button>
          );
        })}
        <span className="ml-auto hidden min-w-0 items-center gap-1 pr-3 xl:inline-flex">
          <span className="mr-2 inline-flex shrink-0 items-center gap-2 whitespace-nowrap">
            <OpenDot />
            <span className="inline-flex items-baseline gap-1.5">
              <span className="type-census text-xl leading-none">
                {day.openCount}
              </span>
              <span className="text-sm text-chalk/80">open now</span>
            </span>
          </span>
          {day.items.slice(0, 2).map(([name, hours]) => {
            const picked = state.picked === name;
            return (
              <button
                key={name}
                type="button"
                onClick={() => state.pick(name)}
                aria-pressed={picked}
                className={cn(
                  "inline-flex cursor-pointer items-baseline gap-1.5 px-2 py-1 whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-chalk",
                  picked ? "bg-chalk text-board" : "hover:bg-chalk/10",
                )}
              >
                <span className="text-sm">{name}</span>
                <span className="type-nums text-sm font-semibold">{hours}</span>
              </button>
            );
          })}
        </span>
      </nav>
    </header>
  );
}

function TwoGreensMobile({ state }: { state: MockState }) {
  return (
    <header className="relative z-10 text-chalk">
      <div className="flex h-12 items-center gap-2 bg-primary px-3">
        <span className="inline-flex shrink-0 items-center text-primary-foreground">
          <SiteWordmark />
        </span>
        <span className="ml-auto inline-flex shrink-0 items-center gap-1">
          <SavedButton state={state} tone="plate" />
          <SignInButton state={state} tone="plate" />
        </span>
      </div>
      <div className="bg-primary px-3 pb-3">
        <SearchBox state={state} tone="paper" compact />
      </div>
      <nav
        aria-label="Primary (mock)"
        className="flex overflow-x-auto bg-board"
        style={BOARD_TEXTURE}
      >
        {SITE_NAV.map((item) => {
          const current = item.href === state.active;
          return (
            <button
              key={item.href}
              type="button"
              onClick={() => state.setActive(item.href)}
              aria-current={current ? "page" : undefined}
              className={cn(
                "inline-flex h-11 shrink-0 cursor-pointer items-center border-r border-chalk/20 px-3 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-chalk",
                current ? "bg-stamp text-chalk" : "text-chalk/85",
              )}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Concept 5 — The Nameplate Slab (one green slab, no line above)      */
/* ------------------------------------------------------------------ */

function NameplateDesktop({ state }: { state: MockState }) {
  return (
    <header className="relative z-10 bg-board text-chalk" style={BOARD_TEXTURE}>
      <div className="flex flex-wrap items-start gap-x-6 gap-y-3 px-5 py-4">
        <div className="min-w-0">
          <SiteWordmark className="h-11 w-[297px]" />
          <nav aria-label="Primary (mock)" className="pt-3">
            <PlateSections state={state} />
          </nav>
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
      <DaypartStrip state={state} live />
    </header>
  );
}

function NameplateMobile({ state }: { state: MockState }) {
  return (
    <header className="relative z-10 bg-board text-chalk" style={BOARD_TEXTURE}>
      <div className="flex justify-center px-3 pt-3">
        <SiteWordmark className="h-9 w-[243px]" />
      </div>
      <div className="px-3 pt-2.5">
        <SearchBox state={state} tone="paper" compact />
      </div>
      <nav
        aria-label="Primary (mock)"
        className="flex gap-1.5 overflow-x-auto px-3 py-2.5"
      >
        <PlateSections state={state} />
      </nav>
      <div className="flex items-center justify-center px-3 pb-1">
        <SavedButton state={state} tone="chalk" />
        <PortalMenu compact />
        <SignInButton state={state} tone="text" />
      </div>
      <DaypartStrip state={state} limit={1} live className="px-3" />
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Concept 6 — Search Inset (the search breaks out of the bar)         */
/* ------------------------------------------------------------------ */

function InsetDesktop({ state }: { state: MockState }) {
  return (
    <header className="relative z-10 bg-board text-chalk" style={BOARD_TEXTURE}>
      <div className="flex min-h-16 flex-wrap items-center gap-x-3 gap-y-2 px-5 py-2">
        <span className="inline-flex shrink-0 items-center text-chalk">
          <SiteWordmark className="header-lockup" />
        </span>
        <span className="ml-auto inline-flex shrink-0 items-center">
          <SavedButton state={state} tone="chalk" />
          <PortalMenu compact />
          <SignInButton state={state} tone="plate" />
        </span>
      </div>
      <nav
        aria-label="Primary (mock)"
        className="flex justify-center px-5 pb-2"
      >
        <TagSections state={state} />
      </nav>
      <DaypartStrip state={state} live />
      <div className="relative z-20 mx-auto -mb-7 w-full max-w-xl px-5">
        <div className="border border-[#cfc6b6] bg-receipt p-1.5 shadow-[6px_6px_0_0_rgba(28,25,22,0.4)]">
          <SearchBox state={state} tone="paper" />
        </div>
      </div>
    </header>
  );
}

function InsetMobile({ state }: { state: MockState }) {
  return (
    <header className="relative z-10 bg-board text-chalk" style={BOARD_TEXTURE}>
      <div className="flex h-12 items-center gap-2 px-3">
        <span className="inline-flex shrink-0 items-center text-chalk">
          <SiteWordmark />
        </span>
        <span className="ml-auto inline-flex shrink-0 items-center gap-1">
          <SavedButton state={state} tone="chalk" />
          <SignInButton state={state} tone="plate" />
        </span>
      </div>
      <nav
        aria-label="Primary (mock)"
        className="flex overflow-x-auto px-3 pb-2"
      >
        <TagSections state={state} />
      </nav>
      <DaypartStrip state={state} limit={1} live className="px-3" />
      <div className="relative z-20 mx-auto -mb-7 w-full px-3">
        <div className="border border-[#cfc6b6] bg-receipt p-1.5 shadow-[6px_6px_0_0_rgba(28,25,22,0.4)]">
          <SearchBox state={state} tone="paper" compact />
        </div>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Concept 7 — The Ledger (chalk columns, no line above)               */
/* ------------------------------------------------------------------ */

function LedgerDesktop({ state }: { state: MockState }) {
  return (
    <header className="relative z-10 bg-board text-chalk" style={BOARD_TEXTURE}>
      <div className="grid grid-cols-[auto_minmax(0,1fr)_21rem]">
        <div className="flex items-center px-5 py-3">
          <SiteWordmark className="h-10 w-[270px]" />
        </div>
        <nav
          aria-label="Primary (mock)"
          className="flex items-center border-x border-chalk/25 px-4 py-3"
        >
          <PlateSections state={state} />
        </nav>
        <div className="px-4 py-3">
          <SearchBox state={state} tone="chalk" compact />
          <div className="flex items-center justify-end pt-1">
            <SavedButton state={state} tone="chalk" />
            <PortalMenu compact />
            <SignInButton state={state} tone="text" />
          </div>
        </div>
      </div>
      <DaypartStrip state={state} live />
    </header>
  );
}

function LedgerMobile({ state }: { state: MockState }) {
  return (
    <header className="relative z-10 bg-board text-chalk" style={BOARD_TEXTURE}>
      <div className="border-b border-chalk/25 px-3 py-2.5">
        <span className="flex justify-center text-chalk">
          <SiteWordmark className="h-8 w-[216px]" />
        </span>
      </div>
      <div className="px-3 py-2.5">
        <SearchBox state={state} tone="chalk" compact />
      </div>
      <nav
        aria-label="Primary (mock)"
        className="flex gap-1.5 overflow-x-auto border-t border-chalk/25 px-3 py-2.5"
      >
        <PlateSections state={state} />
      </nav>
      <DaypartStrip state={state} limit={1} live className="px-3" />
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Workbench                                                           */
/* ------------------------------------------------------------------ */

type ConceptId = "2" | "3" | "4" | "5" | "6" | "7";
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
    id: "2",
    tab: "2 · The Board Bar",
    title: "Concept 2 — The Board Bar, refined",
    pitch:
      "The compact green bar, made to be used ten times a day — and now with nothing above it: the chalk wordmark starts the bar, sections follow, a search widens when you reach for it, and the live Toronto line moved down into the day strip underneath. Everything in it clicks.",
    desktopHeight: "One main row + day strip (live line inside it)",
    mobileHeight: "Live line + wordmark row + search + sections + day strip",
    changes: [
      "Sections are real buttons here: click one and the chalk plate moves. Saved fills its count from 3 to 4, Portal opens its menu, Sign in becomes Account — desktop and phone stay in step.",
      "Search widens from 13rem to 18rem as you focus it and offers matched markets and products as you type, each row with its hours. Esc closes the list; the day strip's markets fill the search when tapped.",
      "Comfort passes: 40px-plus targets, chalk focus rings, tags that settle flat under the pointer, and a soft pulse on the open dot that stops for reduced-motion settings.",
    ],
    tradeoffs:
      "Still the least ceremonial of the three — no big nameplate. Its quality has to come from how it behaves, which is exactly what this pass tests: if it feels good to click around in miniature, it will feel good at full size.",
    verdict: "The daily driver. Best if the header's job is to be reached for, not admired.",
    Desktop: BoardBarDesktop,
    Mobile: BoardBarMobile,
    peek: "Try the strip underneath the green — its markets are buttons here.",
  },
  {
    id: "3",
    tab: "3 · Canopy Board",
    title: "Concept 3 — Canopy Board, refined",
    pitch:
      "The stall on the board, tuned: a calmer trim, the nameplate centred with the account row tucked into its line, a receipt-paper search set into the green, tags that lift and straighten under your hand, and the scalloped edge handing over to the page.",
    desktopHeight: "Trim + account line + 48px nameplate + paper search + tags + day strip + scallops",
    mobileHeight: "Trim + nameplate + paper search + tags + day strip + scallops",
    changes: [
      "Every tag is a button with a small lift on hover and a press back down; the active tag is stamp red, the rest chalk-tinted, and the tilt straightens as you reach for a tag.",
      "The paper search carries the same suggestions as the bar — markets with hours, product groups with stall counts — so the light inset is also the fastest way in.",
      "Spacing was re-set so the nameplate, search, and tags sit on one centred rhythm instead of three separate rows competing.",
    ],
    tradeoffs:
      "The tallest of the three and the most decorated. The scallops and tilts earn their keep only if the rest of the site stays comparatively straight; two playful systems would fight.",
    verdict: "The charmer. Best if the header should feel like arriving at a stall, every time.",
    Desktop: CanopyDesktop,
    Mobile: CanopyMobile,
    peek: "Hover the tags. They straighten up to be read — that is the concept, in miniature.",
  },
  {
    id: "4",
    tab: "4 · Two Greens",
    title: "Concept 4 — Two Greens, refined",
    pitch:
      "Two greens with the jobs split cleanly — and nothing above the main band: the primary band opens the header with wordmark, wide paper search, Portal, Saved, and Sign in; the board strip below carries the sections, and the open count and morning hours moved into that strip's right end.",
    desktopHeight: "64px primary band + 44px section strip",
    mobileHeight: "Primary band + search + section strip",
    changes: [
      "The primary band is the action band: the widest search of the three, Saved with its count, and a chalk Sign in that becomes Account. Suggestions open over the strip without pushing the page.",
      "Sections are a ruled strip of full-height buttons — red fill for the current one, quiet chalk wash on hover — and the day's first markets ride at the strip's right end as tappable hours.",
      "Colour was balanced so the two greens read as shade and light of one board rather than two paints; red is spent in exactly two places, the current section and the Saved count.",
    ],
    tradeoffs:
      "The most conventional silhouette of the three, and proud of it: its risk is not taste but bandwidth, since three bands must stay aligned at every width. Mobile answers by letting the strip scroll, never squeeze.",
    verdict: "The system. Best if search volume is high and the header must hold together on every page type.",
    Desktop: TwoGreensDesktop,
    Mobile: TwoGreensMobile,
    peek: "Three bands, three jobs. Try searching from the green band — the list opens over the strip.",
  },
  {
    id: "5",
    tab: "5 · Nameplate Slab",
    title: "Concept 5 — The Nameplate Slab",
    pitch:
      "One green slab and nothing above it: the wordmark at nameplate size in the top-left of the slab, sections directly under it, and the search with its account row stacked at the right. The day strip runs along the slab's bottom edge.",
    desktopHeight: "One slab: nameplate + sections beside search + day strip",
    mobileHeight: "Nameplate + search + sections + account row + day strip",
    changes: [
      "No separate rows at all — the header is a single board with a left half (brand and sections) and a right half (search and account).",
      "The wordmark gets masthead scale without a masthead layout: 44px, still left-aligned, so the homepage rail logic survives.",
      "Live Toronto line sits at the left of the day strip, where the day is stated once, next to its markets.",
    ],
    tradeoffs:
      "The slab is only as tidy as its two halves: at in-between widths the right stack and the section row can crowd each other, which is why the phone version restacks them in reading order.",
    verdict: "The most architectural. Best if the header should feel like one sign, hung once.",
    Desktop: NameplateDesktop,
    Mobile: NameplateMobile,
    peek: "One slab, two halves. Check the right stack against the sections at this width.",
  },
  {
    id: "6",
    tab: "6 · Search Inset",
    title: "Concept 6 — Search Inset",
    pitch:
      "The green bar with its search broken out of it: wordmark and account on the first line, dotted text sections under it, the day strip, and then the receipt-paper search set in a bordered slip that overlaps the bottom edge of the green onto the page.",
    desktopHeight: "Main row + sections + day strip + search overlapping the edge",
    mobileHeight: "Wordmark row + sections + day strip + overlapping search",
    changes: [
      "Search is the one object that leaves the board: a paper slip with a hard shadow, half on the green and half on the page, so the eye lands on it first.",
      "Sections go back to dotted text with the lone red tag, keeping the bar quiet so the slip can be loud.",
      "Suggestions open from the slip over the page — the overlap means the list never pushes the header taller.",
    ],
    tradeoffs:
      "Overlap is a promise the page below must keep: whatever sits under the header needs clear space at its top, or the slip covers it. On busy inner pages that cost is real.",
    verdict: "The most inviting. Best if search is the front door and should feel like one.",
    Desktop: InsetDesktop,
    Mobile: InsetMobile,
    peek: "The search slip lands on this text on purpose. Decide how much overlap is charm and how much is collision.",
  },
  {
    id: "7",
    tab: "7 · The Ledger",
    title: "Concept 7 — The Ledger",
    pitch:
      "The board ruled into three chalk columns with nothing above them: wordmark in the first, sections in the second behind chalk rules, and search over its account row in the third. The day strip is the ledger's bottom rule.",
    desktopHeight: "Three chalk columns + day strip",
    mobileHeight: "Ruled rows: nameplate, search, sections, day strip",
    changes: [
      "Vertical chalk rules do the organising instead of boxes and bands — the header reads as entries in one hand-kept book.",
      "Search and account share a column, so the right third of the header is the working third at every width.",
      "On phones the columns become ruled rows in the same order — brand, search, sections — so the book still reads top to bottom.",
    ],
    tradeoffs:
      "The middle column is the squeeze point: six section plates between two rules is the widest fixed thing here, and it will wrap before the others do. The rules also ask the page below to stay unruled, or the effect doubles.",
    verdict: "The most ordered. Best if the site should feel kept, not decorated.",
    Desktop: LedgerDesktop,
    Mobile: LedgerMobile,
    peek: "Follow the chalk rules down. The page below deliberately has none.",
  },
];

function ConceptStage({
  concept,
  mode,
}: {
  concept: (typeof CONCEPTS)[number];
  mode: Mode;
}) {
  const state = useMockState(mode);
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
          <p className="mt-4 border-l-2 border-stamp pl-3 text-base font-medium">
            {concept.verdict}
          </p>
          <p className="mt-5 text-sm text-muted-foreground">
            Nothing here touches the live header. When one of these feels
            right, I can build it into the real{" "}
            <code className="text-foreground">SiteHeader</code> with real
            counts, the day's real markets, and search that goes somewhere.
            Compare with the{" "}
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
    </>
  );
}

export function NavConcepts() {
  const [active, setActive] = useState<ConceptId>("2");
  const [mode, setMode] = useState<Mode>("morning");
  const concept = CONCEPTS.find((c) => c.id === active) ?? CONCEPTS[0]!;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-4 py-6 lg:px-6 lg:py-8">
        <p className="text-sm text-muted-foreground">
          Preview · not live · interactive prototypes · {SITE_NAME}
        </p>
        <h1 className="mt-1">Top nav bar redesign — the green board, working</h1>
        <p className="type-lede mt-2 max-w-2xl">
          Concepts 2 and 4 with the line above the main bar removed — that
          information now lives in the strip below — plus three new green
          variations that never had one. All of them are prototypes you can
          use: click the sections, type in the searches, tap the markets
          in the day strip, save something, open the Portal menu, sign in.
          Desktop and phone share one state, and the Morning/Evening
          switch restages every bar.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <div
            role="tablist"
            aria-label="Choose nav concept"
            className="flex flex-wrap gap-1.5"
          >
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

          <div
            role="group"
            aria-label="Time of day"
            className="ml-auto flex items-center gap-1.5"
          >
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
          <ConceptStage
            key={concept.id}
            concept={concept}
            mode={mode}
          />
        </section>
      </div>
    </div>
  );
}
