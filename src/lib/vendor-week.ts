import { WEEKDAYS } from "@/lib/constants";
import { LAUNCH_TZ } from "@/lib/launch";
import { formatHours, inSeason, parseHm, zonedParts } from "@/lib/schedule";
import type { FloorItem, Market, MarketSchedule, StallRef, Vendor } from "@/types/database";

export type VendorTodayRow = {
  vendorName: string;
  vendorSlug: string;
  tags: string[];
  marketName: string;
  marketSlug: string;
  stall: string | null;
  hours: string;
  open: boolean;
};

export type VendorWeekPick = {
  vendorName: string;
  vendorSlug: string;
  about: string | null;
  tags: string[];
  where: Array<{ when: string; marketName: string; marketSlug: string }>;
};

function scheduleForDay(
  rows: MarketSchedule[],
  weekday: number,
  now: Date,
  tz: string,
) {
  return rows.find(
    (row) => row.weekday === weekday && inSeason(now, row.season_start, row.season_end, tz),
  );
}

function dayLabel(offset: number, weekday: number) {
  if (offset === 0) return "Today";
  if (offset === 1) return "Tomorrow";
  return WEEKDAYS[weekday];
}

export function vendorsSellingToday(
  stalls: StallRef[],
  markets: Market[],
  vendors: Vendor[],
  scheduleMap: Map<string, MarketSchedule[]>,
  now = new Date(),
): VendorTodayRow[] {
  const tz = LAUNCH_TZ;
  const { weekday, minutes } = zonedParts(now, tz);
  const byId = new Map(vendors.map((v) => [v.id, v]));
  const rows: VendorTodayRow[] = [];

  for (const stall of stalls) {
    if (!stall.days.includes(weekday)) continue;
    const market = markets.find((m) => m.id === stall.market_id);
    if (!market) continue;
    const row = scheduleForDay(scheduleMap.get(market.id) ?? [], weekday, now, tz);
    if (!row) continue;
    const vendor = byId.get(stall.id);
    const open = minutes >= parseHm(row.opens_at) && minutes <= parseHm(row.closes_at);
    rows.push({
      vendorName: stall.name,
      vendorSlug: stall.slug,
      tags: vendor?.tags ?? [],
      marketName: market.name,
      marketSlug: market.slug,
      stall: stall.stall,
      hours: formatHours(row.opens_at, row.closes_at),
      open,
    });
  }

  rows.sort((a, b) => {
    if (a.open !== b.open) return a.open ? -1 : 1;
    return a.hours.localeCompare(b.hours) || a.vendorName.localeCompare(b.vendorName);
  });
  return rows;
}

export function topVendorsThisWeek(
  stalls: StallRef[],
  markets: Market[],
  vendors: Vendor[],
  scheduleMap: Map<string, MarketSchedule[]>,
  tape: FloorItem[],
  now = new Date(),
  limit = 5,
): VendorWeekPick[] {
  const tz = LAUNCH_TZ;
  const { weekday } = zonedParts(now, tz);
  const byId = new Map(vendors.map((v) => [v.id, v]));
  const weekMs = 7 * 24 * 3600 * 1000;
  const mentionCounts = new Map<string, number>();
  for (const item of tape) {
    if (!item.vendor_slug) continue;
    if (Date.now() - +new Date(item.created_at) > weekMs) continue;
    mentionCounts.set(item.vendor_slug, (mentionCounts.get(item.vendor_slug) ?? 0) + 1);
  }

  type Acc = {
    name: string;
    slug: string;
    about: string | null;
    tags: string[];
    appearances: number;
    markets: Set<string>;
    where: VendorWeekPick["where"];
  };
  const acc = new Map<string, Acc>();

  for (let offset = 0; offset < 7; offset += 1) {
    const day = (weekday + offset) % 7;
    const when = dayLabel(offset, day);
    for (const stall of stalls) {
      if (!stall.days.includes(day)) continue;
      const market = markets.find((m) => m.id === stall.market_id);
      if (!market) continue;
      if (!scheduleForDay(scheduleMap.get(market.id) ?? [], day, now, tz)) continue;
      const vendor = byId.get(stall.id);
      const current = acc.get(stall.id) ?? {
        name: vendor?.name ?? stall.name,
        slug: vendor?.slug ?? stall.slug,
        about: vendor?.about ?? null,
        tags: vendor?.tags ?? [],
        appearances: 0,
        markets: new Set<string>(),
        where: [],
      };
      current.appearances += 1;
      current.markets.add(market.id);
      if (
        current.where.length < 3 &&
        !current.where.some((w) => w.marketSlug === market.slug && w.when === when)
      ) {
        current.where.push({ when, marketName: market.name, marketSlug: market.slug });
      }
      acc.set(stall.id, current);
    }
  }

  return [...acc.values()]
    .sort((a, b) => {
      const scoreA =
        a.appearances * 4 + a.markets.size * 2 + (mentionCounts.get(a.slug) ?? 0) * 3;
      const scoreB =
        b.appearances * 4 + b.markets.size * 2 + (mentionCounts.get(b.slug) ?? 0) * 3;
      return scoreB - scoreA || a.name.localeCompare(b.name);
    })
    .slice(0, limit)
    .map((row) => ({
      vendorName: row.name,
      vendorSlug: row.slug,
      about: row.about,
      tags: row.tags,
      where: row.where,
    }));
}
