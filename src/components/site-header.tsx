import Link from "next/link";
import { NavLink } from "@/components/nav-link";
import { SiteMark } from "@/components/site-mark";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCurrentProfile } from "@/lib/data/catalog";
import { SITE_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

export async function SiteHeader() {
  const profile = await getCurrentProfile();

  return (
    <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-md">
      <div className="header-stripe-paper flex h-16 w-full items-center gap-3 px-4 lg:grid lg:grid-cols-[minmax(240px,25%)_minmax(0,1fr)] lg:gap-0 lg:px-0 lg:shadow-none">
        <div className="flex h-16 items-center lg:header-stripe-board lg:awning-board lg:px-4">
          <Link
            href="/"
            aria-label={`${SITE_NAME} home`}
            className="flex min-w-0 shrink-0 items-center gap-1.5"
          >
            <SiteMark className="size-8 shrink-0" />
            <span className="min-w-0 leading-none">
              <span className="type-wordmark block text-foreground lg:text-chalk">
                marketregular
              </span>
              <span className="type-kicker mt-0.5 hidden text-muted-foreground sm:block lg:text-chalk/70">
                Toronto
              </span>
            </span>
          </Link>
        </div>
        <div className="flex h-16 min-w-0 flex-1 items-center justify-end gap-2 lg:header-stripe-paper lg:justify-between lg:px-6">
          <div className="hidden min-w-0 flex-1 items-center gap-3 md:flex">
            <form action="/markets" className="flex min-w-0 max-w-lg flex-1 items-center gap-2">
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
          </div>
          <nav className="flex shrink-0 items-center gap-3 text-sm font-medium">
            <NavLink href="/events">Events</NavLink>
            <NavLink href="/markets">Markets</NavLink>
            <NavLink href="/feed">Feed</NavLink>
            <NavLink href="/vendors" className="hidden sm:inline">
              Vendors
            </NavLink>
            <NavLink href="/saved">Saved</NavLink>
            {profile?.role === "admin" ? (
              <Link href="/admin" className="hover:underline">
                Desk
              </Link>
            ) : null}
            {profile ? (
              <Link href="/account" className={buttonVariants({ variant: "outline" })}>
                {profile.display_name ?? "Account"}
              </Link>
            ) : null}
          </nav>
        </div>
      </div>
    </header>
  );
}
