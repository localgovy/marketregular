import Link from "next/link";
import { SiteWordmark, StudioWordmark } from "@/components/site-mark";
import { LEGAL_ENTITY, SITE_NAME, STUDIO_NAME, STUDIO_URL } from "@/lib/constants";
import { LAUNCH_COVERAGE } from "@/lib/launch";
import { SITE_FOOTER_NAV, SITE_LEGAL_NAV } from "@/lib/nav";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-border/70 bg-secondary/40">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <SiteWordmark green />
            <a
              href={STUDIO_URL}
              rel="noreferrer"
              aria-label={`by ${STUDIO_NAME}`}
              className="type-kicker inline-flex shrink-0 items-center gap-1 leading-none text-muted-foreground outline-none translate-y-0.5 hover:underline hover:underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
            >
              <span>by</span>
              <StudioWordmark className="lg:text-primary" />
            </a>
            <span>– {LAUNCH_COVERAGE}, farmers&apos; markets, all in one place</span>
          </p>
          <p>
            © {year} {LEGAL_ENTITY} {SITE_NAME}™
          </p>
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
