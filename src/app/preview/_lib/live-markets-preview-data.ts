import "server-only";
import {
  listMarkets,
  listSchedules,
  listStalls,
  listVendors,
} from "@/lib/data/catalog";
import { FIND_AREAS, weekdayInToronto } from "@/lib/find-paths";
import { listingMarkSrc } from "@/lib/format";
import {
  loadHomeAtlasData,
  type HomeAtlasData,
  type HomeAtlasDayGroup,
  type HomeAtlasMarketSlot,
} from "@/lib/home-atlas-data";
import { LAUNCH_TZ } from "@/lib/launch";
import { stallHall } from "@/lib/season-fold";
import { upcomingByDay } from "@/lib/upcoming";
import { vendorsSellingToday, type VendorTodayRow } from "@/lib/vendor-week";
import type { Market, MarketSchedule } from "@/types/database";

export type LiveMarketVendorChip = {
  name: string;
  slug: string;
  logoUrl: string | null;
  stall: string | null;
};

export type EnrichedLiveMarketSlot = HomeAtlasMarketSlot & {
  indoorOutdoor: "Indoor" | "Outdoor" | null;
  sampleVendors: LiveMarketVendorChip[];
};

export type EnrichedLiveDayGroup = Omit<HomeAtlasDayGroup, "slots"> & {
  slots: EnrichedLiveMarketSlot[];
};

export type ClockScenarioId = "saturday-peak" | "tuesday-afternoon" | "live-now";

export type ClockScenarioSnapshot = {
  id: ClockScenarioId;
  shortLabel: string;
  clockDescription: string;
  todayFormatted: string;
  todayWeekday: number;
  openNowSlots: EnrichedLiveMarketSlot[];
  laterTodaySlots: EnrichedLiveMarketSlot[];
  earlierTodaySlots: EnrichedLiveMarketSlot[];
  upcomingDays: EnrichedLiveDayGroup[];
  allGroups: EnrichedLiveDayGroup[];
  sellingTodayCount: number;
  sellingToday: VendorTodayRow[];
  vendorLogoBySlug: Record<string, string | null>;
};

export type LiveMarketsPreviewData = {
  atlas: HomeAtlasData;
  scenarios: Record<ClockScenarioId, ClockScenarioSnapshot>;
  defaultScenario: ClockScenarioId;
};

function inferNeighbourhood(market: Market): string {
  for (const area of FIND_AREAS) {
    if (area.slugs.includes(market.slug)) return area.label;
  }
  return market.city || "Toronto";
}

function inferIndoorOutdoor(tags: string[] | null | undefined): "Indoor" | "Outdoor" | null {
  const lower = (tags ?? []).map((t) => t.toLowerCase());
  if (lower.includes("indoor")) return "Indoor";
  if (lower.includes("outdoor")) return "Outdoor";
  return null;
}

export async function loadLiveMarketsPreviewData(): Promise<LiveMarketsPreviewData> {
  const [atlas, markets, vendors, stalls, schedules] = await Promise.all([
    loadHomeAtlasData(),
    listMarkets(),
    listVendors(),
    listStalls(),
    listSchedules(),
  ]);

  const scheduleMap = new Map<string, MarketSchedule[]>();
  for (const row of schedules) {
    const list = scheduleMap.get(row.market_id) ?? [];
    list.push(row);
    scheduleMap.set(row.market_id, list);
  }

  const vendorById = new Map(vendors.map((v) => [v.id, v]));
  const vendorLogoBySlug: Record<string, string | null> = {};
  for (const v of vendors) {
    vendorLogoBySlug[v.slug] = listingMarkSrc(v.logo_url);
  }

  const vendorCountByMarket = new Map<string, number>();
  for (const stall of stalls) {
    vendorCountByMarket.set(
      stall.market_id,
      (vendorCountByMarket.get(stall.market_id) ?? 0) + 1,
    );
  }

  function buildSnapshot(
    id: ClockScenarioId,
    shortLabel: string,
    clockDescription: string,
    when: Date,
  ): ClockScenarioSnapshot {
    const todayWeekday = weekdayInToronto(when);
    const todayFormatted = new Intl.DateTimeFormat("en-CA", {
      timeZone: LAUNCH_TZ,
      weekday: "long",
      month: "short",
      day: "numeric",
    }).format(when);

    const rawGroups = upcomingByDay(markets, scheduleMap, when, {
      includeClosedToday: true,
    });
    const sellingTodayRaw = vendorsSellingToday(
      stalls,
      markets,
      vendors,
      scheduleMap,
      when,
    );

    const enrichSlot = (
      slot: (typeof rawGroups)[number]["slots"][number],
      groupWeekday?: number,
    ): EnrichedLiveMarketSlot => {
      const market = slot.market;
      const matchingStalls = stalls.filter((s) => {
        if (s.market_id !== market.id) return false;
        if (!stallHall(markets, scheduleMap, s.market_id)) return false;
        if (groupWeekday != null && s.days.length > 0) {
          return s.days.includes(groupWeekday);
        }
        return true;
      });

      const sampleVendors: LiveMarketVendorChip[] = matchingStalls
        .slice()
        .sort((a, b) => {
          const va = vendorById.get(a.id);
          const vb = vendorById.get(b.id);
          const logoA = Number(Boolean(listingMarkSrc(va?.logo_url)));
          const logoB = Number(Boolean(listingMarkSrc(vb?.logo_url)));
          return (
            logoB - logoA ||
            (vb?.review_count ?? 0) - (va?.review_count ?? 0) ||
            a.name.localeCompare(b.name)
          );
        })
        .slice(0, 4)
        .map((s) => {
          const v = vendorById.get(s.id);
          return {
            name: v?.name ?? s.name,
            slug: v?.slug ?? s.slug,
            logoUrl: listingMarkSrc(v?.logo_url),
            stall: s.stall,
          };
        });

      return {
        id: market.id,
        slug: market.slug,
        name: market.name,
        city: market.city,
        address: market.address,
        province: market.province,
        lat: market.lat,
        lng: market.lng,
        logo_url: listingMarkSrc(market.logo_url),
        rating_avg: market.rating_avg ?? null,
        review_count: market.review_count ?? 0,
        tags: market.tags ?? [],
        hours: slot.hours,
        open: slot.open,
        notes: slot.notes,
        vendorCount: vendorCountByMarket.get(market.id) ?? matchingStalls.length,
        neighbourhood: inferNeighbourhood(market),
        indoorOutdoor: inferIndoorOutdoor(market.tags),
        sampleVendors,
      };
    };

    const allGroups: EnrichedLiveDayGroup[] = rawGroups.map((group) => {
      const dayMatch = group.id.startsWith("day-")
        ? Number(group.id.replace("day-", ""))
        : todayWeekday;
      return {
        id: group.id,
        label: group.label,
        hint: group.hint,
        date: group.date,
        iso: group.iso,
        open: group.open,
        slots: group.slots.map((slot) => enrichSlot(slot, dayMatch)),
      };
    });

    const openNowSlots = allGroups.find((g) => g.id === "open")?.slots ?? [];
    const laterTodaySlots = allGroups.find((g) => g.id === "later")?.slots ?? [];
    const earlierTodaySlots = allGroups.find((g) => g.id === "earlier")?.slots ?? [];
    const upcomingDays = allGroups.filter(
      (g) => g.id !== "open" && g.id !== "later" && g.id !== "earlier" && g.slots.length > 0,
    );

    return {
      id,
      shortLabel,
      clockDescription,
      todayFormatted,
      todayWeekday,
      openNowSlots,
      laterTodaySlots,
      earlierTodaySlots,
      upcomingDays,
      allGroups: allGroups.filter((g) => g.slots.length > 0),
      sellingTodayCount: sellingTodayRaw.length,
      sellingToday: sellingTodayRaw.slice(0, 10),
      vendorLogoBySlug,
    };
  }

  const liveNowDate = new Date();
  // Peak Saturday morning in Toronto (Oct 24, 2026 at 10:30 AM EDT)
  const saturdayPeakDate = new Date("2026-10-24T10:30:00-04:00");
  // Active Tuesday afternoon in Toronto (Oct 20, 2026 at 4:00 PM EDT)
  const tuesdayAfternoonDate = new Date("2026-10-20T16:00:00-04:00");

  const scenarios: Record<ClockScenarioId, ClockScenarioSnapshot> = {
    "saturday-peak": buildSnapshot(
      "saturday-peak",
      "Saturday 10:30 AM (Peak Open)",
      "Simulates Saturday morning at 10:30 AM when Toronto's weekend market halls are open simultaneously.",
      saturdayPeakDate,
    ),
    "tuesday-afternoon": buildSnapshot(
      "tuesday-afternoon",
      "Tuesday 4:00 PM (Weekday Open)",
      "Simulates Tuesday afternoon at 4:00 PM when mid-week neighbourhood markets are open on the floor.",
      tuesdayAfternoonDate,
    ),
    "live-now": buildSnapshot(
      "live-now",
      "Current Clock (After-Hours / Next Up)",
      "Uses the current live server clock to demonstrate how the module transitions after hours to highlight tomorrow's opening halls.",
      liveNowDate,
    ),
  };

  const defaultScenario: ClockScenarioId =
    scenarios["live-now"].openNowSlots.length > 0
      ? "live-now"
      : "tuesday-afternoon";

  return {
    atlas,
    scenarios,
    defaultScenario,
  };
}
