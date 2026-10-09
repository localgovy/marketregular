import Link from "next/link";
import { SiteWordmark } from "@/components/site-mark";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/constants";
import { SITE_FOOTER_NAV, SITE_LEGAL_NAV } from "@/lib/nav";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-border/70 bg-secondary/40">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <SiteWordmark green />
            <span>{SITE_TAGLINE}</span>
          </p>
          <p>© {year} {SITE_NAME}</p>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <nav aria-label="Footer" className="flex flex-wrap gap-4 sm:justify-end">
            {SITE_FOOTER_NAV.map((item) => (
              <Link key={item.href} href={item.href} prefetch={false} className="hover:text-foreground">
                {item.label}
              </Link>
            ))}
          </nav>
          <nav aria-label="Privacy and terms" className="flex flex-wrap gap-4 sm:justify-end">
            {SITE_LEGAL_NAV.map((item) => (
              <Link key={item.href} href={item.href} prefetch={false} className="hover:text-foreground">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
