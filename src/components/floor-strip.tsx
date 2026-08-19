"use client";

import Link from "next/link";
import { useSaves } from "@/components/save-button";
import type { Market } from "@/types/database";

export function FloorStrip({ openNow }: { openNow: Market[] }) {
  const saves = useSaves();
  const savedCount = saves.markets.length + saves.vendors.length;

  return (
    <nav
      aria-label="On the floor"
      className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-y border-border py-2.5"
    >
      <p className="inline-flex items-center gap-1.5 text-base font-medium text-ticket">
        <span className="live-dot size-1.5 rounded-full bg-ticket" aria-hidden />
        Open now
      </p>
      {openNow.length ? (
        <ul className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
          {openNow.map((market) => (
            <li key={market.id}>
              <Link
                href={`/markets/${market.slug}`}
                className="text-base font-medium hover:underline"
              >
                {market.name}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="min-w-0 flex-1 text-sm text-muted-foreground">
          No Toronto market is open this minute.
        </p>
      )}
      <p className="flex flex-wrap items-baseline gap-x-3 text-sm font-medium">
        <span className="text-muted-foreground">Jump to:</span>
        <a href="#find" className="text-primary hover:underline">
          Find
        </a>
        <a href="#reviews" className="text-primary hover:underline">
          Reviews
        </a>
        <Link href="/events" className="text-primary hover:underline">
          Events
        </Link>
        <Link href="/saved" className="text-primary hover:underline">
          Saved{savedCount ? ` · ${savedCount}` : ""}
        </Link>
      </p>
    </nav>
  );
}
