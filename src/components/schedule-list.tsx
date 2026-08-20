import { Hours } from "@/components/hours";
import { formatSchedule } from "@/lib/schedule";
import type { MarketSchedule } from "@/types/database";

export function ScheduleList({ schedules }: { schedules: MarketSchedule[] }) {
  const rows = [...schedules].sort((a, b) => a.weekday - b.weekday);
  if (!rows.length) {
    return <p className="text-sm text-muted-foreground">Schedule coming soon.</p>;
  }
  return (
    <ul className="divide-y divide-border">
      {rows.map((row) => {
        const formatted = formatSchedule(row);
        return (
          <li key={row.id} className="flex flex-col gap-1 py-2.5">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3">
              <span className="font-medium">{formatted.day}</span>
              <Hours value={formatted.hours} className="text-muted-foreground" />
            </div>
            {formatted.detail ? (
              <p className="text-sm text-muted-foreground">{formatted.detail}</p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
