import { WEEKDAYS, provinceTz } from "@/lib/constants";
import { torontoIsoOffset } from "@/lib/events-month";
import { LAUNCH_CITY, LAUNCH_TZ } from "@/lib/launch";
import { civilDateAtOffset, formatHours, inSeason, parseHm, zonedParts } from "@/lib/schedule";
import type { Market, MarketSchedule, StallRef, Vendor } from "@/types/database";

export const DAY_SLUGS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

export type DaySlug = (typeof DAY_SLUGS)[number];

export function weekdayFromSlug(slug: string): number | null {
  const index = DAY_SLUGS.indexOf(slug as DaySlug);
  return index === -1 ? null : index;
}

export function daySlug(weekday: number): DaySlug {
  return DAY_SLUGS[((weekday % 7) + 7) % 7] ?? "sunday";
}

export function dayName(weekday: number) {
  return WEEKDAYS[((weekday % 7) + 7) % 7] ?? "Sunday";
}

/** Days from today to the next time this weekday comes around. 0 means today. */
export function offsetToWeekday(weekday: number, now = new Date(), tz = LAUNCH_TZ) {
  const today = zonedParts(now, tz).weekday;
  return (weekday - today + 7) % 7;
}

export type MarketDayRow = {
  market: Market;
  hours: string;
  opensMinutes: number;
  notes: string | null;
  /** Only ever true when the day being viewed is today. */
  openNow: boolean;
  stallCount: number;
};

/**
 * Markets that actually hold a session on this weekday, judged on the next date that
 * weekday falls — so a market out of season is not advertised as open.
 */
export function marketsOnWeekday({
  weekday,
  markets,
  scheduleMap,
  stalls = [],
  now = new Date(),
}: {
  weekday: number;
  markets: Market[];
  scheduleMap: Map<string, MarketSchedule[]>;
  stalls?: StallRef[];
  now?: Date;
}): MarketDayRow[] {
  const offset = offsetToWeekday(weekday, now);
  const { minutes } = zonedParts(now, LAUNCH_TZ);
  const stallsByMarket = new Map<string, number>();
  for (const stall of stalls) {
    if (!stall.days.includes(weekday)) continue;
    stallsByMarket.set(stall.market_id, (stallsByMarket.get(stall.market_id) ?? 0) + 1);
  }

  const rows: MarketDayRow[] = [];
  for (const market of markets) {
    const tz = provinceTz(market.province);
    const when = civilDateAtOffset(now, offset, tz);
    const row = (scheduleMap.get(market.id) ?? []).find(
      (item) =>
        Number(item.weekday) === weekday &&
        inSeason(when, item.season_start, item.season_end, tz),
    );
    if (!row) continue;
    const opens = parseHm(row.opens_at);
    const closes = parseHm(row.closes_at);
    rows.push({
      market,
      hours: formatHours(row.opens_at, row.closes_at),
      opensMinutes: opens,
      notes: row.notes,
      openNow: offset === 0 && minutes >= opens && minutes <= closes,
      stallCount: stallsByMarket.get(market.id) ?? 0,
    });
  }
  return rows.sort(
    (a, b) => a.opensMinutes - b.opensMinutes || a.market.name.localeCompare(b.market.name),
  );
}

export function isoForWeekday(weekday: number, now = new Date()) {
  return torontoIsoOffset(now, offsetToWeekday(weekday, now));
}

/** “this Saturday” / “today” / “tomorrow”, for a lede that reads like a person wrote it. */
export function whenWord(weekday: number, now = new Date()) {
  const offset = offsetToWeekday(weekday, now);
  if (offset === 0) return "today";
  if (offset === 1) return "tomorrow";
  return `this ${dayName(weekday)}`;
}

export type CategoryDef = {
  /** URL segment and the tag it filters on. */
  tag: string;
  title: string;
  heading: string;
  lede: string;
  /** Amenity categories describe the hall; product categories describe the stalls. */
  scope: "markets" | "both";
};

/**
 * Curated from the queries the site already gets impressions for. Each one has its own
 * heading and sentence — these are real pages about a real thing people search, not a
 * tag template stamped fourteen times.
 */
export const CATEGORIES: CategoryDef[] = [
  {
    tag: "produce",
    title: `Fruit and vegetable markets in ${LAUNCH_CITY}`,
    heading: `${LAUNCH_CITY} farmers' markets for fruit and vegetables`,
    lede: "Ontario fruit and vegetables bought straight from the people who grew them, and the stalls that bring them in each week.",
    scope: "both",
  },
  {
    tag: "organic",
    title: `Organic farmers' markets in ${LAUNCH_CITY}`,
    heading: `Organic farmers' markets in ${LAUNCH_CITY}`,
    lede: "Growers who farm certified organic or low-spray, and the halls where they set up.",
    scope: "both",
  },
  {
    tag: "vegan",
    title: `Vegan stalls at ${LAUNCH_CITY} farmers' markets`,
    heading: `Vegan stalls at ${LAUNCH_CITY} farmers' markets`,
    lede: "Plant-based bakers, cheesemakers and cooks, and which market floor to find each of them on.",
    scope: "both",
  },
  {
    tag: "bakery",
    title: `Bread and bakery stalls at ${LAUNCH_CITY} farmers' markets`,
    heading: `Bread and bakery stalls at ${LAUNCH_CITY} farmers' markets`,
    lede: "Sourdough, pastry and pie from bakers who only sell a few days a week.",
    scope: "both",
  },
  {
    tag: "prepared-food",
    title: `Prepared food at ${LAUNCH_CITY} farmers' markets`,
    heading: `Prepared food at ${LAUNCH_CITY} farmers' markets`,
    lede: "Lunch on the floor: stalls cooking to order, and the markets that host them.",
    scope: "both",
  },
  {
    tag: "crafts",
    title: `Artisan and craft stalls at ${LAUNCH_CITY} farmers' markets`,
    heading: `Artisan and craft stalls at ${LAUNCH_CITY} farmers' markets`,
    lede: "Makers selling ceramics, textiles, jewellery and woodwork alongside the food.",
    scope: "both",
  },
  {
    tag: "meat",
    title: `Butchers and meat stalls at ${LAUNCH_CITY} farmers' markets`,
    heading: `Butchers and meat stalls at ${LAUNCH_CITY} farmers' markets`,
    lede: "Farms selling their own beef, pork, lamb and poultry direct, with no distributor in between.",
    scope: "both",
  },
  {
    tag: "cheese",
    title: `Cheese stalls at ${LAUNCH_CITY} farmers' markets`,
    heading: `Cheese stalls at ${LAUNCH_CITY} farmers' markets`,
    lede: "Ontario dairies and cheesemongers, and the markets they set up at.",
    scope: "both",
  },
  {
    tag: "flowers",
    title: `Flower stalls at ${LAUNCH_CITY} farmers' markets`,
    heading: `Flower stalls at ${LAUNCH_CITY} farmers' markets`,
    lede: "Cut stems and bouquets from Ontario growers, changing with what is in bloom.",
    scope: "both",
  },
  {
    tag: "honey",
    title: `Honey at ${LAUNCH_CITY} farmers' markets`,
    heading: `Honey at ${LAUNCH_CITY} farmers' markets`,
    lede: "Beekeepers selling their own honey, wax and hive products.",
    scope: "both",
  },
  {
    tag: "coffee",
    title: `Coffee at ${LAUNCH_CITY} farmers' markets`,
    heading: `Coffee at ${LAUNCH_CITY} farmers' markets`,
    lede: "Roasters and coffee bars pouring on the market floor.",
    scope: "both",
  },
  {
    tag: "caribbean",
    title: `Caribbean food at ${LAUNCH_CITY} farmers' markets`,
    heading: `Caribbean food at ${LAUNCH_CITY} farmers' markets`,
    lede: "Caribbean and Afro-Caribbean growers, cooks and bakers, and where they sell each week.",
    scope: "both",
  },
  {
    tag: "indoor",
    title: `Indoor farmers' markets in ${LAUNCH_CITY}`,
    heading: `Indoor farmers' markets in ${LAUNCH_CITY}`,
    lede: "Markets that run under a roof, which is what matters from November through April.",
    scope: "markets",
  },
  {
    tag: "year-round",
    title: `Year-round farmers' markets in ${LAUNCH_CITY}`,
    heading: `Year-round farmers' markets in ${LAUNCH_CITY}`,
    lede: "The markets that never close for the season.",
    scope: "markets",
  },
];

export function categoryBySlug(slug: string) {
  return CATEGORIES.find((category) => category.tag === slug) ?? null;
}

/** Stored tags only. Guessed tags are for search matching, not for listing a page. */
export function hasStoredTag(row: { tags: string[] }, tag: string) {
  return row.tags.includes(tag);
}

export function vendorsWithTag(vendors: Vendor[], tag: string) {
  return vendors
    .filter((vendor) => hasStoredTag(vendor, tag))
    .sort(
      (a, b) =>
        (b.rating_avg ?? 0) - (a.rating_avg ?? 0) ||
        b.review_count - a.review_count ||
        a.name.localeCompare(b.name),
    );
}

/** A hall qualifies by its own tag or by hosting a stall with the tag. */
export function marketsWithTag({
  tag,
  markets,
  vendors,
  stalls,
  scope,
}: {
  tag: string;
  markets: Market[];
  vendors: Vendor[];
  stalls: StallRef[];
  scope: CategoryDef["scope"];
}) {
  if (scope === "markets") {
    return markets.filter((market) => hasStoredTag(market, tag));
  }
  const taggedVendorIds = new Set(
    vendors.filter((vendor) => hasStoredTag(vendor, tag)).map((vendor) => vendor.id),
  );
  const hostIds = new Set(
    stalls.filter((stall) => taggedVendorIds.has(stall.id)).map((stall) => stall.market_id),
  );
  return markets.filter((market) => hasStoredTag(market, tag) || hostIds.has(market.id));
}

export function scheduleMapFrom(schedules: MarketSchedule[]) {
  const map = new Map<string, MarketSchedule[]>();
  for (const row of schedules) {
    const list = map.get(row.market_id) ?? [];
    list.push(row);
    map.set(row.market_id, list);
  }
  return map;
}
