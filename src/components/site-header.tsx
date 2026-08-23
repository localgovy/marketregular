import Link from "next/link";
import { HeaderAccount } from "@/components/header-account";
import { NavLink } from "@/components/nav-link";
import { SiteMark, StudioWordmark } from "@/components/site-mark";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SITE_NAME, STUDIO_NAME, STUDIO_URL } from "@/lib/constants";
import { SITE_NAV } from "@/lib/nav";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-md">
      <div className="flex h-14 w-full items-center gap-3 px-4 lg:grid lg:h-16 lg:site-rail lg:gap-0 lg:px-0">
        <div className="flex min-w-0 flex-1 items-center lg:h-16 lg:flex-none lg:border-r lg:border-board lg:awning-board lg:px-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <Link href="/" prefetch={false} aria-label={`${SITE_NAME} home`} className="shrink-0">
              <SiteMark className="size-8" />
            </Link>
            <span className="flex min-w-0 items-baseline gap-2 leading-none">
              <Link
                href="/"
                prefetch={false}
                className="type-wordmark shrink-0 text-foreground lg:text-chalk"
              >
                {SITE_NAME}
              </Link>
              <a
                href={STUDIO_URL}
                rel="noreferrer"
                aria-label={`by ${STUDIO_NAME}`}
                className="type-kicker inline-flex shrink-0 items-center gap-1 text-muted-foreground outline-none hover:underline hover:underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground lg:text-chalk/70"
              >
                <span>by</span>
                <StudioWordmark />
              </a>
            </span>
          </div>
        </div>
        <div className="flex min-w-0 items-center justify-end gap-3 lg:h-16 lg:justify-start lg:px-6">
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
            className="hidden min-w-0 max-w-md flex-1 items-center gap-2 md:flex"
          >
            <Input
              name="q"
              type="search"
              placeholder="Search market, vendor, location, food"
              className="bg-card"
              autoComplete="off"
            />
            <button type="submit" className={cn(buttonVariants({ size: "sm" }), "shrink-0")}>
              Find
            </button>
          </form>
          <HeaderAccount />
        </div>
      </div>
      <div
        aria-hidden
        className="hidden lg:grid lg:h-header-stripe lg:site-rail"
      >
        <div className="border-r border-board header-stripe-fill-board" />
        <div className="header-stripe-fill-paper" />
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
            className="min-h-11 w-full min-w-0 justify-center px-1"
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
