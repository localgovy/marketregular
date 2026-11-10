"use client";

import "@/lib/native-history";

import { Suspense, useLayoutEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { HeaderAccount } from "@/components/header-account";
import { HeaderSearch } from "@/components/header-search";
import { CaretDownMark, TicketMark } from "@/components/marks";
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
import { PORTAL_NAV_LABEL, SITE_NAV, SITE_PORTAL_NAV } from "@/lib/nav";
import type { Saves } from "@/lib/saves";
import { useMounted } from "@/lib/use-now";
import { cn } from "@/lib/utils";

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
          className="max-sm:justify-self-center"
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

function HeaderBody({ q, search }: { q: string; search: string }) {
  return (
    <div className="grid items-start gap-y-3 px-4 pt-4 pb-3 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)] lg:gap-x-8 lg:gap-y-3 lg:px-5 lg:py-4">
      <Wordmark className="order-1 min-w-0 lg:order-none lg:col-start-1 lg:row-start-1" />
      <div className="order-3 min-w-0 lg:order-none lg:col-start-2 lg:row-start-1">
        <HeaderSearch key={q} initialQuery={q} />
      </div>
      <nav
        aria-label="Primary"
        className="order-4 grid grid-cols-3 gap-x-1 gap-y-1 sm:flex sm:min-w-0 sm:flex-nowrap sm:items-center sm:justify-start sm:gap-1 lg:order-none lg:col-start-1 lg:row-start-2"
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

export function SiteHeaderFrame() {
  const pathname = usePathname() || "/";
  const headerRef = useRef<HTMLElement>(null);
  useHeaderOffset(headerRef);

  return (
    <header ref={headerRef} className="sticky top-0 z-40 bg-board text-chalk">
      <SavesHydrator />
      <Suspense fallback={<HeaderBody q="" search="" />}>
        <HeaderQuery pathname={pathname} />
      </Suspense>
    </header>
  );
}
