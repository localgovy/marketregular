import { provinceTz } from "@/lib/constants";
import { dayName } from "@/lib/landing";
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

/** Open today, otherwise the coming Saturday or Sunday. Sunday evening stays quiet. */
export function visitBadge(
  halls: VisitHall[],
  now = new Date(),
): "Open today" | "This weekend" | null {
  const today = zonedParts(now, LAUNCH_TZ).weekday;
  if (halls.some((hall) => sells(today, hall, now))) return "Open today";
  const weekend = today === 0 ? [] : today === 6 ? [0] : [6, 0];
  if (weekend.some((day) => halls.some((hall) => sells(day, hall, now)))) {
    return "This weekend";
  }
  return null;
}

export function daysLabel(days: number[]) {
  const names = [...new Set(days.filter((day) => day >= 0 && day <= 6))].sort((a, b) => a - b);
  if (!names.length) return null;
  return names.map((day) => dayName(day)).join(", ");
}
