"use client";

import "@/lib/native-history";

import { Suspense, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { HeaderAccount } from "@/components/header-account";
import { HeaderSearch } from "@/components/header-search";
import { CaretDownMark, TicketMark, WeekMark } from "@/components/marks";
import { NavLink } from "@/components/nav-link";
import { SavesHydrator } from "@/components/saves-hydrator";
import { useSaves } from "@/components/save-button";
import { SiteWordmark } from "@/components/site-mark";
import { Menu } from "@base-ui/react/menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SITE_NAME } from "@/lib/constants";
import {
  parseHeaderBoard,
  sameHeaderBoard,
  type HeaderBoard,
  type HeaderBoardMarket,
} from "@/lib/header-board";
import { PORTAL_NAV_LABEL, SITE_NAV, SITE_PORTAL_NAV } from "@/lib/nav";
import type { Saves } from "@/lib/saves";
import { useMounted } from "@/lib/use-now";
import { cn } from "@/lib/utils";

const BOARD_TEXTURE = {
  backgroundImage: "radial-gradient(rgba(243,238,228,0.07) 1px, transparent 1.4px)",
  backgroundSize: "22px 22px",
} as const;

function onPortalPath(path: string) {
  return (
    path === "/market" ||
    path.startsWith("/market/") ||
    path === "/vendor" ||
    path.startsWith("/vendor/")
  );
}

function savedCount(saves: Saves) {
  return (
    saves.markets.length +
    saves.vendors.length +
    saves.blogs.length +
    saves.listings.length +
    (saves.products?.length ?? 0)
  );
}

function useHeaderOffset(ref: { current: HTMLElement | null }) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    let last = "";
    const apply = () => {
      const height = `${el.offsetHeight}px`;
      if (height === last) return;
      last = height;
      document.documentElement.style.setProperty("--header-offset", height);
      document.documentElement.style.setProperty("--header-lg", height);
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(el);
    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty("--header-offset");
      document.documentElement.style.removeProperty("--header-lg");
    };
  }, [ref]);
}

const FRESH_MS = 90_000;

function boardIsFresh(board: HeaderBoard | null) {
  if (!board?.asOf) return false;
  const age = Date.now() - board.asOf;
  return age >= -60_000 && age < FRESH_MS;
}

/**
 * The server passes a snapshot. A fresh one is kept. An old static page, or a
 * failed read, is replaced from /api/header-board. Visibility and a five-minute
 * timer cover a tab left open across the afternoon.
 */
function useLiveBoard(initial: HeaderBoard | null) {
  const [board, setBoard] = useState(initial);
  const current = useRef(initial);
  const fetchedAt = useRef(boardIsFresh(initial) ? Date.now() : 0);

  useEffect(() => {
    let cancelled = false;
    let pending = false;
    let retryTimer = 0;
    let attempt = 0;
    const controller = new AbortController();

    async function load() {
      if (pending) return;
      pending = true;
      window.clearTimeout(retryTimer);
      try {
        const res = await fetch("/api/header-board", { signal: controller.signal });
        if (!res.ok) throw new Error(String(res.status));
        const data = parseHeaderBoard(await res.json());
        if (cancelled) return;
        if (!data) throw new Error("header board");
        fetchedAt.current = Date.now();
        attempt = 0;
        if (current.current && sameHeaderBoard(current.current, data)) return;
        current.current = data;
        setBoard(data);
      } catch (error) {
        if (cancelled || (error instanceof DOMException && error.name === "AbortError")) return;
        attempt += 1;
        if (attempt > 4) return;
        retryTimer = window.setTimeout(() => void load(), 5_000 * attempt);
      } finally {
        pending = false;
      }
    }

    if (!boardIsFresh(current.current)) void load();
    const timer = window.setInterval(() => void load(), 60_000);
    function onVisible() {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - fetchedAt.current < FRESH_MS) return;
      void load();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      controller.abort();
      window.clearInterval(timer);
      window.clearTimeout(retryTimer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return board;
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
    <span className={cn("inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap", className)}>
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

function Wordmark({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      prefetch={false}
      aria-label={`${SITE_NAME} home`}
      className={cn(
        "inline-flex shrink-0 items-center self-start text-chalk outline-none hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-chalk",
        className,
      )}
    >
      <SiteWordmark className="h-9 w-[243px] lg:h-11 lg:w-[297px]" />
    </Link>
  );
}

function Sections() {
  return (
    <>
      {SITE_NAV.map((item) => (
        <NavLink
          key={item.href}
          href={item.href}
          variant="slab"
          prefetch={item.href === "/markets"}
        >
          {item.label}
        </NavLink>
      ))}
    </>
  );
}

function SavedLink() {
  const count = savedCount(useSaves());
  const ready = useMounted();
  return (
    <Link
      href="/saved"
      aria-label={ready ? `Saved, ${count}` : "Saved"}
      className="inline-flex h-10 shrink-0 items-center gap-1.5 px-2.5 text-sm font-medium whitespace-nowrap text-chalk transition-colors hover:bg-chalk/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-chalk"
    >
      <TicketMark className="size-4 shrink-0" />
      Saved
      <span className="type-nums inline-flex min-w-5 items-center justify-center bg-stamp px-1 text-sm font-semibold text-chalk">
        {ready ? count : "\u00a0"}
      </span>
    </Link>
  );
}

function PortalNav() {
  const path = usePathname() || "/";
  const on = onPortalPath(path);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={PORTAL_NAV_LABEL}
        className={cn(
          "inline-flex h-10 shrink-0 cursor-pointer items-center gap-1 px-1 font-inherit text-sm font-medium whitespace-nowrap text-chalk outline-none transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-chalk",
          on && "underline decoration-chalk underline-offset-4",
        )}
      >
        Portal
        <CaretDownMark className="size-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44 rounded-sm bg-card p-0 ring-border">
        {SITE_PORTAL_NAV.map((item) => {
          const current = path === item.href || path.startsWith(`${item.href}/`);
          return (
            <Menu.LinkItem
              key={item.href}
              href={item.href}
              closeOnClick
              className={cn(
                "flex cursor-pointer items-center px-3 py-2 text-sm font-medium text-foreground outline-none hover:bg-secondary focus:bg-secondary data-highlighted:bg-secondary",
                current && "shadow-[inset_3px_0_0_0_var(--primary)]",
              )}
              aria-current={current ? "page" : undefined}
            >
              {item.label}
            </Menu.LinkItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function DayStrip({ board }: { board: HeaderBoard | null }) {
  const countLabel = board ? `${board.openCount} open now` : "Open now";
  return (
    <div className="flex flex-nowrap items-center gap-x-2.5 overflow-x-auto border-t border-chalk/25 bg-black/20 px-4 py-2 [scrollbar-width:none] lg:flex-wrap lg:overflow-x-visible lg:px-5 [&::-webkit-scrollbar]:hidden">
      <LiveLine className="hidden text-sm text-chalk/85 lg:inline-flex" />
      <Link
        href="/markets/open-today"
        prefetch={false}
        aria-label={countLabel}
        className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap text-chalk focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-chalk"
      >
        <OpenDot />
        <span className="inline-flex items-baseline gap-1.5" aria-hidden>
          <span
            className={cn(
              "type-census text-2xl leading-none text-chalk",
              !board && "invisible",
            )}
          >
            {board?.openCount ?? 0}
          </span>
          <span className="text-sm text-chalk/80">open now</span>
        </span>
      </Link>
      {board ? (
        <span className="shrink-0 text-sm font-medium text-chalk">{board.label}</span>
      ) : null}
      {board?.markets.map((market) => (
        <MarketChip key={market.slug} market={market} />
      ))}
    </div>
  );
}

function MarketChip({ market }: { market: HeaderBoardMarket }) {
  return (
    <Link
      href={`/markets/${market.slug}`}
      prefetch={false}
      className="inline-flex shrink-0 items-baseline gap-1.5 px-2 py-1 whitespace-nowrap text-chalk transition-colors hover:bg-chalk/10 focus-visible:outline-2 focus-visible:outline-chalk"
    >
      <span className="text-sm">{market.name}</span>
      <span className="type-nums text-sm font-semibold">{market.hours}</span>
    </Link>
  );
}

export function LiveDayStrip({ initial }: { initial: HeaderBoard }) {
  return <DayStrip board={useLiveBoard(initial)} />;
}

function HeaderBody({ q, search }: { q: string; search: string }) {
  return (
    <div className="grid items-start gap-y-3 px-4 pt-4 pb-3 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)] lg:gap-x-8 lg:gap-y-3 lg:px-5 lg:py-4">
      <Wordmark className="order-1 min-w-0 lg:order-none lg:col-start-1 lg:row-start-1" />
      <div className="order-3 min-w-0 lg:order-none lg:col-start-2 lg:row-start-1">
        <HeaderSearch key={q} initialQuery={q} />
      </div>
      <nav
        aria-label="Primary"
        className="order-4 flex min-w-0 flex-nowrap gap-1 overflow-x-auto [scrollbar-width:none] lg:order-none lg:col-start-1 lg:row-start-2 lg:flex-wrap lg:overflow-x-visible [&::-webkit-scrollbar]:hidden"
      >
        <Sections />
      </nav>
      <div className="order-2 flex min-w-0 items-center justify-between lg:order-none lg:col-start-2 lg:row-start-2 lg:justify-end">
        <SavedLink />
        <span className="flex min-w-0 flex-wrap items-center justify-end">
          <PortalNav />
          <HeaderAccount tone="chalk" search={search} />
        </span>
      </div>
    </div>
  );
}

function HeaderQuery({ pathname }: { pathname: string }) {
  const params = useSearchParams();
  const q = pathname === "/markets" ? (params.get("q") ?? "") : "";
  return <HeaderBody q={q} search={params.toString()} />;
}

export function SiteHeaderFrame({ strip }: { strip: ReactNode }) {
  const pathname = usePathname() || "/";
  const headerRef = useRef<HTMLElement>(null);
  useHeaderOffset(headerRef);

  return (
    <header ref={headerRef} className="sticky top-0 z-40 bg-board text-chalk" style={BOARD_TEXTURE}>
      <SavesHydrator />
      <Suspense fallback={<HeaderBody q="" search="" />}>
        <HeaderQuery pathname={pathname} />
      </Suspense>
      {strip}
    </header>
  );
}
