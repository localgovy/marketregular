import Link from "next/link";

function CensusLink({
  href,
  value,
  word,
}: {
  href: string;
  value: number;
  word: string;
}) {
  const count = value.toLocaleString("en-CA");
  return (
    <Link
      href={href}
      aria-label={`${count} ${word}`}
      className="group flex shrink-0 items-baseline gap-2.5 outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ticket"
    >
      <span className="census-plate stall-chip-sm inline-flex min-w-[2.85rem] items-center justify-center px-2.5 py-1 font-mono text-2xl leading-none tabular-nums tracking-tight text-chalk transition-[filter] group-hover:brightness-110">
        {count}
      </span>
      <span className="text-base font-medium group-hover:underline group-hover:underline-offset-4">
        {word}
      </span>
    </Link>
  );
}

export function HomeCensus({
  markets,
  vendors,
}: {
  markets: number;
  vendors: number;
}) {
  return (
    <nav
      aria-label="On the directory"
      className="cal-in mt-4 flex items-center gap-3"
    >
      <CensusLink
        href="/markets"
        value={markets}
        word={markets === 1 ? "market" : "markets"}
      />
      <span
        aria-hidden
        className="h-[2px] min-w-6 flex-1 bg-[repeating-linear-gradient(to_right,color-mix(in_srgb,var(--ticket)_55%,transparent)_0_3px,transparent_3px_9px)]"
      />
      <CensusLink
        href="/vendors"
        value={vendors}
        word={vendors === 1 ? "vendor" : "vendors"}
      />
    </nav>
  );
}
