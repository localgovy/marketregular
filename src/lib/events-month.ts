import { WEEKDAYS } from "@/lib/constants";
import { LAUNCH_TZ } from "@/lib/launch";
import { formatHours, inSeason, parseHm, zonedParts } from "@/lib/schedule";
import type { Market, MarketSchedule } from "@/types/database";

export type EventMarket = Pick<Market, "id" | "slug" | "name" | "address">;

export type CalendarEvent = {
  marketId: string;
  marketName: string;
  marketSlug: string;
  address: string;
  hours: string;
  notes: string | null;
  open: boolean;
};

export type CalendarCell = {
  iso: string;
  year: number;
  month: number;
  day: number;
  weekday: number;
  inMonth: boolean;
  isToday: boolean;
  events: CalendarEvent[];
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function isoDate(year: number, month: number, day: number) {
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function torontoYmd(now = new Date(), tz = LAUNCH_TZ) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Noon-ish in Toronto for a civil date, so weekday and season stay on that day. */
export function torontoNoon(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day, 16, 0, 0));
}

export function parseYearMonth(value?: string, now = new Date()) {
  const today = torontoYmd(now);
  const [ty, tm] = today.split("-").map(Number);
  if (!value) return { year: ty, month: tm };
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return { year: ty, month: tm };
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return { year: ty, month: tm };
  return { year, month };
}

export function monthLabel(year: number, month: number) {
  return new Intl.DateTimeFormat("en-CA", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 15)));
}

export function weekdayShort(weekday: number) {
  return (WEEKDAYS[weekday] ?? "Day").slice(0, 3);
}

export function shiftMonth(year: number, month: number, delta: number) {
  const date = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

export function shiftDay(year: number, month: number, day: number, delta: number) {
  const next = new Date(Date.UTC(year, month - 1, day + delta));
  return {
    year: next.getUTCFullYear(),
    month: next.getUTCMonth() + 1,
    day: next.getUTCDate(),
  };
}

export function findMarketDay(
  from: { year: number; month: number; day: number },
  direction: 1 | -1,
  markets: EventMarket[],
  schedules: MarketSchedule[],
  now = new Date(),
  limitMonths = 14,
): CalendarCell | null {
  let year = from.year;
  let month = from.month;
  let beyond = from.day;

  for (let i = 0; i < limitMonths; i += 1) {
    const days = monthGrid(year, month, markets, schedules, now).filter((cell) => cell.inMonth);
    const hit =
      direction === 1
        ? days.find((cell) => cell.day > beyond && cell.events.length > 0)
        : [...days].reverse().find((cell) => cell.day < beyond && cell.events.length > 0);
    if (hit) return hit;
    const next = shiftMonth(year, month, direction);
    year = next.year;
    month = next.month;
    beyond = direction === 1 ? 0 : 32;
  }

  return null;
}

function eventsForCivilDate(
  year: number,
  month: number,
  day: number,
  markets: EventMarket[],
  scheduleMap: Map<string, MarketSchedule[]>,
  now: Date,
): CalendarEvent[] {
  const when = torontoNoon(year, month, day);
  const tz = LAUNCH_TZ;
  const { weekday } = zonedParts(when, tz);
  const todayIso = torontoYmd(now);
  const iso = isoDate(year, month, day);
  const isToday = iso === todayIso;
  const nowParts = zonedParts(now, tz);
  const events: CalendarEvent[] = [];

  for (const market of markets) {
    const rows = scheduleMap.get(market.id) ?? [];
    const row = rows.find(
      (item) =>
        item.weekday === weekday &&
        inSeason(when, item.season_start, item.season_end, tz),
    );
    if (!row) continue;
    const open =
      isToday &&
      nowParts.minutes >= parseHm(row.opens_at) &&
      nowParts.minutes <= parseHm(row.closes_at);
    events.push({
      marketId: market.id,
      marketName: market.name,
      marketSlug: market.slug,
      address: market.address,
      hours: formatHours(row.opens_at, row.closes_at),
      notes: row.notes,
      open,
    });
  }

  events.sort(
    (a, b) => a.hours.localeCompare(b.hours) || a.marketName.localeCompare(b.marketName),
  );
  return events;
}

export function monthGrid(
  year: number,
  month: number,
  markets: EventMarket[],
  schedules: MarketSchedule[],
  now = new Date(),
): CalendarCell[] {
  const scheduleMap = new Map<string, MarketSchedule[]>();
  for (const row of schedules) {
    const list = scheduleMap.get(row.market_id) ?? [];
    list.push(row);
    scheduleMap.set(row.market_id, list);
  }

  const todayIso = torontoYmd(now);
  const firstWeekday = zonedParts(torontoNoon(year, month, 1), LAUNCH_TZ).weekday;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const leading = firstWeekday;
  const total = Math.ceil((leading + lastDay) / 7) * 7;
  const cells: CalendarCell[] = [];

  for (let i = 0; i < total; i += 1) {
    const dayNum = i - leading + 1;
    const shifted = shiftDay(year, month, 1, dayNum - 1);
    const iso = isoDate(shifted.year, shifted.month, shifted.day);
    cells.push({
      iso,
      year: shifted.year,
      month: shifted.month,
      day: shifted.day,
      weekday: zonedParts(
        torontoNoon(shifted.year, shifted.month, shifted.day),
        LAUNCH_TZ,
      ).weekday,
      inMonth: shifted.month === month && shifted.year === year,
      isToday: iso === todayIso,
      events: eventsForCivilDate(
        shifted.year,
        shifted.month,
        shifted.day,
        markets,
        scheduleMap,
        now,
      ),
    });
  }

  return cells;
}
