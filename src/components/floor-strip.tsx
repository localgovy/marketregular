import Link from "next/link";
import { Hours } from "@/components/hours";

type OpenMarket = {
  id: string;
  name: string;
  slug: string;
  hours: string;
};

export function FloorStrip({ openNow }: { openNow: OpenMarket[] }) {
  const countLabel = openNow.length === 1 ? "market" : "markets";

  return (
    <nav
      aria-label="On the floor"
      className="mb-5 bg-card shadow-[inset_4px_0_0_var(--ticket)] ring-1 ring-border"
    >
      <div className="flex flex-wrap items-baseline gap-x-3 px-3 py-2.5 sm:px-4">
        <p className="text-base font-medium text-ticket-ink">
          <span className="font-mono tabular-nums">{openNow.length}</span>
          {` ${countLabel} open now`}
        </p>
      </div>
      {openNow.length ? (
        <ul className="grid gap-px border-t border-border bg-border sm:grid-cols-2">
          {openNow.map((market) => (
            <li key={market.id} className="bg-card">
              <Link
                href={`/markets/${market.slug}`}
                prefetch={false}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 px-3 py-2.5 hover:bg-secondary/60 sm:px-4"
              >
                <span className="min-w-0 text-base font-medium">{market.name}</span>
                {market.hours ? (
                  <Hours value={market.hours} className="text-ticket-ink" />
                ) : null}
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
