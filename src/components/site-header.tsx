import Link from "next/link";
import { getCurrentProfile } from "@/lib/data/catalog";
import { SITE_NAME } from "@/lib/constants";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export async function SiteHeader() {
  const profile = await getCurrentProfile();

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="font-heading text-xl tracking-tight text-primary">
            {SITE_NAME}
          </span>
          <span className="hidden text-xs tracking-[0.18em] text-muted-foreground uppercase sm:inline">
            Canada
          </span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/search"
            className={cn(buttonVariants({ variant: "ghost" }), "hidden sm:inline-flex")}
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
    </header>
  );
}
