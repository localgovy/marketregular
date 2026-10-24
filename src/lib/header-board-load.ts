import { unstable_cache } from "next/cache";
import { cache } from "react";
import { listMarketHours } from "@/lib/data/catalog";
import { DIRECTORY_TAG } from "@/lib/directory-cache";
import {
  EMPTY_HEADER_BOARD,
  headerBoardFromToday,
  type HeaderBoard,
} from "@/lib/header-board";
import { marketsOnWeekday, scheduleMapFrom } from "@/lib/landing";
import { LAUNCH_TZ } from "@/lib/launch";
import { zonedParts } from "@/lib/schedule";
import { upcomingByDay } from "@/lib/upcoming";

const HEADER_BOARD_TIMEOUT_MS = 8_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error("header board timed out"));
    }, ms);
    promise.then(
      (value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

async function computeHeaderBoard(): Promise<HeaderBoard> {
  const now = new Date();
  const { markets, schedules } = await listMarketHours();
  const scheduleMap = scheduleMapFrom(schedules);
  const { weekday, minutes } = zonedParts(now, LAUNCH_TZ);
  const today = marketsOnWeekday({ weekday, markets, scheduleMap, now });
  const current = headerBoardFromToday(
    today.map((row) => ({
      slug: row.market.slug,
      name: row.market.name,
      hours: row.hours,
      openNow: row.openNow,
      opensMinutes: row.opensMinutes,
    })),
    minutes,
  );
  const asOf = Date.now();
  if (current) return { ...current, asOf };

  const next = upcomingByDay(markets, scheduleMap, now)[0];
  return {
    openCount: 0,
    label: next?.label ?? "Today",
    asOf,
    markets: (next?.slots ?? []).slice(0, 3).map((slot) => ({
      slug: slot.market.slug,
      name: slot.market.name,
      hours: slot.hours,
    })),
  };
}

const loadCachedHeaderBoard = unstable_cache(computeHeaderBoard, ["header-board-v2"], {
  revalidate: 60,
  tags: [DIRECTORY_TAG],
});

/** Today's open count and the markets on the header strip. Cached for a minute. */
export const getHeaderBoard = cache(async (): Promise<HeaderBoard> => {
  try {
    return await withTimeout(loadCachedHeaderBoard(), HEADER_BOARD_TIMEOUT_MS);
  } catch (error) {
    console.error("header board", error);
    return EMPTY_HEADER_BOARD;
  }
});
