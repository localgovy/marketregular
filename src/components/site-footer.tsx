import Link from "next/link";
import { SITE_NAME } from "@/lib/constants";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border/70 bg-secondary/40">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>
          {SITE_NAME} — a directory and live floor for Canadian farmers&apos; markets.
        </p>
        <div className="flex gap-4">
          <Link href="/search" className="hover:text-foreground">
            Find a market
          </Link>
          <Link href="/login" className="hover:text-foreground">
            Vendors
          </Link>
        </div>
      </div>
    </footer>
  );
}
