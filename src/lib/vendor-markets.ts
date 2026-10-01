import { nextOpenSlot, sessionOnWeekday, type ScheduleRow } from "@/lib/schedule";

export type RankedVendorMarket = {
  name: string;
  province: string;
  days: number[];
  schedules: ScheduleRow[];
};

function stallSchedules(market: RankedVendorMarket) {
  if (!market.days.length) return [];
  return market.schedules.filter((row) => market.days.includes(Number(row.weekday)));
}

/** True when a weekday this stall works has an in-season session on its next date. */
export function vendorMarketInSeason(market: RankedVendorMarket, now = new Date()) {
  if (!market.days.length) return false;
  return market.days.some(
    (day) => sessionOnWeekday(market.schedules, day, market.province, now) != null,
  );
}

/** Days until the next in-season session this stall works. No session sorts last. */
export function vendorMarketWait(market: RankedVendorMarket, now = new Date()) {
  const rows = stallSchedules(market);
  if (!rows.length) return Number.POSITIVE_INFINITY;
  const slot = nextOpenSlot(rows, market.province, now);
  return slot ? slot.offset : Number.POSITIVE_INFINITY;
}

/** In-season markets first, then the soonest session, then name. */
export function rankVendorMarkets<T extends RankedVendorMarket>(markets: T[], now = new Date()) {
  return [...markets].sort((a, b) => {
    const season = Number(vendorMarketInSeason(b, now)) - Number(vendorMarketInSeason(a, now));
    if (season) return season;
    const waitA = vendorMarketWait(a, now);
    const waitB = vendorMarketWait(b, now);
    if (waitA !== waitB) {
      if (waitA === Number.POSITIVE_INFINITY) return 1;
      if (waitB === Number.POSITIVE_INFINITY) return -1;
      return waitA - waitB;
    }
    return a.name.localeCompare(b.name, "en-CA");
  });
}
