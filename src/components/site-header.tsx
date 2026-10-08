"use client";

import "@/lib/native-history";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { HeaderAccount } from "@/components/header-account";
import { SavesHydrator } from "@/components/saves-hydrator";
import { CaretDownMark } from "@/components/marks";
import { NavLink } from "@/components/nav-link";
import { SiteWordmark, StudioWordmark } from "@/components/site-mark";
import { HeaderSearch } from "@/components/header-search";
import { Menu } from "@base-ui/react/menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SITE_NAME, STUDIO_NAME, STUDIO_URL } from "@/lib/constants";
import { PORTAL_NAV_LABEL, SITE_NAV, SITE_PORTAL_NAV } from "@/lib/nav";
import { cn } from "@/lib/utils";

function onPortalPath(path: string) {
  return (
    path === "/market" ||
    path.startsWith("/market/") ||
    path === "/vendor" ||
    path.startsWith("/vendor/")
  );
}

function PortalNav() {
  const path = usePathname() || "/";
  const on = onPortalPath(path);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "hidden h-10 shrink-0 cursor-pointer items-center gap-1 border border-border bg-secondary px-3 font-inherit text-sm font-medium whitespace-nowrap text-foreground outline-none hover:bg-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground md:inline-flex lg:h-11",
          on && "bg-card shadow-[inset_0_-3px_0_0_var(--primary)]",
        )}
      >
        {PORTAL_NAV_LABEL}
        <CaretDownMark className="size-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-44 rounded-sm bg-card p-0 ring-border">
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

function HeaderFrame({ q }: { q: string }) {
  return (
    <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-md lg:border-b-2 lg:border-board">
      <div className="flex h-12 w-full items-center gap-2 px-3 sm:gap-3 sm:px-4 lg:grid lg:h-header-bar-lg lg:site-rail lg:gap-0 lg:px-0">
        <div className="flex shrink-0 items-center lg:h-header-bar-lg lg:items-center lg:border-r lg:border-board lg:bg-board lg:px-5 xl:px-6">
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
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3 lg:h-header-bar-lg lg:px-6">
          <nav
            aria-label="Primary"
            className="hidden h-12 shrink-0 items-stretch divide-x divide-border overflow-visible border border-border bg-secondary xl:mr-auto xl:flex"
          >
            {SITE_NAV.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                variant="tab"
                prefetch={item.href === "/markets"}
                className="px-3"
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <HeaderSearch
            key={q}
            initialQuery={q}
            className="min-w-0 flex-1 xl:max-w-lg xl:flex-[0_1_32rem]"
          />
          <SavesHydrator />
          <PortalNav />
          <HeaderAccount />
        </div>
      </div>
      <nav
        aria-label="Primary"
        className="header-stripe-paper flex h-10 divide-x divide-border border-t border-border bg-secondary xl:hidden"
      >
        {SITE_NAV.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            variant="tab"
            prefetch={item.href === "/markets"}
            className="h-10 min-w-0 flex-1 justify-center px-1 text-center"
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}

function HeaderQuery({ pathname }: { pathname: string }) {
  const params = useSearchParams();
  const q = pathname === "/markets" ? (params.get("q") ?? "") : "";
  return <HeaderFrame q={q} />;
}

export function SiteHeader() {
  const pathname = usePathname() || "/";
  return (
    <Suspense fallback={<HeaderFrame q="" />}>
      <HeaderQuery pathname={pathname} />
    </Suspense>
  );
}
