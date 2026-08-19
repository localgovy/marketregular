import { WEEKDAYS, provinceTz } from "@/lib/constants";

export type ScheduleRow = {
  weekday: number;
  opens_at: string;
  closes_at: string;
  season_start: string | null;
  season_end: string | null;
  notes: string | null;
};

export function parseHm(value: string) {
  const [h, m] = value.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function formatHours(opensAt: string, closesAt: string) {
  return `${opensAt.slice(0, 5)}–${closesAt.slice(0, 5)}`;
}

export function inSeason(now: Date, start: string | null, end: string | null, tz: string) {
  if (!start || !end) return true;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  const day = parts.find((p) => p.type === "day")?.value ?? "01";
  const md = `${month}-${day}`;
  if (start <= end) return md >= start && md <= end;
  return md >= start || md <= end;
}

export function zonedParts(now: Date, tz: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const weekdayName = parts.find((p) => p.type === "weekday")?.value ?? "Sun";
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return { weekday: map[weekdayName] ?? 0, minutes: hour * 60 + minute };
}

export function isMarketOpen(
  schedules: ScheduleRow[],
  province: string,
  now = new Date(),
) {
  const tz = provinceTz(province);
  const { weekday, minutes } = zonedParts(now, tz);
  return schedules.some((row) => {
    if (row.weekday !== weekday) return false;
    if (!inSeason(now, row.season_start, row.season_end, tz)) return false;
    return minutes >= parseHm(row.opens_at) && minutes <= parseHm(row.closes_at);
  });
}

export function isOpenOnWeekday(schedules: ScheduleRow[], weekday: number) {
  return schedules.some((row) => row.weekday === weekday);
}

export function formatSchedule(row: ScheduleRow) {
  const day = WEEKDAYS[row.weekday] ?? "Day";
  const hours = `${row.opens_at.slice(0, 5)}–${row.closes_at.slice(0, 5)}`;
  const season =
    row.season_start && row.season_end
      ? `${row.season_start} to ${row.season_end}`
      : "Year-round";
  return { day, hours, season, notes: row.notes };
}

export function nextOpenLabel(schedules: ScheduleRow[], province: string) {
  if (isMarketOpen(schedules, province)) return "Open now";
  const tz = provinceTz(province);
  const { weekday } = zonedParts(new Date(), tz);
  for (let i = 0; i < 7; i += 1) {
    const day = (weekday + i) % 7;
    const row = schedules.find((s) => s.weekday === day);
    if (!row) continue;
    if (i === 0) return `Later today ${row.opens_at.slice(0, 5)}`;
    if (i === 1) return `Tomorrow ${row.opens_at.slice(0, 5)}`;
    return `${WEEKDAYS[day]} ${row.opens_at.slice(0, 5)}`;
  }
  return "See schedule";
}
