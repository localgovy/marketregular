"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { HeaderAccount } from "@/components/header-account";
import { SavesHydrator } from "@/components/saves-hydrator";
import { NavLink } from "@/components/nav-link";
import { SiteWordmark, StudioWordmark } from "@/components/site-mark";
import { SearchField } from "@/components/search-field";
import { buttonVariants } from "@/components/ui/button";
import { SEARCH_LABEL, SEARCH_PLACEHOLDER, SITE_NAME, STUDIO_NAME, STUDIO_URL } from "@/lib/constants";
import { isAuthChromePath, SITE_NAV } from "@/lib/nav";
import { cn } from "@/lib/utils";

function HeaderSearch({ className, q = "" }: { className?: string; q?: string }) {
  return (
    <form action="/markets" className={cn("flex min-w-0 items-center gap-2", className)}>
      <SearchField
        key={q}
        name="q"
        defaultValue={q}
        aria-label={SEARCH_LABEL}
        placeholder={SEARCH_PLACEHOLDER}
        className="bg-card"
      />
      <button type="submit" className={cn(buttonVariants(), "shrink-0")}>
        Find
      </button>
    </form>
  );
}

function HeaderFrame({ auth, q }: { auth: boolean; q: string }) {
  return (
    <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-md lg:border-b-2 lg:border-board">
      <div className="flex h-12 w-full items-center gap-3 px-4 lg:grid lg:h-header-bar-lg lg:site-rail lg:gap-0 lg:px-0">
        <div className="flex min-w-0 items-center lg:h-header-bar-lg lg:items-center lg:border-r lg:border-board lg:bg-board lg:px-5 xl:px-6">
          <div className="flex min-w-0 items-center gap-2 lg:h-full">
            <Link
              href="/"
              prefetch={false}
              aria-label={`${SITE_NAME} home`}
              className="inline-flex shrink-0 items-center text-board outline-none hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground lg:text-chalk"
            >
              <SiteWordmark />
            </Link>
            <a
              href={STUDIO_URL}
              rel="noreferrer"
              aria-label={`by ${STUDIO_NAME}`}
              className="type-kicker hidden shrink-0 items-center gap-1 leading-none text-muted-foreground outline-none translate-y-0.5 hover:underline hover:underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground lg:inline-flex lg:text-chalk/70"
            >
              <span>by</span>
              <StudioWordmark />
            </a>
          </div>
        </div>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-3 lg:h-header-bar-lg lg:px-6">
          {auth ? null : (
            <nav
              aria-label="Primary"
              className="hidden h-12 shrink-0 items-stretch divide-x divide-border overflow-visible border border-border bg-secondary xl:flex"
            >
              {SITE_NAV.map((item) => (
                <NavLink key={item.href} href={item.href} variant="tab">
                  {item.label}
                </NavLink>
              ))}
            </nav>
          )}
          {auth ? null : (
            <HeaderSearch className="min-w-0 flex-1 md:min-w-40 xl:ml-auto xl:max-w-md" q={q} />
          )}
          <SavesHydrator />
          <HeaderAccount />
        </div>
      </div>
      {auth ? null : (
        <nav
          aria-label="Primary"
          className="header-stripe-paper grid h-10 grid-cols-4 divide-x divide-border border-t border-border bg-secondary xl:hidden"
        >
          {SITE_NAV.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              variant="tab"
              className="h-10 w-full min-w-0 justify-center px-1 text-center"
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      )}
    </header>
  );
}

function SiteHeaderInner() {
  const pathname = usePathname() || "/";
  const params = useSearchParams();
  const q = pathname === "/markets" ? (params.get("q") ?? "") : "";
  return <HeaderFrame auth={isAuthChromePath(pathname)} q={q} />;
}

export function SiteHeader() {
  return (
    <Suspense fallback={<HeaderFrame auth={false} q="" />}>
      <SiteHeaderInner />
    </Suspense>
  );
}
