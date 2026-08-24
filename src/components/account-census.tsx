"use client";

import Link from "next/link";
import { useHydratedSaves } from "@/lib/use-hydrated-saves";
import type { Saves } from "@/lib/saves";

function formatCount(value: number) {
  return value.toLocaleString("en-CA");
}

function CensusCell({
  href,
  value,
  word,
}: {
  href: string;
  value: number;
  word: string;
}) {
  return (
    <Link
      href={href}
      aria-label={`${formatCount(value)} ${word}`}
      className="flex min-w-0 flex-col items-start gap-0.5 px-3 py-3 text-foreground outline-none transition-colors hover:bg-black/10 focus-visible:bg-black/10 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-x-2.5 sm:px-4 sm:py-3.5"
    >
      <span
        aria-hidden
        className="inline-block font-mono text-2xl leading-none tabular-nums tracking-tight sm:text-3xl"
      >
        {formatCount(value)}
      </span>
      <span className="text-base font-medium">{word}</span>
    </Link>
  );
}

export function AccountCensus({
  initialSaves,
  reviewCount,
}: {
  initialSaves: Saves;
  reviewCount: number;
}) {
  const saves = useHydratedSaves(initialSaves);
  const markets = saves.markets.length;
  const stalls = saves.vendors.length;

  return (
    <nav aria-label="On this account" className="bg-ticket">
      <div className="mx-auto grid max-w-6xl grid-cols-3 divide-x divide-receipt/25">
        <CensusCell
          href="#saved"
          value={markets}
          word={markets === 1 ? "saved market" : "saved markets"}
        />
        <CensusCell
          href="#saved"
          value={stalls}
          word={stalls === 1 ? "saved vendor" : "saved vendors"}
        />
        <CensusCell
          href="#reviews"
          value={reviewCount}
          word={reviewCount === 1 ? "saved review" : "saved reviews"}
        />
      </div>
    </nav>
  );
}
