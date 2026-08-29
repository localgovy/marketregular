import { WEEKDAYS } from "@/lib/constants";
import { torontoYmd } from "@/lib/events-month";
import { LAUNCH_TZ } from "@/lib/launch";
import { civilDateAtOffset, formatHours, inSeason, parseHm, zonedParts } from "@/lib/schedule";
import { vendorProductTags } from "@/lib/vendor-tags";
import type { FloorItem, Market, MarketSchedule, StallRef, Vendor } from "@/types/database";

export const TODAY_STALL_CAP = 5;

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
  when: Date,
  tz: string,
) {
  return rows.find(
    (row) => row.weekday === weekday && inSeason(when, row.season_start, row.season_end, tz),
  );
}

function dayLabel(offset: number, weekday: number) {
  if (offset === 0) return "Today";
  if (offset === 1) return "Tomorrow";
  return WEEKDAYS[weekday];
}

function hashSeed(value: string) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function shuffled<T>(items: T[], seed: string): T[] {
  const next = items.slice();
  let h = hashSeed(seed);
  for (let i = next.length - 1; i > 0; i -= 1) {
    h = Math.imul(h, 1664525) + 1013904223;
    const j = (h >>> 0) % (i + 1);
    const a = next[i];
    const b = next[j];
    if (a === undefined || b === undefined) continue;
    next[i] = b;
    next[j] = a;
  }
  return next;
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
  const today = civilDateAtOffset(now, 0, tz);
  const byId = new Map(vendors.map((v) => [v.id, v]));
  const rows: VendorTodayRow[] = [];

  for (const stall of stalls) {
    if (!stall.days.includes(weekday)) continue;
    const market = markets.find((m) => m.id === stall.market_id);
    if (!market) continue;
    const row = scheduleForDay(scheduleMap.get(market.id) ?? [], weekday, today, tz);
    if (!row) continue;
    const vendor = byId.get(stall.id);
    const open = minutes >= parseHm(row.opens_at) && minutes <= parseHm(row.closes_at);
    rows.push({
      vendorName: stall.name,
      vendorSlug: stall.slug,
      tags: vendorProductTags(stall.name, vendor?.tags),
      marketName: market.name,
      marketSlug: market.slug,
      stall: stall.stall,
      hours: formatHours(row.opens_at, row.closes_at),
      open,
    });
  }

  const seed = torontoYmd(now);
  return [
    ...shuffled(
      rows.filter((row) => row.open),
      `${seed}:open`,
    ),
    ...shuffled(
      rows.filter((row) => !row.open),
      `${seed}:shut`,
    ),
  ];
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
    if (+now - +new Date(item.created_at) > weekMs) continue;
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
    const on = civilDateAtOffset(now, offset, tz);
    for (const stall of stalls) {
      if (!stall.days.includes(day)) continue;
      const market = markets.find((m) => m.id === stall.market_id);
      if (!market) continue;
      if (!scheduleForDay(scheduleMap.get(market.id) ?? [], day, on, tz)) continue;
      const vendor = byId.get(stall.id);
      const current = acc.get(stall.id) ?? {
        name: vendor?.name ?? stall.name,
        slug: vendor?.slug ?? stall.slug,
        about: vendor?.about ?? null,
        tags: vendorProductTags(vendor?.name ?? stall.name, vendor?.tags),
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

export function savedVendorsSellingToday(
  savedSlugs: string[],
  stalls: StallRef[],
  markets: Market[],
  vendors: Vendor[],
  scheduleMap: Map<string, MarketSchedule[]>,
  now = new Date(),
): VendorTodayRow[] {
  if (!savedSlugs.length) return [];
  const saved = new Set(savedSlugs);
  return vendorsSellingToday(stalls, markets, vendors, scheduleMap, now)
    .filter((row) => saved.has(row.vendorSlug))
    .sort(
      (a, b) => Number(b.open) - Number(a.open) || a.vendorName.localeCompare(b.vendorName),
    );
}

export function savedVendorsThisWeek(
  savedSlugs: string[],
  stalls: StallRef[],
  markets: Market[],
  vendors: Vendor[],
  scheduleMap: Map<string, MarketSchedule[]>,
  now = new Date(),
): VendorWeekPick[] {
  if (!savedSlugs.length) return [];
  const saved = new Set(savedSlugs);
  const tz = LAUNCH_TZ;
  const { weekday } = zonedParts(now, tz);
  const byId = new Map(vendors.map((vendor) => [vendor.id, vendor]));
  const acc = new Map<string, VendorWeekPick>();

  for (let offset = 0; offset < 7; offset += 1) {
    const day = (weekday + offset) % 7;
    const when = dayLabel(offset, day);
    const on = civilDateAtOffset(now, offset, tz);
    for (const stall of stalls) {
      const vendor = byId.get(stall.id);
      const slug = vendor?.slug ?? stall.slug;
      if (!saved.has(slug)) continue;
      if (!stall.days.includes(day)) continue;
      const market = markets.find((row) => row.id === stall.market_id);
      if (!market) continue;
      if (!scheduleForDay(scheduleMap.get(market.id) ?? [], day, on, tz)) continue;
      const current = acc.get(slug) ?? {
        vendorName: vendor?.name ?? stall.name,
        vendorSlug: slug,
        about: vendor?.about ?? null,
        tags: vendorProductTags(vendor?.name ?? stall.name, vendor?.tags),
        where: [],
      };
      if (!current.where.some((place) => place.marketSlug === market.slug && place.when === when)) {
        current.where.push({ when, marketName: market.name, marketSlug: market.slug });
      }
      acc.set(slug, current);
    }
  }

  return [...acc.values()].sort((a, b) => a.vendorName.localeCompare(b.vendorName));
}
