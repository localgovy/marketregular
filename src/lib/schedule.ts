import { WEEKDAYS, provinceTz } from "@/lib/constants";
import { LAUNCH_TZ } from "@/lib/launch";

export type ScheduleRow = {
  weekday: number;
  opens_at: string;
  closes_at: string;
  season_start: string | null;
  season_end: string | null;
  notes?: string | null;
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

export type HallDayHours = { day: string; hours: string };

/** The days this stall works, with that day's market hours. Same lines as a vendor page. */
export function hallDayHours(
  days: number[],
  schedules: ScheduleRow[],
  province: string,
  now = new Date(),
): HallDayHours[] {
  return days.flatMap((day) => {
    const session = sessionOnWeekday(schedules, day, province, now);
    if (!session) return [];
    const name = WEEKDAYS[day]?.slice(0, 3);
    if (!name) return [];
    return [{ day: name, hours: formatHours(session.opens_at, session.closes_at) }];
  });
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

/** Days from today to the next time this weekday comes around. 0 means today. */
export function weekdayOffset(weekday: number, now = new Date(), tz = LAUNCH_TZ) {
  const today = zonedParts(now, tz).weekday;
  return (weekday - today + 7) % 7;
}

/** In-season session on the next date this weekday falls. */
export function sessionOnWeekday(
  schedules: ScheduleRow[],
  weekday: number,
  province: string,
  now = new Date(),
) {
  const tz = provinceTz(province);
  const offset = weekdayOffset(weekday, now, tz);
  const when = civilDateAtOffset(now, offset, tz);
  return (
    schedules.find(
      (item) =>
        Number(item.weekday) === weekday &&
        inSeason(when, item.season_start, item.season_end, tz),
    ) ?? null
  );
}

/** Hours for each weekday that is actually in season on its next date. */
export function currentWeekSessions(
  schedules: ScheduleRow[],
  province: string,
  now = new Date(),
): HallDayHours[] {
  const sessions: HallDayHours[] = [];
  for (let weekday = 0; weekday < 7; weekday += 1) {
    const session = sessionOnWeekday(schedules, weekday, province, now);
    if (!session) continue;
    const day = WEEKDAYS[weekday]?.slice(0, 3);
    if (!day) continue;
    sessions.push({ day, hours: formatHours(session.opens_at, session.closes_at) });
  }
  return sessions;
}

/** Noon-ish UTC for a civil date in `tz`, shifted by whole days from `now`. */
export function civilDateAtOffset(now: Date, offset: number, tz: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const year = Number(parts.find((p) => p.type === "year")?.value ?? 2026);
  const month = Number(parts.find((p) => p.type === "month")?.value ?? 1);
  const day = Number(parts.find((p) => p.type === "day")?.value ?? 1);
  return new Date(Date.UTC(year, month - 1, day + offset, 16, 0, 0));
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

export function isOpenOnWeekday(
  schedules: ScheduleRow[],
  weekday: number,
  tz = LAUNCH_TZ,
  now = new Date(),
) {
  const today = zonedParts(now, tz).weekday;
  const offset = (weekday - today + 7) % 7;
  const when = civilDateAtOffset(now, offset, tz);
  return schedules.some(
    (row) =>
      Number(row.weekday) === weekday &&
      inSeason(when, row.season_start, row.season_end, tz),
  );
}

/** Today's session at this hall: still ahead, underway, already over, or not scheduled. */
export function sessionToday(
  schedules: ScheduleRow[],
  province: string,
  now = new Date(),
): "open" | "later" | "done" | "off" {
  const tz = provinceTz(province);
  const { weekday, minutes } = zonedParts(now, tz);
  let later = false;
  let done = false;
  for (const row of schedules) {
    if (Number(row.weekday) !== weekday) continue;
    if (!inSeason(now, row.season_start, row.season_end, tz)) continue;
    const opens = parseHm(row.opens_at);
    const closes = parseHm(row.closes_at);
    if (minutes > closes) done = true;
    else if (minutes >= opens) return "open";
    else later = true;
  }
  if (later) return "later";
  if (done) return "done";
  return "off";
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
  if (from && to) {
    if (from === to) return formatMonthDay(from);
    return `${formatMonthDay(from)} to ${formatMonthDay(to)}`;
  }
  if (from) return `From ${formatMonthDay(from)}`;
  if (to) return `Until ${formatMonthDay(to)}`;
  return "Year-round";
}

type ScheduleOrder = {
  weekday: number;
  season_start: string | null;
  opens_at?: string;
};

/**
 * Dated sessions first, by season start (MM-DD), then weekday, then open time.
 * A one-day weekend reads Friday, Saturday, Sunday when each row has its own date.
 * Year-round rows have no start, so they stay in weekday order after the dated ones.
 */
export function compareScheduleRows(a: ScheduleOrder, b: ScheduleOrder) {
  const startA = seasonBound(a.season_start);
  const startB = seasonBound(b.season_start);
  if (startA !== startB) {
    if (!startA) return 1;
    if (!startB) return -1;
    return startA < startB ? -1 : 1;
  }
  const day = Number(a.weekday) - Number(b.weekday);
  if (day !== 0) return day;
  const openA = a.opens_at ?? "";
  const openB = b.opens_at ?? "";
  if (openA === openB) return 0;
  return openA < openB ? -1 : 1;
}

export function sortScheduleRows<T extends ScheduleOrder>(rows: readonly T[]) {
  return [...rows].sort(compareScheduleRows);
}

/** Weekdays in hours-list order. Days with no schedule row follow, by weekday number. */
export function orderWeekdays(days: readonly number[], schedules: readonly ScheduleOrder[]) {
  const unique = [...new Set(days.map(Number))].filter((day) => day >= 0 && day <= 6);
  const rank = new Map<number, number>();
  for (const row of sortScheduleRows(schedules)) {
    const day = Number(row.weekday);
    if (day < 0 || day > 6 || rank.has(day)) continue;
    rank.set(day, rank.size);
  }
  return unique.sort((a, b) => {
    const left = rank.get(a);
    const right = rank.get(b);
    if (left != null && right != null) return left - right;
    if (left != null) return -1;
    if (right != null) return 1;
    return a - b;
  });
}

/** When every session is the same weekday: "Saturday only". */
export function onlyWeekdayLabel(schedules: ScheduleRow[]) {
  const days = [...new Set(schedules.map((row) => Number(row.weekday)))];
  if (days.length !== 1) return null;
  const day = WEEKDAYS[days[0]];
  return day ? `${day} only` : null;
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
  closesAt: string;
};

const NEXT_OPEN_HORIZON = 366;

/** Soonest remaining in-season session, including the same weekday next week. */
export function nextOpenSlot(
  schedules: ScheduleRow[],
  province: string,
  now = new Date(),
  opts?: { ignoreSeason?: boolean; horizonDays?: number },
): NextOpenSlot | null {
  if (!schedules.length) return null;
  const tz = provinceTz(province);
  const { weekday, minutes } = zonedParts(now, tz);
  const horizon = opts?.horizonDays ?? NEXT_OPEN_HORIZON;
  for (let offset = 0; offset <= horizon; offset += 1) {
    const day = (weekday + offset) % 7;
    const when = civilDateAtOffset(now, offset, tz);
    let best: NextOpenSlot | null = null;
    for (const row of schedules) {
      if (Number(row.weekday) !== day) continue;
      if (!opts?.ignoreSeason && !inSeason(when, row.season_start, row.season_end, tz)) {
        continue;
      }
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
        best = {
          waitMinutes,
          offset,
          weekday: day,
          opensAt: row.opens_at,
          closesAt: row.closes_at,
        };
      }
    }
    if (best) return best;
  }
  return null;
}

/** Calendar date for a session a week or more away. Null when the weekday label is enough. */
export function nextOpenDateLabel(province: string, now: Date, slot: NextOpenSlot) {
  if (slot.offset < 7) return null;
  const tz = provinceTz(province);
  const when = civilDateAtOffset(now, slot.offset, tz);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(when);
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  const day = parts.find((p) => p.type === "day")?.value ?? "01";
  const year = parts.find((p) => p.type === "year")?.value;
  const nowYear = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
  }).format(now);
  const date = formatMonthDay(`${month}-${day}`);
  if (year && year !== nowYear) return `${date} ${year}`;
  return date;
}

export function nextOpenLabel(schedules: ScheduleRow[], province: string, now = new Date()) {
  const slot = nextOpenSlot(schedules, province, now);
  if (!slot) return "See schedule";
  if (slot.waitMinutes === 0) return "Open now";
  if (slot.offset === 0) return `Later today ${formatTime(slot.opensAt)}`;
  if (slot.offset === 1) return `Tomorrow ${formatTime(slot.opensAt)}`;
  if (slot.offset < 7) return `${WEEKDAYS[slot.weekday]} ${formatTime(slot.opensAt)}`;
  const date = nextOpenDateLabel(province, now, slot);
  const hours = formatHours(slot.opensAt, slot.closesAt);
  return `${date}, ${hours}`;
}
