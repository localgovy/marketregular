import { hallHours } from "@/lib/day-plan";
import { weekdayInToronto } from "@/lib/find-paths";
import type {
  HomeAtlasData,
  HomeAtlasMarketRow,
  HomeAtlasMarketSlot,
  HomeAtlasSource,
  HomeClockMarket,
} from "@/lib/home-atlas-data";
import { LAUNCH_TZ } from "@/lib/launch";
import { provinceTz } from "@/lib/constants";
import {
  currentWeekSessions,
  formatSchedule,
  hallDayHours,
  inSeason,
  isMarketOpen,
  nextOpenLabel,
  nextOpenSlot,
  parseHm,
  sortScheduleRows,
  zonedParts,
} from "@/lib/schedule";
import { upcomingByDay } from "@/lib/upcoming";
import type { Market, MarketSchedule } from "@/types/database";

function asMarket(market: HomeClockMarket): Market {
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

function rowFor(market: HomeClockMarket, schedules: MarketSchedule[], openIds: Set<string>, now: Date): HomeAtlasMarketRow {
  const open = openIds.has(market.id);
  const nextSlot = nextOpenSlot(schedules, market.province, now);
  const sessions = currentWeekSessions(schedules, market.province, now);
  const hours = hallHours(market, schedules, undefined, now);
  const nextOpen = schedules.length
    ? nextOpenLabel(schedules, market.province, now)
    : open
      ? "Open now"
      : "Hours";
  const scheduleSummary = sessions.length
    ? `${sessions[0].day} · ${sessions[0].hours}`
    : hours || "Schedule posted on page";
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
    open,
    hours: hours || sessions[0]?.hours || "",
    nextOpen,
    scheduleSummary,
    sessions,
    vendorCount: market.vendorCount,
    neighbourhood: market.neighbourhood,
    waitMinutes: open ? 0 : nextSlot && Number.isFinite(nextSlot.waitMinutes) ? nextSlot.waitMinutes : null,
    dayNames: [...new Set(sortScheduleRows(schedules).map((row) => formatSchedule(row).day))],
    indoor_outdoor: market.indoorOutdoor,
  };
}

function sessionNotOver(schedules: MarketSchedule[], province: string, now: Date) {
  const tz = provinceTz(province);
  const { weekday, minutes } = zonedParts(now, tz);
  return schedules.some(
    (row) =>
      Number(row.weekday) === weekday &&
      inSeason(now, row.season_start, row.season_end, tz) &&
      minutes <= parseHm(row.closes_at),
  );
}

/**
 * Rebuild the parts of the homepage that depend on the clock.
 * The server snapshot uses `renderedAt`, then the browser keeps it current.
 */
export function applyHomeClock(source: HomeAtlasSource, now: Date): HomeAtlasData {
  const scheduleMap = new Map<string, MarketSchedule[]>();
  const markets = source.clockMarkets.map((market) => {
    scheduleMap.set(market.id, market.schedules);
    return asMarket(market);
  });
  const week = upcomingByDay(markets, scheduleMap, now, { includeClosedToday: true });
  const clockById = new Map(source.clockMarkets.map((market) => [market.id, market]));

  const fullWeekAll = week.map((group) => ({
    id: group.id,
    label: group.label,
    hint: group.hint,
    date: group.date,
    iso: group.iso,
    open: group.open,
    slots: group.slots.map((slot): HomeAtlasMarketSlot => {
      const clock = clockById.get(slot.market.id);
      return {
        id: slot.market.id,
        slug: slot.market.slug,
        name: slot.market.name,
        city: slot.market.city,
        address: slot.market.address,
        province: slot.market.province,
        lat: slot.market.lat,
        lng: slot.market.lng,
        logo_url: clock?.logo_url ?? slot.market.logo_url,
        rating_avg: slot.market.rating_avg ?? null,
        review_count: slot.market.review_count ?? 0,
        tags: slot.market.tags ?? [],
        hours: slot.hours,
        open: slot.open,
        notes: slot.notes,
        vendorCount: clock?.vendorCount ?? 0,
        neighbourhood: clock?.neighbourhood ?? slot.market.city,
        indoorOutdoor: clock?.indoorOutdoor ?? null,
        sampleVendors: clock?.sampleVendors ?? [],
      };
    }),
  }));

  const openNowSlots = fullWeekAll.find((group) => group.open)?.slots ?? [];
  const laterTodaySlots = fullWeekAll.find((group) => group.id === "later")?.slots ?? [];
  const earlierTodaySlots = fullWeekAll.find((group) => group.id === "earlier")?.slots ?? [];
  const nextDayGroup =
    fullWeekAll.find(
      (group) => !group.open && group.id !== "later" && group.id !== "earlier" && group.slots.length > 0,
    ) ?? null;
  const openIds = new Set(openNowSlots.map((slot) => slot.id));
  const freshRows = new Map(
    source.clockMarkets.map((market) => [
      market.slug,
      rowFor(market, scheduleMap.get(market.id) ?? [], openIds, now),
    ]),
  );

  const today = weekdayInToronto(now);
  const { minutes } = zonedParts(now, LAUNCH_TZ);
  const sellingPool = (source.sellingByWeekday[today] ?? [])
    .filter((row) => minutes <= row.closesMinutes)
    .map((row) => ({
      ...row,
      open: minutes >= row.opensMinutes && minutes <= row.closesMinutes,
    }));
  const sellingToday = sellingPool.slice(0, 5);
  let sellingTodayCount = 0;
  for (const market of source.clockMarkets) {
    if (!sessionNotOver(market.schedules, market.province, now)) continue;
    sellingTodayCount += market.stallsByWeekday[today] ?? 0;
  }
  const sellingSlugs = new Set(sellingToday.map((row) => row.vendorSlug));

  const clockBySlug = new Map(source.clockMarkets.map((market) => [market.slug, market]));
  const vendorSpotlights = source.vendorSpotlights
    .map((vendor) => {
      const markets = vendor.markets.map((market) => {
        const clock = clockBySlug.get(market.slug);
        if (!clock) return market;
        const openNow = market.days.includes(today) && isMarketOpen(clock.schedules, clock.province, now);
        return {
          ...market,
          hours: hallDayHours(market.days, clock.schedules, clock.province, now),
          openNow,
        };
      });
      const openNow = Boolean(markets.some((market) => market.openNow));
      const selling =
        sellingSlugs.has(vendor.slug) ||
        markets.some((market) => {
          const clock = clockBySlug.get(market.slug);
          return Boolean(
            clock &&
              market.days.includes(today) &&
              sessionNotOver(clock.schedules, clock.province, now),
          );
        });
      const badge = openNow
        ? "Selling now"
        : selling
          ? "Later today"
          : vendor.onWeekend
            ? "Selling this weekend"
            : "On the schedule";
      return { ...vendor, markets, openNow, sellingToday: selling, badge } as const;
    })
    .sort(
      (a, b) =>
        Number(b.openNow) - Number(a.openNow) ||
        Number(b.sellingToday) - Number(a.sellingToday),
    );

  const neighbourhoodCircuits = source.neighbourhoodCircuits.map((circuit) => {
    const topMarkets = circuit.topMarkets.map((row) => {
      const fresh = freshRows.get(row.slug);
      if (!fresh) return row;
      return {
        ...row,
        open: fresh.open,
        hours: fresh.hours,
        nextOpen: fresh.nextOpen,
        scheduleSummary: fresh.scheduleSummary,
        sessions: fresh.sessions,
        waitMinutes: fresh.waitMinutes,
        dayNames: fresh.dayNames,
      };
    });
    return {
      ...circuit,
      openCount: topMarkets.filter((row) => row.open).length,
      topMarkets,
    };
  });

  const fullWeek = fullWeekAll
    .filter((group) => group.id !== "earlier" && group.slots.length > 0)
    .slice(0, 4)
    .map((group) => ({
      ...group,
      slots: group.slots.slice(0, 4),
    }));

  return {
    ...source,
    nowIso: now.toISOString(),
    todayWeekday: today,
    todayFormatted: new Intl.DateTimeFormat("en-CA", {
      timeZone: LAUNCH_TZ,
      weekday: "long",
      month: "short",
      day: "numeric",
    }).format(now),
    fullWeek,
    openNowSlots,
    laterTodaySlots,
    earlierTodaySlots,
    nextDayGroup,
    sellingTodayCount,
    sellingToday,
    vendorSpotlights,
    neighbourhoodCircuits,
  };
}
