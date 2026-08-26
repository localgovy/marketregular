import { DayPlanHoursRow } from "@/components/day-plan-plus";
import { SaveButton } from "@/components/save-button";
import { torontoYmd } from "@/lib/events-month";
import type { DayPlanHall } from "@/lib/day-plan";

type OpenMarket = {
  id: string;
  name: string;
  slug: string;
  hours: string;
  address: string;
  lat: number;
  lng: number;
  date?: string;
};

export function FloorStrip({ openNow }: { openNow: OpenMarket[] }) {
  const countLabel = openNow.length === 1 ? "market" : "markets";
  const date = torontoYmd();

  return (
    <nav
      aria-label="On the floor"
      className="mb-5 bg-card shadow-[inset_4px_0_0_var(--ticket)] ring-1 ring-border"
    >
      <div className="flex flex-wrap items-baseline gap-x-3 px-3 py-2.5 sm:px-4">
        <p className="text-base font-medium text-ticket-ink">
          <span className="type-nums">{openNow.length}</span>
          {` ${countLabel} open now`}
        </p>
      </div>
      {openNow.length ? (
        <ul className="grid gap-px border-t border-border bg-border sm:grid-cols-2">
          {openNow.map((market) => {
            const hall: DayPlanHall = {
              slug: market.slug,
              name: market.name,
              address: market.address,
              lat: market.lat,
              lng: market.lng,
              hours: market.hours,
              date: market.date ?? date,
            };
            return (
              <li key={market.id} className="bg-card">
                <DayPlanHoursRow
                  href={`/markets/${market.slug}`}
                  name={market.name}
                  hours={market.hours}
                  hall={hall}
                  hoursClassName="text-ticket-ink"
                  className="px-3 py-2.5 hover:bg-secondary/60 sm:px-4"
                  save={<SaveButton kind="market" slug={market.slug} name={market.name} />}
                />
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="border-t border-border px-4 py-3 text-sm text-muted-foreground">
          No Toronto market is open this minute.
        </p>
      )}
    </nav>
  );
}
