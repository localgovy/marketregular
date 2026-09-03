import { torontoIsoOffset, torontoNoon, torontoYmd } from "@/lib/events-month";
import { provinceTz } from "@/lib/constants";
import { LAUNCH_TZ } from "@/lib/launch";
import {
  formatHours,
  formatTime,
  inSeason,
  nextOpenSlot,
  zonedParts,
  type ScheduleRow,
} from "@/lib/schedule";

export function weekdayFromIso(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return 0;
  return zonedParts(torontoNoon(year, month, day), LAUNCH_TZ).weekday;
}

export function nextIsoForWeekdays(days: number[], now = new Date()) {
  if (!days.length) return torontoYmd(now);
  const today = zonedParts(now, LAUNCH_TZ).weekday;
  for (let offset = 0; offset < 7; offset += 1) {
    if (days.includes((today + offset) % 7)) return torontoIsoOffset(now, offset);
  }
  return torontoYmd(now);
}

export function hoursOnIso(schedules: ScheduleRow[], province: string, iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return "";
  const when = torontoNoon(year, month, day);
  const tz = provinceTz(province);
  const { weekday } = zonedParts(when, tz);
  const row = schedules.find(
    (item) =>
      Number(item.weekday) === weekday && inSeason(when, item.season_start, item.season_end, tz),
  );
  return row ? formatHours(row.opens_at, row.closes_at) : "";
}

export function nextDateAndHours(schedules: ScheduleRow[], province: string, now = new Date()) {
  const tz = provinceTz(province);
  const slot = nextOpenSlot(schedules, province, now);
  if (!slot) {
    return { date: torontoYmd(now), hours: "" };
  }
  const date = torontoIsoOffset(now, slot.offset, tz);
  const hours = hoursOnIso(schedules, province, date);
  return {
    date,
    hours: hours || formatTime(slot.opensAt),
  };
}

type HallMarket = {
  slug: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  province: string;
};

export function hallHours(
  market: Pick<HallMarket, "province">,
  schedules: ScheduleRow[],
  date?: string,
  now = new Date(),
) {
  if (date) return hoursOnIso(schedules, market.province, date);
  return nextDateAndHours(schedules, market.province, now).hours;
}

export function stallNextDate(
  market: HallMarket,
  schedules: ScheduleRow[],
  stallDays: number[] = [],
  now = new Date(),
) {
  const rows = stallDays.length
    ? schedules.filter((row) => stallDays.includes(Number(row.weekday)))
    : schedules;
  return nextDateAndHours(rows.length ? rows : schedules, market.province, now).date;
}
