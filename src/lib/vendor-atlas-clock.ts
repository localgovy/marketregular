import { weekdayInToronto } from "@/lib/find-paths";
import {
  hallDayHours,
  isMarketOpen,
  nextOpenLabel,
  sessionOnWeekday,
  type ScheduleRow,
} from "@/lib/schedule";
import { vendorMarketInSeason } from "@/lib/vendor-markets";
import type {
  VendorAtlasClockHall,
  VendorAtlasData,
  VendorAtlasPeer,
} from "@/lib/vendor-atlas-data";

export function clockScheduleRow(row: ScheduleRow): ScheduleRow {
  return {
    weekday: Number(row.weekday),
    opens_at: row.opens_at,
    closes_at: row.closes_at,
    season_start: row.season_start,
    season_end: row.season_end,
  };
}

function peerBadge(
  stalls: Array<{ marketId: string; days: number[] }>,
  halls: Record<string, VendorAtlasClockHall>,
  now: Date,
  todayWeekday: number,
): VendorAtlasPeer["badge"] {
  let openNow = false;
  let sellingToday = false;
  let onWeekend = false;
  for (const stall of stalls) {
    const hall = halls[stall.marketId];
    if (!hall) continue;
    if (stall.days.includes(todayWeekday) && isMarketOpen(hall.schedules, hall.province, now)) {
      openNow = true;
    }
    if (
      stall.days.includes(todayWeekday) &&
      sessionOnWeekday(hall.schedules, todayWeekday, hall.province, now) != null
    ) {
      sellingToday = true;
    }
    if (stall.days.includes(0) || stall.days.includes(6)) onWeekend = true;
  }
  if (openNow) return "Selling now";
  if (sellingToday) return "Later today";
  if (onWeekend) return "Selling this weekend";
  return "On the schedule";
}

/**
 * Hours, open state, and badges for a stall page at `now`.
 * The server calls this at render time and the browser keeps it current,
 * so the cached page can live for a day without showing yesterday's status.
 */
export function applyVendorClock(data: VendorAtlasData, now: Date): VendorAtlasData {
  const { halls, peerHalls, peerStalls } = data.clock;
  const todayWeekday = weekdayInToronto(now);

  const markets = data.markets.map((market) => {
    const hall = halls[market.id];
    const schedules = hall?.schedules ?? [];
    const province = hall?.province ?? market.province;
    const hours = hallDayHours(market.days, schedules, province, now);
    const openNow =
      market.days.includes(todayWeekday) && isMarketOpen(schedules, province, now);
    const inSeason = vendorMarketInSeason(
      { name: market.name, province, days: market.days, schedules },
      now,
    );
    const nextOpen = schedules.length
      ? nextOpenLabel(schedules, province, now)
      : openNow
        ? "Open now"
        : "Schedule posted";
    return { ...market, hours, openNow, inSeason, nextOpen };
  });

  const openNow = markets.some((market) => market.openNow);
  const sellingToday = markets.some(
    (market) =>
      market.days.includes(todayWeekday) &&
      sessionOnWeekday(
        halls[market.id]?.schedules ?? [],
        todayWeekday,
        market.province,
        now,
      ) != null,
  );
  const onWeekend = markets.some((market) =>
    market.hours.some((entry) => entry.day === "Sat" || entry.day === "Sun"),
  );
  const badge: VendorAtlasData["vendor"]["badge"] = openNow
    ? "Selling now"
    : sellingToday
      ? "Later today"
      : onWeekend
        ? "Selling this weekend"
        : "On the schedule";

  const firstActiveMarket = markets.find((market) => market.hours.length > 0) ?? markets[0];
  const nextSessionSummary = firstActiveMarket
    ? firstActiveMarket.hours[0]
      ? `${firstActiveMarket.name} · ${firstActiveMarket.hours[0].day} ${firstActiveMarket.hours[0].hours}`
      : `${firstActiveMarket.name} · ${firstActiveMarket.nextOpen}`
    : null;

  const similarVendors = data.similarVendors.map((peer) => {
    const stalls = peerStalls[peer.id];
    if (!stalls) return peer;
    return {
      ...peer,
      badge: peerBadge(stalls, peerHalls, now, todayWeekday),
      markets: peer.markets.map((market, index) => {
        const stall = stalls[index];
        const hall = stall ? peerHalls[stall.marketId] : undefined;
        if (!stall || !hall) return market;
        return { ...market, hours: hallDayHours(stall.days, hall.schedules, hall.province, now) };
      }),
    };
  });

  return {
    ...data,
    nowMs: now.getTime(),
    todayWeekday,
    vendor: { ...data.vendor, badge, openNow, sellingToday, nextSessionSummary },
    markets,
    similarVendors,
  };
}
