import Link from "next/link";
import { getCurrentProfile } from "@/lib/data/catalog";
import { SITE_NAME } from "@/lib/constants";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export async function SiteHeader() {
  const profile = await getCurrentProfile();

  return (
    <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-md">
      <div className="header-stripe-paper flex h-16 w-full items-center gap-3 px-4 lg:grid lg:grid-cols-[minmax(240px,25%)_minmax(0,1fr)] lg:gap-0 lg:px-0 lg:shadow-none">
        <div className="flex h-16 items-center lg:header-stripe-board lg:bg-board lg:px-4">
          <Link href="/" className="flex shrink-0 items-baseline gap-2">
            <span className="text-xl font-medium tracking-[-0.04em] text-foreground lg:text-chalk">
              {SITE_NAME}
            </span>
            <span className="hidden text-xs tracking-[0.18em] text-muted-foreground uppercase sm:inline lg:text-chalk/70">
              Toronto
            </span>
          </Link>
        </div>
        <div className="flex h-16 min-w-0 flex-1 items-center justify-end gap-2 lg:header-stripe-paper lg:justify-between lg:px-6">
          <div className="hidden min-w-0 flex-1 items-center gap-3 md:flex">
            <form action="/search" className="flex min-w-0 max-w-lg flex-1 items-center gap-2">
              <Input
                name="q"
                type="search"
                placeholder="Search Toronto markets or vendors"
                className="bg-card"
                autoComplete="off"
              />
              <button type="submit" className={cn(buttonVariants({ size: "sm" }), "shrink-0")}>
                Find
              </button>
            </form>
          </div>
          <nav className="flex shrink-0 items-center gap-1 sm:gap-2">
            <Link
              href="/search"
              className={cn(buttonVariants({ variant: "ghost" }), "md:hidden")}
            >
              Search
            </Link>
            {profile?.role === "admin" ? (
              <Link href="/admin" className={buttonVariants({ variant: "ghost" })}>
                Admin
              </Link>
            ) : null}
            {profile ? (
              <Link href="/account" className={buttonVariants({ variant: "outline" })}>
                {profile.display_name ?? "Account"}
              </Link>
            ) : (
              <Link href="/login" className={buttonVariants()}>
                Sign in
              </Link>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
