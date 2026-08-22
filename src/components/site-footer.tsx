import Link from "next/link";
import { SITE_NAME } from "@/lib/constants";
import { SITE_NAV } from "@/lib/nav";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border/70 bg-secondary/40">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>
          {SITE_NAME} — Toronto farmers&apos; markets, this week.
        </p>
        <div className="flex flex-wrap gap-4">
          {SITE_NAV.map((item) => (
            <Link key={item.href} href={item.href} className="hover:text-foreground">
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
