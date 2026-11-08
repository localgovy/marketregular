import { hallHours } from "@/lib/day-plan";
import { FIND_AREAS, weekdayInToronto } from "@/lib/find-paths";
import {
  currentWeekSessions,
  formatSchedule,
  nextOpenLabel,
  nextOpenSlot,
  sortScheduleRows,
} from "@/lib/schedule";
import { upcomingByDay } from "@/lib/upcoming";
import type { Market, MarketSchedule } from "@/types/database";
import type {
  FloorMarket,
  FloorMarketStatic,
  FloorSchedule,
  MarketsFloorBase,
  MarketsFloorView,
} from "@/lib/markets-floor-types";

function neighbourhoodFor(market: { slug: string; city: string }) {
  for (const area of FIND_AREAS) {
    if (area.slugs.includes(market.slug)) return area.label;
  }
  return market.city || "Toronto";
}

export function floorSchedules(rows: readonly MarketSchedule[]): FloorSchedule[] {
  return rows.map((row) => ({
    weekday: Number(row.weekday),
    opens_at: row.opens_at,
    closes_at: row.closes_at,
    season_start: row.season_start,
    season_end: row.season_end,
    notes: row.notes,
  }));
}

function asSchedule(marketId: string, row: FloorSchedule, index: number): MarketSchedule {
  return {
    id: `${marketId}:${index}`,
    market_id: marketId,
    weekday: row.weekday,
    opens_at: row.opens_at,
    closes_at: row.closes_at,
    season_start: row.season_start,
    season_end: row.season_end,
    notes: row.notes,
  };
}

function asMarket(market: FloorMarketStatic): Market {
  return {
    id: market.id,
    slug: market.slug,
    name: market.name,
    city: market.city,
    address: market.address,
    province: market.province,
    lat: market.lat,
    lng: market.lng,
    logo_url: market.logo_url,
    rating_avg: market.rating_avg,
    review_count: market.review_count,
    tags: market.tags,
  } as Market;
}

function toFloorMarket(
  market: FloorMarketStatic,
  schedules: MarketSchedule[],
  openIds: Set<string>,
  now: Date,
): FloorMarket {
  const open = openIds.has(market.id);
  const nextSlot = nextOpenSlot(schedules, market.province, now);
  const sessions = currentWeekSessions(schedules, market.province, now);
  const hours = hallHours(market, schedules, undefined, now);
  return {
    id: market.id,
    slug: market.slug,
    name: market.name,
    city: market.city,
    address: market.address,
    province: market.province,
    lat: market.lat,
    lng: market.lng,
    logo_url: market.logo_url,
    rating_avg: market.rating_avg ?? null,
    review_count: market.review_count ?? 0,
    tags: market.tags ?? [],
    open,
    hours: hours || sessions[0]?.hours || "",
    nextOpen: schedules.length
      ? nextOpenLabel(schedules, market.province, now)
      : open
        ? "Open now"
        : "Hours",
    sessions,
    vendorCount: market.vendorCount,
    neighbourhood: market.neighbourhood || neighbourhoodFor(market),
    waitMinutes: open ? 0 : nextSlot && Number.isFinite(nextSlot.waitMinutes) ? nextSlot.waitMinutes : null,
    dayNames: [...new Set(sortScheduleRows(schedules).map((row) => formatSchedule(row).day))],
    indoor_outdoor: market.indoor_outdoor,
  };
}

/** Open, hours, and the week groups for one moment. The page ships the inputs and calls this in the browser. */
export function applyFloorClock(base: MarketsFloorBase, now: Date): MarketsFloorView {
  const scheduleMap = new Map<string, MarketSchedule[]>();
  const markets = base.markets.map((market) => {
    const schedules = market.schedules.map((row, index) => asSchedule(market.id, row, index));
    scheduleMap.set(market.id, schedules);
    return asMarket(market);
  });
  const week = upcomingByDay(markets, scheduleMap, now, { includeClosedToday: true });
  const openIds = new Set((week.find((group) => group.open)?.slots ?? []).map((slot) => slot.market.id));
  const enrichedMarkets = base.markets
    .map((market) => toFloorMarket(market, scheduleMap.get(market.id) ?? [], openIds, now))
    .sort(
      (a, b) =>
        Number(b.open) - Number(a.open) ||
        (a.waitMinutes ?? Number.POSITIVE_INFINITY) - (b.waitMinutes ?? Number.POSITIVE_INFINITY) ||
        b.review_count - a.review_count ||
        a.name.localeCompare(b.name),
    );

  return {
    todayWeekday: weekdayInToronto(now),
    fullWeek: week.map((group) => ({
      id: group.id,
      label: group.label,
      slots: group.slots.map((slot) => ({
        slug: slot.market.slug,
        hours: slot.hours,
        open: slot.open,
      })),
    })),
    enrichedMarkets,
    roster: base.roster,
    taxonomyBySlug: base.taxonomyBySlug,
  };
}
