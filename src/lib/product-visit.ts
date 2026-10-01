import { provinceTz } from "@/lib/constants";
import { LAUNCH_TZ } from "@/lib/launch";
import { isOpenOnWeekday, sessionToday, zonedParts, type ScheduleRow } from "@/lib/schedule";

export type VisitHall = {
  days: number[];
  province: string;
  schedules: ScheduleRow[];
};

function sells(weekday: number, hall: VisitHall, now: Date) {
  if (!hall.days.includes(weekday)) return false;
  return isOpenOnWeekday(hall.schedules, weekday, provinceTz(hall.province), now);
}

/** Vendor is on today's roster and the hall has not closed. */
function remainingToday(hall: VisitHall, now: Date): "open" | "later" | "off" {
  const weekday = zonedParts(now, LAUNCH_TZ).weekday;
  if (!hall.days.includes(weekday)) return "off";
  const session = sessionToday(hall.schedules, hall.province, now);
  if (session === "open" || session === "later") return session;
  return "off";
}

/** Days until this vendor is in season at a market they actually work. 0 is today. 8 means no upcoming day. */
export function soonestWait(halls: VisitHall[], now = new Date()) {
  const today = zonedParts(now, LAUNCH_TZ).weekday;
  for (let offset = 0; offset < 7; offset += 1) {
    const weekday = (today + offset) % 7;
    if (offset === 0) {
      if (halls.some((hall) => remainingToday(hall, now) !== "off")) return 0;
      continue;
    }
    if (halls.some((hall) => sells(weekday, hall, now))) return offset;
  }
  return 8;
}

/** Still selling today, or the coming weekend. A closed session is not "open today". */
export function visitBadge(
  halls: VisitHall[],
  now = new Date(),
): "Open now" | "Later today" | "Selling this weekend" | null {
  const states = halls.map((hall) => remainingToday(hall, now));
  if (states.includes("open")) return "Open now";
  if (states.includes("later")) return "Later today";
  const today = zonedParts(now, LAUNCH_TZ).weekday;
  const weekend = today === 0 ? [] : today === 6 ? [0] : [6, 0];
  if (weekend.some((day) => halls.some((hall) => sells(day, hall, now)))) {
    return "Selling this weekend";
  }
  return null;
}
