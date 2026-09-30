import { provinceTz } from "@/lib/constants";
import { LAUNCH_TZ } from "@/lib/launch";
import { isOpenOnWeekday, zonedParts, type ScheduleRow } from "@/lib/schedule";

export type VisitHall = {
  days: number[];
  province: string;
  schedules: ScheduleRow[];
};

function sells(weekday: number, hall: VisitHall, now: Date) {
  if (!hall.days.includes(weekday)) return false;
  return isOpenOnWeekday(hall.schedules, weekday, provinceTz(hall.province), now);
}

/** Days until this vendor is in season at a market they actually work. 0 is today. 8 means no upcoming day. */
export function soonestWait(halls: VisitHall[], now = new Date()) {
  const today = zonedParts(now, LAUNCH_TZ).weekday;
  for (let offset = 0; offset < 7; offset += 1) {
    const weekday = (today + offset) % 7;
    if (halls.some((hall) => sells(weekday, hall, now))) return offset;
  }
  return 8;
}

/** Open today, otherwise selling on the coming Saturday or Sunday. Sunday evening stays quiet. */
export function visitBadge(
  halls: VisitHall[],
  now = new Date(),
): "Open today" | "Selling this weekend" | null {
  const today = zonedParts(now, LAUNCH_TZ).weekday;
  if (halls.some((hall) => sells(today, hall, now))) return "Open today";
  const weekend = today === 0 ? [] : today === 6 ? [0] : [6, 0];
  if (weekend.some((day) => halls.some((hall) => sells(day, hall, now)))) {
    return "Selling this weekend";
  }
  return null;
}
