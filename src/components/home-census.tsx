import Link from "next/link";

function formatCount(value: number) {
  return value.toLocaleString("en-CA");
}

function CensusCell({
  href,
  value,
  word,
}: {
  href?: string;
  value: number;
  word: string;
}) {
  const label = `${formatCount(value)} ${word}`;
  const className =
    "flex min-w-0 flex-col items-start gap-0.5 px-3 py-3 text-chalk sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-x-2.5 sm:px-4 sm:py-3.5";
  const inner = (
    <>
      <span
        aria-hidden
        className="type-census inline-block text-2xl leading-none sm:text-3xl"
        style={{ minWidth: `${formatCount(value).length}ch` }}
      >
        {formatCount(value)}
      </span>
      <span className="text-base font-medium">{word}</span>
    </>
  );
  if (!href) {
    return (
      <p aria-label={label} className={className}>
        {inner}
      </p>
    );
  }
  return (
    <Link
      href={href}
      aria-label={label}
      className={`${className} outline-none transition-colors hover:bg-white/12 focus-visible:bg-white/12`}
    >
      {inner}
    </Link>
  );
}

export function HomeCensus({
  markets,
  vendors,
  menus,
}: {
  markets: number;
  vendors: number;
  menus: number;
}) {
  return (
    <nav
      aria-label="On the directory"
      className="-mx-4 -mt-5 mb-5 bg-board lg:-mx-6 lg:-mt-6"
    >
      <div className="grid grid-cols-3 divide-x divide-chalk/20">
        <CensusCell
          href="/markets"
          value={markets}
          word={markets === 1 ? "market" : "markets"}
        />
        <CensusCell
          href="/markets"
          value={vendors}
          word={vendors === 1 ? "vendor" : "vendors"}
        />
        <CensusCell
          href="/markets"
          value={menus}
          word={menus === 1 ? "menu item" : "menu items"}
        />
      </div>
    </nav>
  );
}
