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

export function formatTime(value: string) {
  const [h, m] = value.split(":").map(Number);
  const hour24 = Number.isFinite(h) ? h : 0;
  const minute = Number.isFinite(m) ? m : 0;
  const period = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;
  if (minute === 0) return `${hour12} ${period}`;
  return `${hour12}:${String(minute).padStart(2, "0")} ${period}`;
}

export function formatHours(opensAt: string, closesAt: string) {
  return `${formatTime(opensAt)}–${formatTime(closesAt)}`;
}

const MONTH_DAY = /^\d{2}-\d{2}$/;

function seasonBound(value: string | null) {
  return value && MONTH_DAY.test(value) ? value : null;
}

export function inSeason(now: Date, start: string | null, end: string | null, tz: string) {
  const from = seasonBound(start);
  const to = seasonBound(end);
  if (!from || !to) return true;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  const day = parts.find((p) => p.type === "day")?.value ?? "01";
  const md = `${month}-${day}`;
  if (from <= to) return md >= from && md <= to;
  return md >= from || md <= to;
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
    if (Number(row.weekday) !== weekday) return false;
    if (!inSeason(now, row.season_start, row.season_end, tz)) return false;
    return minutes >= parseHm(row.opens_at) && minutes <= parseHm(row.closes_at);
  });
}

export function isOpenOnWeekday(schedules: ScheduleRow[], weekday: number) {
  return schedules.some((row) => Number(row.weekday) === weekday);
}

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export function formatMonthDay(value: string) {
  const [month, day] = value.split("-").map(Number);
  if (!month || !day || month < 1 || month > 12) return value;
  return `${MONTHS_SHORT[month - 1]} ${day}`;
}

export function formatSeasonRange(start: string | null, end: string | null) {
  const from = seasonBound(start);
  const to = seasonBound(end);
  if (!from || !to) return "Year-round";
  return `${formatMonthDay(from)} to ${formatMonthDay(to)}`;
}

export function formatSchedule(row: ScheduleRow) {
  const day = WEEKDAYS[row.weekday] ?? "Day";
  const hours = formatHours(row.opens_at, row.closes_at);
  const season = formatSeasonRange(row.season_start, row.season_end);
  let notes = row.notes?.trim() || null;
  if (notes && season === "Year-round") {
    notes = notes.replace(/^Year-round\.?\s*/i, "") || null;
  }
  const detail =
    season === "Year-round"
      ? notes
        ? `Year-round. ${notes}`
        : "Year-round"
      : notes
        ? `${season}. ${notes}`
        : season;
  return { day, hours, detail };
}

export type NextOpenSlot = {
  waitMinutes: number;
  offset: number;
  weekday: number;
  opensAt: string;
};

/** Soonest remaining session in the next week, including the same weekday next week. */
export function nextOpenSlot(
  schedules: ScheduleRow[],
  province: string,
  now = new Date(),
  opts?: { ignoreSeason?: boolean },
): NextOpenSlot | null {
  if (!schedules.length) return null;
  const tz = provinceTz(province);
  const { weekday, minutes } = zonedParts(now, tz);
  for (let offset = 0; offset <= 7; offset += 1) {
    const day = (weekday + offset) % 7;
    let best: NextOpenSlot | null = null;
    for (const row of schedules) {
      if (Number(row.weekday) !== day) continue;
      if (!opts?.ignoreSeason && !inSeason(now, row.season_start, row.season_end, tz)) continue;
      const opens = parseHm(row.opens_at);
      const closes = parseHm(row.closes_at);
      let waitMinutes: number;
      if (offset === 0) {
        if (minutes > closes) continue;
        waitMinutes = minutes >= opens ? 0 : opens - minutes;
      } else {
        waitMinutes = offset * 24 * 60 - minutes + opens;
      }
      if (!best || waitMinutes < best.waitMinutes) {
        best = { waitMinutes, offset, weekday: day, opensAt: row.opens_at };
      }
    }
    if (best) return best;
  }
  return null;
}

export function nextOpenLabel(schedules: ScheduleRow[], province: string, now = new Date()) {
  const slot =
    nextOpenSlot(schedules, province, now) ??
    nextOpenSlot(schedules, province, now, { ignoreSeason: true });
  if (!slot) {
    const row = schedules[0];
    if (!row) return "See schedule";
    const day = WEEKDAYS[Number(row.weekday)] ?? "Day";
    return `${day} ${formatTime(row.opens_at)}`;
  }
  if (slot.waitMinutes === 0) return "Open now";
  if (slot.offset === 0) return `Later today ${formatTime(slot.opensAt)}`;
  if (slot.offset === 1) return `Tomorrow ${formatTime(slot.opensAt)}`;
  return `${WEEKDAYS[slot.weekday]} ${formatTime(slot.opensAt)}`;
}
