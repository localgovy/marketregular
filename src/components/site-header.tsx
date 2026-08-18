import Link from "next/link";
import { getCurrentProfile } from "@/lib/data/catalog";
import { SITE_NAME } from "@/lib/constants";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export async function SiteHeader() {
  const profile = await getCurrentProfile();

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="flex h-16 w-full items-center gap-3 px-4 lg:grid lg:grid-cols-[minmax(240px,25%)_minmax(0,1fr)] lg:gap-0 lg:px-0">
        <Link href="/" className="flex shrink-0 items-baseline gap-2 lg:px-4">
          <span className="font-heading text-xl tracking-tight text-foreground">
            {SITE_NAME}
          </span>
          <span className="hidden text-xs tracking-[0.18em] text-muted-foreground uppercase sm:inline">
            Canada
          </span>
        </Link>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2 lg:justify-between lg:px-6">
          <div className="hidden min-w-0 flex-1 items-center gap-3 md:flex">
            <form action="/search" className="flex min-w-0 max-w-lg flex-1 items-center gap-2">
              <Input
                name="q"
                type="search"
                placeholder="Search markets or vendors"
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
