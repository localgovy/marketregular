import Link from "next/link";

type TickerMarket = {
  id: string;
  name: string;
  slug: string;
};

export function FloorStrip({ openNow }: { openNow: TickerMarket[] }) {
  const countLabel = openNow.length === 1 ? "market" : "markets";

  return (
    <nav
      aria-label="On the floor"
      className="mb-5 bg-card shadow-[inset_4px_0_0_var(--ticket)] ring-1 ring-border"
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2.5 sm:px-4">
        <p className="min-w-0 text-base font-medium text-ticket-ink">
          <span className="font-mono tabular-nums">{openNow.length}</span>
          {` ${countLabel} open now`}
        </p>
      </div>
      {openNow.length ? (
        <ul className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 border-t border-border bg-[color-mix(in_srgb,var(--ticket)_7%,var(--card))] px-3 py-2 sm:px-4">
          {openNow.map((market) => (
            <li key={market.id}>
              <Link
                href={`/markets/${market.slug}`}
                prefetch={false}
                className="whitespace-nowrap text-base font-medium hover:text-primary hover:underline hover:underline-offset-4"
              >
                {market.name}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="border-t border-border px-4 py-3 text-sm text-muted-foreground">
          No Toronto market is open this minute.
        </p>
      )}
    </nav>
  );
}
