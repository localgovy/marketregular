import Link from "next/link";
import { SiteWordmark } from "@/components/site-mark";
import { STUDIO_NAME, STUDIO_URL } from "@/lib/constants";
import { SITE_NAV } from "@/lib/nav";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border/70 bg-secondary/40">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <SiteWordmark className="text-foreground" />
          <span>
            by{" "}
            <a href={STUDIO_URL} rel="noreferrer" className="hover:text-foreground">
              {STUDIO_NAME}
            </a>{" "}
            – Toronto Farmers&apos; Markets, all in one place
          </span>
        </p>
        <div className="flex flex-wrap gap-4">
          {SITE_NAV.map((item) => (
            <Link key={item.href} href={item.href} prefetch={false} className="hover:text-foreground">
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
