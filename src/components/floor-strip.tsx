import { HoursRow } from "@/components/hours-row";
import { NowLabel } from "@/components/now-label";
import { SaveButton } from "@/components/save-button";
import { marketListName } from "@/lib/listing-copy";

type OpenMarket = {
  id: string;
  name: string;
  slug: string;
  hours: string;
  address: string;
  city?: string;
  lat: number;
  lng: number;
  date?: string;
};

export function FloorStrip({ openNow }: { openNow: OpenMarket[] }) {
  const countLabel = openNow.length === 1 ? "market" : "markets";

  return (
    <nav
      aria-label="On the floor"
      className="mb-5 bg-card shadow-[inset_4px_0_0_var(--stamp)] ring-1 ring-border"
    >
      <div className="flex flex-wrap items-baseline gap-x-3 px-3 py-2.5 sm:px-4">
        {openNow.length ? (
          <NowLabel className="text-base">
            <span>
              <span className="type-nums">{openNow.length}</span>
              {` ${countLabel} open now`}
            </span>
          </NowLabel>
        ) : (
          <p className="text-base font-medium text-stamp">
            <span className="type-nums">0</span>
            {` ${countLabel} open now`}
          </p>
        )}
      </div>
      {openNow.length ? (
        <ul className="grid gap-px border-t border-border bg-border sm:grid-cols-2">
          {openNow.map((market) => (
            <li key={market.id} className="bg-card">
              <HoursRow
                href={`/markets/${market.slug}`}
                name={marketListName(market.name, market.city ?? "")}
                hours={market.hours}
                hoursClassName="text-stamp"
                className="px-3 py-2.5 hover:bg-secondary/60 sm:px-4"
                save={<SaveButton kind="market" slug={market.slug} name={market.name} />}
              />
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
