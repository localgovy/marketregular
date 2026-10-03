import type { MarketSchedule } from "@/types/database";

export type FoldedSchedule = MarketSchedule & { origin_market_id: string };

/** The hall that actually runs this session, before a season alias is folded onto its host. */
export function scheduleOrigin(row: MarketSchedule) {
  const origin = (row as { origin_market_id?: string }).origin_market_id;
  return origin && origin.length > 0 ? origin : row.market_id;
}

export function stallScheduleRows(
  scheduleMap: Map<string, MarketSchedule[]>,
  stallMarketId: string,
) {
  const rows: MarketSchedule[] = [];
  for (const list of scheduleMap.values()) {
    for (const row of list) {
      if (scheduleOrigin(row) === stallMarketId) rows.push(row);
    }
  }
  return rows;
}

/** Hours from the stall's own hall. A folded season still shows on the host card. */
export function stallHall<T extends { id: string }>(
  markets: T[],
  scheduleMap: Map<string, MarketSchedule[]>,
  stallMarketId: string,
) {
  const rows = stallScheduleRows(scheduleMap, stallMarketId);
  const direct = markets.find((market) => market.id === stallMarketId);
  if (direct) return { market: direct, rows };
  const hostId = rows[0]?.market_id;
  const host = hostId ? markets.find((market) => market.id === hostId) : undefined;
  if (!host) return null;
  return { market: host, rows };
}
