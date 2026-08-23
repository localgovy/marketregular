import Link from "next/link";
import { NavLink } from "@/components/nav-link";
import { SiteMark, StudioMark } from "@/components/site-mark";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCurrentProfile } from "@/lib/data/catalog";
import { SITE_NAME, STUDIO_NAME, STUDIO_URL } from "@/lib/constants";
import { SITE_NAV } from "@/lib/nav";
import { cn } from "@/lib/utils";

export async function SiteHeader() {
  const profile = await getCurrentProfile();

  return (
    <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-md">
      <div className="header-stripe-paper flex h-16 w-full items-center gap-3 px-4 lg:grid lg:grid-cols-[minmax(18rem,26%)_minmax(0,1fr)] lg:gap-0 lg:px-0 lg:shadow-none">
        <div className="flex h-16 items-center lg:header-stripe-board lg:awning-board lg:px-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <Link href="/" aria-label={`${SITE_NAME} home`} className="shrink-0">
              <SiteMark className="size-8" priority />
            </Link>
            <span className="min-w-0 leading-none">
              <Link
                href="/"
                className="type-wordmark block text-foreground lg:text-chalk"
              >
                {SITE_NAME}
              </Link>
              <span className="type-kicker mt-0.5 flex items-center gap-1.5 text-muted-foreground lg:text-chalk/70">
                <span className="hidden sm:inline">Toronto</span>
                <span className="hidden sm:inline" aria-hidden>
                  ·
                </span>
                <a
                  href={STUDIO_URL}
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 outline-none hover:text-foreground hover:underline hover:underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground lg:hover:text-chalk"
                >
                  <StudioMark />
                  <span>by {STUDIO_NAME}</span>
                </a>
              </span>
            </span>
          </div>
        </div>
        <div className="flex h-16 min-w-0 flex-1 items-center justify-end gap-3 lg:header-stripe-paper lg:justify-start lg:px-6">
          <nav
            aria-label="Primary"
            className="flex h-12 shrink-0 items-stretch divide-x divide-border overflow-visible border border-border bg-secondary"
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
          {profile?.role === "admin" ? (
            <Link href="/admin" className="shrink-0 text-sm font-medium hover:underline">
              Desk
            </Link>
          ) : null}
          {profile ? (
            <Link
              href="/account"
              className={cn(buttonVariants({ variant: "outline" }), "shrink-0")}
            >
              {profile.display_name ?? "Account"}
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}
