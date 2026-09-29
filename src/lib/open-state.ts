import { LAUNCH_TZ } from "@/lib/launch";
import { torontoYmd } from "@/lib/events-month";
import { zonedParts } from "@/lib/schedule";

export function sessionIsOpen(
  row: { date: string; opensMinutes: number; closesMinutes: number },
  now: Date,
) {
  const { minutes } = zonedParts(now, LAUNCH_TZ);
  return (
    row.date === torontoYmd(now) &&
    minutes >= row.opensMinutes &&
    minutes <= row.closesMinutes
  );
}
