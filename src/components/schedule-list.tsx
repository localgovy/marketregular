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
          <li key={row.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2.5">
            <span className="font-medium">{formatted.day}</span>
            <span className="text-muted-foreground">
              <span className="tabular-nums">{formatted.hours}</span>
              <span className="ml-2">{formatted.season}</span>
            </span>
            {formatted.notes ? (
              <p className="w-full text-xs text-muted-foreground">{formatted.notes}</p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
