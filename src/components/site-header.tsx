import Link from "next/link";
import { HeaderAccount } from "@/components/header-account";
import { SavesHydrator } from "@/components/saves-hydrator";
import { NavLink } from "@/components/nav-link";
import { SiteWordmark, StudioWordmark } from "@/components/site-mark";
import { SearchField } from "@/components/search-field";
import { buttonVariants } from "@/components/ui/button";
import { SITE_NAME, STUDIO_NAME, STUDIO_URL } from "@/lib/constants";
import { SITE_NAV } from "@/lib/nav";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-md lg:border-b-2 lg:border-board">
      <div className="flex h-14 w-full items-center gap-3 px-4 lg:grid lg:h-16 lg:site-rail lg:gap-0 lg:px-0">
        <div className="flex min-w-0 flex-1 items-center lg:h-16 lg:flex-none lg:border-r lg:border-board lg:bg-board lg:px-4">
          <div className="flex min-w-0 items-center gap-2">
            <Link
              href="/"
              prefetch={false}
              aria-label={`${SITE_NAME} home`}
              className="inline-flex shrink-0 items-center text-foreground outline-none hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground lg:text-chalk"
            >
              <SiteWordmark />
            </Link>
            <a
              href={STUDIO_URL}
              rel="noreferrer"
              aria-label={`by ${STUDIO_NAME}`}
              className="type-kicker inline-flex shrink-0 items-center gap-1 leading-none text-muted-foreground outline-none translate-y-0.5 hover:underline hover:underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground lg:text-chalk/70"
            >
              <span>by</span>
              <StudioWordmark />
            </a>
          </div>
        </div>
        <div className="flex min-w-0 items-center justify-end gap-3 lg:h-16 lg:px-6">
          <nav
            aria-label="Primary"
            className="hidden h-12 shrink-0 items-stretch divide-x divide-border overflow-visible border border-border bg-secondary lg:flex"
          >
            {SITE_NAV.map((item) => (
              <NavLink key={item.href} href={item.href} variant="tab">
                {item.label}
              </NavLink>
            ))}
          </nav>
          <form
            action="/markets"
            className="hidden min-w-0 w-full max-w-md items-center gap-2 md:flex lg:ml-auto"
          >
            <SearchField
              name="q"
              aria-label="Search market, vendor, cuisine, or neighbourhood"
              placeholder="Search market, vendor, cuisine, or neighbourhood"
              className="bg-card"
            />
            <button type="submit" className={cn(buttonVariants({ size: "sm" }), "shrink-0")}>
              Find
            </button>
          </form>
          <SavesHydrator />
          <Link
            href="/contact"
            prefetch={false}
            className="hidden shrink-0 text-sm font-medium hover:underline sm:inline"
          >
            Contact
          </Link>
          <HeaderAccount />
        </div>
      </div>
      <nav
        aria-label="Primary"
        className="header-stripe-paper grid grid-cols-5 divide-x divide-border border-t border-border bg-secondary lg:hidden"
      >
        {SITE_NAV.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            variant="tab"
            className="min-h-11 w-full min-w-0 justify-center px-1 whitespace-normal text-center leading-tight"
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
