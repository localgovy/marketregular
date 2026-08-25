import { WEEKDAYS } from "@/lib/constants";
import { torontoIsoOffset } from "@/lib/events-month";
import { LAUNCH_TZ } from "@/lib/launch";
import { formatHours, inSeason, parseHm, zonedParts } from "@/lib/schedule";
import type { Market, MarketSchedule } from "@/types/database";

export type UpcomingSlot = {
  market: Market;
  hours: string;
  open: boolean;
  notes: string | null;
  opensMinutes: number;
};

export type UpcomingGroup = {
  id: string;
  label: string;
  hint: string;
  date: string;
  iso: string;
  open: boolean;
  slots: UpcomingSlot[];
};

function torontoDateLabel(now: Date, offset: number, tz: string) {
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const [year, month, day] = ymd.split("-").map(Number);
  const utc = Date.UTC(year, month - 1, day + offset);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
  }).format(new Date(utc));
}

function rowForDay(rows: MarketSchedule[], weekday: number, now: Date, tz: string) {
  return rows.find(
    (row) => row.weekday === weekday && inSeason(now, row.season_start, row.season_end, tz),
  );
}

export function upcomingByDay(
  markets: Market[],
  scheduleMap: Map<string, MarketSchedule[]>,
  now = new Date(),
): UpcomingGroup[] {
  const tz = LAUNCH_TZ;
  const { weekday, minutes } = zonedParts(now, tz);
  const openNow: UpcomingSlot[] = [];
  const laterToday: UpcomingSlot[] = [];
  const rest: UpcomingGroup[] = [];

  for (let offset = 0; offset < 7; offset += 1) {
    const day = (weekday + offset) % 7;
    const slots: UpcomingSlot[] = [];
    for (const market of markets) {
      const row = rowForDay(scheduleMap.get(market.id) ?? [], day, now, tz);
      if (!row) continue;
      const opens = parseHm(row.opens_at);
      const closes = parseHm(row.closes_at);
      if (offset === 0 && minutes > closes) continue;
      const open = offset === 0 && minutes >= opens && minutes <= closes;
      slots.push({
        market,
        hours: formatHours(row.opens_at, row.closes_at),
        open,
        notes: row.notes,
        opensMinutes: opens,
      });
    }
    slots.sort((a, b) => a.opensMinutes - b.opensMinutes || a.market.name.localeCompare(b.market.name));
    if (!slots.length) continue;

    if (offset === 0) {
      openNow.push(...slots.filter((s) => s.open));
      laterToday.push(...slots.filter((s) => !s.open));
      continue;
    }

    rest.push({
      id: `day-${day}`,
      label: offset === 1 ? "Tomorrow" : WEEKDAYS[day],
      hint: `${slots.length} market${slots.length === 1 ? "" : "s"}`,
      date: torontoDateLabel(now, offset, tz),
      iso: torontoIsoOffset(now, offset, tz),
      open: false,
      slots,
    });
  }

  const groups: UpcomingGroup[] = [];
  if (openNow.length) {
    groups.push({
      id: "open",
      label: "Open now",
      hint: "Doors are open this minute",
      date: torontoDateLabel(now, 0, tz),
      iso: torontoIsoOffset(now, 0, tz),
      open: true,
      slots: openNow,
    });
  }
  if (laterToday.length) {
    groups.push({
      id: "later",
      label: "Later today",
      hint: WEEKDAYS[weekday],
      date: torontoDateLabel(now, 0, tz),
      iso: torontoIsoOffset(now, 0, tz),
      open: false,
      slots: laterToday,
    });
  }
  groups.push(...rest);
  return groups;
}
