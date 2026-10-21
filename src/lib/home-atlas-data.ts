import "server-only";
import { unstable_cache } from "next/cache";
import {
  getDirectoryCensus,
  getFloorTape,
  listMarkets,
  listSchedules,
  listStalls,
  listVendors,
  type DirectoryCensus,
} from "@/lib/data/catalog";
import { EMPTY_PRODUCT_PHOTOS, listProductPhotos, productPhoto } from "@/lib/data/product-photos";
import { listFindVendors } from "@/lib/data/product-search";
import { FIND_PAGES } from "@/data/find-pages";
import { featuredBlogPost, plainBlogText } from "@/lib/blog";
import {
  FIND_AREAS,
  FIND_SETUP,
  tagsPresent,
  weekdayInToronto,
} from "@/lib/find-paths";
import { hallHours } from "@/lib/day-plan";
import { listingMarkSrc } from "@/lib/format";
import { LAUNCH_TZ } from "@/lib/launch";
import { catalogueAisles, liveFindPages } from "@/lib/product-catalogue";
import {
  currentWeekSessions,
  formatSchedule,
  hallDayHours,
  nextOpenLabel,
  nextOpenSlot,
  sortScheduleRows,
} from "@/lib/schedule";
import { stallHall } from "@/lib/season-fold";
import { upcomingByDay } from "@/lib/upcoming";
import { vendorProductTags } from "@/lib/vendor-tags";
import {
  topVendorsThisWeek,
  vendorsSellingToday,
  type VendorTodayRow,
  type VendorWeekPick,
} from "@/lib/vendor-week";
import type { FloorItem, Market, MarketSchedule } from "@/types/database";

export type HomeAtlasMarketSlot = {
  id: string;
  slug: string;
  name: string;
  city: string;
  address: string;
  province: string;
  lat: number | null;
  lng: number | null;
  logo_url: string | null;
  rating_avg: number | null;
  review_count: number;
  tags: string[];
  hours: string;
  open: boolean;
  notes: string | null;
  vendorCount: number;
  neighbourhood: string;
  indoorOutdoor: string | null;
  sampleVendors: Array<{
    name: string;
    slug: string;
    logoUrl: string | null;
  }>;
};

export type HomeAtlasDayGroup = {
  id: string;
  label: string;
  hint: string;
  date: string;
  iso: string;
  open: boolean;
  slots: HomeAtlasMarketSlot[];
};

export type HomeAtlasMarketRow = {
  id: string;
  slug: string;
  name: string;
  city: string;
  address: string;
  province: string;
  lat: number | null;
  lng: number | null;
  logo_url: string | null;
  rating_avg: number | null;
  review_count: number;
  tags: string[];
  open: boolean;
  hours: string;
  nextOpen: string;
  scheduleSummary: string;
  sessions: Array<{ day: string; hours: string }>;
  vendorCount: number;
  neighbourhood: string;
  waitMinutes: number | null;
  dayNames: string[];
  indoor_outdoor: string | null;
};

export type HomeAtlasNeighbourhoodCircuit = {
  label: string;
  q: string;
  marketCount: number;
  vendorCount: number;
  openCount: number;
  topMarkets: HomeAtlasMarketRow[];
  topVendors: Array<{
    name: string;
    slug: string;
    logoUrl: string | null;
    specialty: string;
    marketName: string;
  }>;
};

export type HomeAtlasAisleCard = {
  id: string;
  label: string;
  line: string;
  count: number;
  photoUrl: string | null;
  photoAlt: string | null;
  sampleTerms: Array<{ term: string; slug: string; photoUrl: string | null }>;
  topVendors: Array<{
    name: string;
    slug: string;
    logoUrl: string | null;
    marketName: string;
    itemLabel: string;
  }>;
};

export type HomeAtlasVendorItem = {
  name: string;
  href: string;
  priceCents: number | null;
  aisleId: string;
  imageUrl: string | null;
};

export type HomeAtlasVendorMarket = {
  name: string;
  slug: string;
  logoUrl: string | null;
  neighbourhood: string;
  stall: string | null;
  days: number[];
  hours: Array<{ day: string; hours: string }>;
  ratingAvg: number | null;
  reviewCount: number;
  openNow: boolean;
};

export type HomeAtlasVendorSpotlight = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  about: string | null;
  ratingAvg: number | null;
  reviewCount: number;
  tags: string[];
  aisleIds: string[];
  primaryAisleLabel: string;
  /** Aisle or find-page picture for the card banner. Item rows carry their own pictures. */
  photoUrl: string | null;
  photoAlt: string | null;
  badge: "Selling now" | "Later today" | "Selling this weekend" | "On the schedule";
  openNow: boolean;
  sellingToday: boolean;
  /** True only when `items` come from a published stall menu, not a category guess. */
  publishedMenu: boolean;
  /** In-season Saturday or Sunday hours, not a raw day number from an off-season row. */
  onWeekend: boolean;
  items: HomeAtlasVendorItem[];
  markets: HomeAtlasVendorMarket[];
};

export type HomeAtlasBlogNote = {
  slug: string;
  title: string;
  kicker?: string;
  description: string;
  date: string;
};

export type HomeAtlasData = {
  nowIso: string;
  todayWeekday: number;
  todayFormatted: string;
  census: DirectoryCensus;
  fullWeek: HomeAtlasDayGroup[];
  openNowSlots: HomeAtlasMarketSlot[];
  laterTodaySlots: HomeAtlasMarketSlot[];
  earlierTodaySlots: HomeAtlasMarketSlot[];
  nextDayGroup: HomeAtlasDayGroup | null;
  sellingTodayCount: number;
  sellingToday: VendorTodayRow[];
  weekVendors: VendorWeekPick[];
  vendorSpotlights: HomeAtlasVendorSpotlight[];
  tape: FloorItem[];
  weeklyNote: HomeAtlasBlogNote | null;
  neighbourhoodCircuits: HomeAtlasNeighbourhoodCircuit[];
  aisles: HomeAtlasAisleCard[];
  setupOptions: string[];
};

const SAMPLE_FIND_SLUGS = [
  "sourdough-toronto",
  "bread-toronto",
  "croissants-toronto",
  "cookies-toronto",
  "butter-tarts-toronto",
  "pies-toronto",
  "cheese-toronto",
  "eggs-toronto",
  "honey-toronto",
  "maple-syrup-toronto",
  "apples-toronto",
  "carrots-toronto",
  "tomatoes-toronto",
  "mushrooms-toronto",
  "pizza-toronto",
  "sandwiches-toronto",
  "soups-toronto",
  "meat-pies-toronto",
  "sausages-toronto",
  "chicken-toronto",
  "coffee-toronto",
  "tea-toronto",
  "jam-toronto",
  "hot-sauce-toronto",
] as const;

const TAG_TO_AISLE_FALLBACK: Record<
  string,
  { aisleId: string; label: string; href: string; slug: string }
> = {
  bakery: {
    aisleId: "bread-and-bakery",
    label: "Fresh-baked loaves & pastries",
    href: "/find/bread-toronto",
    slug: "bread-toronto",
  },
  bread: {
    aisleId: "bread-and-bakery",
    label: "Artisan sourdough & bread",
    href: "/find/sourdough-toronto",
    slug: "sourdough-toronto",
  },
  produce: {
    aisleId: "vegetables",
    label: "Seasonal field vegetables & greens",
    href: "/products?aisle=vegetables",
    slug: "carrots-toronto",
  },
  organic: {
    aisleId: "vegetables",
    label: "Certified organic farm produce",
    href: "/find/organic-toronto",
    slug: "tomatoes-toronto",
  },
  cheese: {
    aisleId: "cheese-and-dairy",
    label: "Small-batch farmstead cheese",
    href: "/find/cheese-toronto",
    slug: "cheese-toronto",
  },
  dairy: {
    aisleId: "cheese-and-dairy",
    label: "Creamery butter & dairy",
    href: "/find/cheese-toronto",
    slug: "cheese-toronto",
  },
  meat: {
    aisleId: "meat-and-turkey",
    label: "Pasture-raised cuts & sausages",
    href: "/find/sausages-toronto",
    slug: "sausages-toronto",
  },
  poultry: {
    aisleId: "meat-and-turkey",
    label: "Farm-raised poultry & eggs",
    href: "/find/chicken-toronto",
    slug: "chicken-toronto",
  },
  eggs: {
    aisleId: "eggs",
    label: "Free-run farm eggs",
    href: "/find/eggs-toronto",
    slug: "eggs-toronto",
  },
  honey: {
    aisleId: "honey",
    label: "Raw Ontario wildflower honey",
    href: "/find/honey-toronto",
    slug: "honey-toronto",
  },
  maple: {
    aisleId: "maple",
    label: "Wood-fired Ontario maple syrup",
    href: "/find/maple-syrup-toronto",
    slug: "maple-syrup-toronto",
  },
  "prepared-food": {
    aisleId: "prepared-foods",
    label: "Hot market table dishes & hand pies",
    href: "/products?aisle=prepared-foods",
    slug: "pizza-toronto",
  },
  coffee: {
    aisleId: "coffee-and-tea",
    label: "Small-batch roasted coffee & espresso",
    href: "/find/coffee-toronto",
    slug: "coffee-toronto",
  },
  tea: {
    aisleId: "coffee-and-tea",
    label: "Botanical & loose-leaf teas",
    href: "/find/tea-toronto",
    slug: "tea-toronto",
  },
  seafood: {
    aisleId: "seafood",
    label: "Smoked trout & Great Lakes fish",
    href: "/find/fish-toronto",
    slug: "fish-toronto",
  },
  fruit: {
    aisleId: "apples-and-fruit",
    label: "Orchard apples, berries & stone fruit",
    href: "/find/apples-toronto",
    slug: "apples-toronto",
  },
  preserves: {
    aisleId: "preserves-and-sauces",
    label: "Small-batch jams, pickles & sauces",
    href: "/find/jam-toronto",
    slug: "jam-toronto",
  },
  sweets: {
    aisleId: "pies-and-sweets",
    label: "Fruit pies, cookies & butter tarts",
    href: "/find/butter-tarts-toronto",
    slug: "butter-tarts-toronto",
  },
};

const AISLE_LABEL_BY_ID: Record<string, string> = {
  "bread-and-bakery": "Bread and bakery",
  "pies-and-sweets": "Pies and sweets",
  "prepared-foods": "Prepared food",
  vegetables: "Vegetables",
  "apples-and-fruit": "Fruit",
  "meat-and-turkey": "Meat",
  seafood: "Seafood",
  eggs: "Eggs",
  "cheese-and-dairy": "Cheese and dairy",
  honey: "Honey",
  maple: "Maple",
  "preserves-and-sauces": "Preserves and sauces",
  "coffee-and-tea": "Coffee and tea",
};

function inferNeighbourhood(market: Market): string {
  for (const area of FIND_AREAS) {
    if (area.slugs.includes(market.slug)) return area.label;
  }
  return market.city || "Toronto";
}

type CachedVendorMenuEntry = {
  items: HomeAtlasVendorItem[];
  aisles: string[];
  primaryProductSlug: string | null;
};

/**
 * Cached server-side lookup of sample vendor menu items across curated find pages.
 * Revalidates every 120s so homepage requests never re-run 24 find queries per hit.
 */
const loadCachedVendorMenuSample = unstable_cache(
  async (): Promise<Record<string, CachedVendorMenuEntry>> => {
    const now = new Date();
    const sampleFindPages = SAMPLE_FIND_SLUGS.flatMap((slug) => {
      const page = FIND_PAGES.find((p) => p.slug === slug);
      return page ? [page] : [];
    });

    const results = await Promise.all(
      sampleFindPages.map(async (page) => ({
        page,
        vendors: await listFindVendors(page, now).catch(() => []),
      })),
    );

    const out: Record<string, CachedVendorMenuEntry> = {};
    for (const { page, vendors: foundVendors } of results) {
      for (const fv of foundVendors) {
        const entry = out[fv.slug] ?? {
          items: [],
          aisles: [],
          primaryProductSlug: page.slug,
        };
        if (!entry.aisles.includes(page.category)) {
          entry.aisles.push(page.category);
        }
        if (!entry.primaryProductSlug) {
          entry.primaryProductSlug = page.slug;
        }
        for (const item of fv.items.slice(0, 2)) {
          if (
            entry.items.length < 3 &&
            !entry.items.some((existing) => existing.name === item.name)
          ) {
            entry.items.push({
              name: item.name,
              href: `/find/${page.slug}`,
              priceCents: item.priceCents,
              aisleId: page.category,
              imageUrl: item.imageUrl,
            });
          }
        }
        if (entry.items.length === 0) {
          entry.items.push({
            name: page.term,
            href: `/find/${page.slug}`,
            priceCents: null,
            aisleId: page.category,
            imageUrl: null,
          });
        }
        out[fv.slug] = entry;
      }
    }
    return out;
  },
  ["home-atlas-vendor-menu-sample-v2"],
  { revalidate: 120 },
);

export async function loadHomeAtlasData(): Promise<HomeAtlasData> {
  const [tapeRaw, markets, vendors, stalls, schedules, census, photos, menuSample] =
    await Promise.all([
      getFloorTape(8),
      listMarkets(),
      listVendors(),
      listStalls(),
      listSchedules(),
      getDirectoryCensus(),
      listProductPhotos().catch(() => EMPTY_PRODUCT_PHOTOS),
      loadCachedVendorMenuSample().catch(() => ({} as Record<string, CachedVendorMenuEntry>)),
    ]);

  const weeklyPost = featuredBlogPost();

  const scheduleMap = new Map<string, MarketSchedule[]>();
  for (const row of schedules) {
    const list = scheduleMap.get(row.market_id) ?? [];
    list.push(row);
    scheduleMap.set(row.market_id, list);
  }

  const vendorCountByMarket = new Map<string, number>();
  for (const stall of stalls) {
    vendorCountByMarket.set(stall.market_id, (vendorCountByMarket.get(stall.market_id) ?? 0) + 1);
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const todayWeekday = weekdayInToronto(now);
  const todayFormatted = new Intl.DateTimeFormat("en-CA", {
    timeZone: LAUNCH_TZ,
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(now);

  const rawWeek = upcomingByDay(markets, scheduleMap, now, { includeClosedToday: true });
  const sellingTodayRaw = vendorsSellingToday(stalls, markets, vendors, scheduleMap, now);
  const weekVendors = topVendorsThisWeek(stalls, markets, vendors, scheduleMap, tapeRaw, now, 5);

  const marketIds = new Set(markets.map((m) => m.id));
  const vendorIds = new Set(
    stalls.filter((stall) => marketIds.has(stall.market_id)).map((stall) => stall.id),
  );
  const torontoVendors = vendors.filter((v) => vendorIds.has(v.id));

  const vendorById = new Map(vendors.map((v) => [v.id, v]));
  const sampleVendorsByMarketId = new Map<
    string,
    Array<{ name: string; slug: string; logoUrl: string | null }>
  >();
  for (const stall of stalls) {
    const v = vendorById.get(stall.id);
    if (!v) continue;
    const list = sampleVendorsByMarketId.get(stall.market_id) ?? [];
    if (list.length < 4 && !list.some((item) => item.slug === v.slug)) {
      list.push({
        name: v.name,
        slug: v.slug,
        logoUrl: listingMarkSrc(v.logo_url),
      });
      sampleVendorsByMarketId.set(stall.market_id, list);
    }
  }

  const fullWeekAll: HomeAtlasDayGroup[] = rawWeek.map((group) => ({
    id: group.id,
    label: group.label,
    hint: group.hint,
    date: group.date,
    iso: group.iso,
    open: group.open,
    slots: group.slots.map((slot) => {
      const tagsLower = (slot.market.tags ?? []).map((t) => t.toLowerCase());
      const indoorOutdoor = tagsLower.includes("indoor")
        ? "Indoor"
        : tagsLower.includes("outdoor")
          ? "Outdoor"
          : null;
      return {
        id: slot.market.id,
        slug: slot.market.slug,
        name: slot.market.name,
        city: slot.market.city,
        address: slot.market.address,
        province: slot.market.province,
        lat: slot.market.lat,
        lng: slot.market.lng,
        logo_url: listingMarkSrc(slot.market.logo_url),
        rating_avg: slot.market.rating_avg ?? null,
        review_count: slot.market.review_count ?? 0,
        tags: slot.market.tags ?? [],
        hours: slot.hours,
        open: slot.open,
        notes: slot.notes,
        vendorCount: vendorCountByMarket.get(slot.market.id) ?? 0,
        neighbourhood: inferNeighbourhood(slot.market),
        indoorOutdoor,
        sampleVendors: sampleVendorsByMarketId.get(slot.market.id) ?? [],
      };
    }),
  }));

  const openNowSlots = fullWeekAll.find((g) => g.open)?.slots ?? [];
  const laterTodaySlots = fullWeekAll.find((g) => g.id === "later")?.slots ?? [];
  const earlierTodaySlots = fullWeekAll.find((g) => g.id === "earlier")?.slots ?? [];
  const nextDayGroup =
    fullWeekAll.find(
      (g) => !g.open && g.id !== "later" && g.id !== "earlier" && g.slots.length > 0,
    ) ?? null;
  const openIds = new Set(openNowSlots.map((s) => s.id));

  const allMarketRows: HomeAtlasMarketRow[] = markets.map((market) => {
    const marketSchedules = scheduleMap.get(market.id) ?? [];
    const open = openIds.has(market.id);
    const nextSlot = nextOpenSlot(marketSchedules, market.province, now);
    const nextOpen = marketSchedules.length
      ? nextOpenLabel(marketSchedules, market.province, now)
      : open
        ? "Open now"
        : "Hours";
    const hours = hallHours(market, marketSchedules, undefined, now);
    const sortedRows = sortScheduleRows(marketSchedules);
    const sessions = currentWeekSessions(marketSchedules, market.province, now);
    const scheduleSummary = sessions.length
      ? `${sessions[0].day} · ${sessions[0].hours}`
      : hours || "Schedule posted on page";
    const dayNames = Array.from(new Set(sortedRows.map((row) => formatSchedule(row).day)));
    const tagsLower = (market.tags ?? []).map((t) => t.toLowerCase());
    const indoor_outdoor = tagsLower.includes("indoor")
      ? "Indoor"
      : tagsLower.includes("outdoor")
        ? "Outdoor"
        : null;

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
      open,
      hours: hours || sessions[0]?.hours || "",
      nextOpen,
      scheduleSummary,
      sessions,
      vendorCount: vendorCountByMarket.get(market.id) ?? 0,
      neighbourhood: inferNeighbourhood(market),
      waitMinutes: open ? 0 : (nextSlot && Number.isFinite(nextSlot.waitMinutes) ? nextSlot.waitMinutes : null),
      dayNames,
      indoor_outdoor,
    };
  });

  const stallsByVendorId = new Map<string, typeof stalls>();
  for (const stall of stalls) {
    if (!stallHall(markets, scheduleMap, stall.market_id)) continue;
    const list = stallsByVendorId.get(stall.id) ?? [];
    list.push(stall);
    stallsByVendorId.set(stall.id, list);
  }

  const sellingTodayMap = new Map<string, VendorTodayRow>();
  for (const row of sellingTodayRaw) {
    if (!sellingTodayMap.has(row.vendorSlug)) {
      sellingTodayMap.set(row.vendorSlug, row);
    }
  }
  const weekVendorSlugs = new Set(weekVendors.map((w) => w.vendorSlug));

  const vendorSpotlightsAll: HomeAtlasVendorSpotlight[] = [];
  for (const vendor of torontoVendors) {
    const vendorStalls = stallsByVendorId.get(vendor.id) ?? [];
    if (!vendorStalls.length) continue;

    const tags = vendorProductTags(vendor.name, vendor.tags);
    const sample = menuSample[vendor.slug];
    const items: HomeAtlasVendorItem[] = sample ? sample.items.slice(0, 3) : [];
    const publishedMenu = items.length > 0;
    // Filter membership follows the rows on the card. A later find page or a
    // stored tag must not file a cookie stall under Eggs.
    const aisleSet = new Set<string>(publishedMenu ? items.map((item) => item.aisleId) : []);
    let primaryProductSlug = publishedMenu ? (sample?.primaryProductSlug ?? null) : null;

    if (!publishedMenu) {
      for (const tag of tags) {
        const mapped = TAG_TO_AISLE_FALLBACK[tag];
        if (!mapped) continue;
        aisleSet.add(mapped.aisleId);
        if (!primaryProductSlug) primaryProductSlug = mapped.slug;
      }
    }

    if (aisleSet.size === 0) aisleSet.add("vegetables");

    const spotMarkets: HomeAtlasVendorMarket[] = [];
    const seenMarketSlug = new Set<string>();
    for (const stall of vendorStalls) {
      const hall = stallHall(markets, scheduleMap, stall.market_id);
      if (!hall || seenMarketSlug.has(hall.market.slug)) continue;
      seenMarketSlug.add(hall.market.slug);
      const mOpen = openIds.has(hall.market.id) && stall.days.includes(todayWeekday);
      spotMarkets.push({
        name: hall.market.name,
        slug: hall.market.slug,
        logoUrl: listingMarkSrc(hall.market.logo_url),
        neighbourhood: inferNeighbourhood(hall.market),
        stall: stall.stall,
        days: stall.days,
        hours: hallDayHours(stall.days, hall.rows, hall.market.province, now),
        ratingAvg: hall.market.rating_avg ?? null,
        reviewCount: hall.market.review_count ?? 0,
        openNow: mOpen,
      });
    }

    spotMarkets.sort((a, b) => Number(b.openNow) - Number(a.openNow) || a.name.localeCompare(b.name));

    const todayRow = sellingTodayMap.get(vendor.slug);
    const openNow = Boolean(todayRow?.open || spotMarkets.some((m) => m.openNow));
    const sellingToday = Boolean(todayRow);
    const onWeekend = spotMarkets.some((market) =>
      market.hours.some((row) => row.day === "Sat" || row.day === "Sun"),
    );
    const badge: HomeAtlasVendorSpotlight["badge"] = openNow
      ? "Selling now"
      : sellingToday
        ? "Later today"
        : onWeekend
          ? "Selling this weekend"
          : "On the schedule";

    const aisleIds = [...aisleSet];
    const primaryAisleId = aisleIds[0] ?? "vegetables";
    const primaryAisleLabel = AISLE_LABEL_BY_ID[primaryAisleId] ?? "Market stall";

    // Resolve the single general product/category photo for this vendor card
    const generalPhoto = primaryProductSlug
      ? productPhoto(photos, primaryProductSlug, primaryAisleId)
      : (photos.aisle[primaryAisleId] ?? null);

    vendorSpotlightsAll.push({
      id: vendor.id,
      name: vendor.name,
      slug: vendor.slug,
      logoUrl: listingMarkSrc(vendor.logo_url),
      about: vendor.about ?? null,
      ratingAvg: vendor.rating_avg ?? null,
      reviewCount: vendor.review_count ?? 0,
      tags,
      aisleIds,
      primaryAisleLabel,
      photoUrl: generalPhoto?.url ?? null,
      photoAlt: generalPhoto?.alt ?? primaryAisleLabel,
      badge,
      openNow,
      sellingToday,
      publishedMenu,
      onWeekend,
      items,
      markets: spotMarkets,
    });
  }

  vendorSpotlightsAll.sort((a, b) => {
    const aHasRealMenu = Number(Boolean(menuSample[a.slug]));
    const bHasRealMenu = Number(Boolean(menuSample[b.slug]));
    const aWeek = Number(weekVendorSlugs.has(a.slug));
    const bWeek = Number(weekVendorSlugs.has(b.slug));
    return (
      Number(b.openNow) - Number(a.openNow) ||
      Number(b.sellingToday) - Number(a.sellingToday) ||
      bHasRealMenu - aHasRealMenu ||
      bWeek - aWeek ||
      (b.reviewCount ?? 0) - (a.reviewCount ?? 0) ||
      a.name.localeCompare(b.name)
    );
  });

  const vendorSpotlights = vendorSpotlightsAll.slice(0, 48);

  const rowBySlug = new Map(allMarketRows.map((m) => [m.slug, m]));
  const neighbourhoodCircuits: HomeAtlasNeighbourhoodCircuit[] = [];

  for (const area of FIND_AREAS) {
    const matching = area.slugs.flatMap((slug) => {
      const hit = rowBySlug.get(slug);
      return hit ? [hit] : [];
    });
    if (!matching.length) continue;
    const totalVendors = matching.reduce((sum, m) => sum + m.vendorCount, 0);
    const openCount = matching.filter((m) => m.open).length;
    const areaSlugSet = new Set(matching.map((m) => m.slug));
    const areaVendors = vendorSpotlightsAll
      .filter((v) => v.markets.some((m) => areaSlugSet.has(m.slug)))
      .slice(0, 4)
      .map((v) => {
        const matchedMarket = v.markets.find((m) => areaSlugSet.has(m.slug)) ?? v.markets[0];
        return {
          name: v.name,
          slug: v.slug,
          logoUrl: v.logoUrl,
          specialty: v.items[0]?.name ?? v.primaryAisleLabel,
          marketName: matchedMarket?.name ?? area.label,
        };
      });
    neighbourhoodCircuits.push({
      label: area.label,
      q: area.q,
      marketCount: matching.length,
      vendorCount: totalVendors,
      openCount,
      topMarkets: matching,
      topVendors: areaVendors,
    });
  }

  const findPages = liveFindPages();
  const rawAisles = catalogueAisles(findPages);
  const aisles: HomeAtlasAisleCard[] = rawAisles.slice(0, 12).map((aisle) => {
    const firstPagePhoto = aisle.pages
      .map((p) => photos.product[p.slug])
      .find((entry) => Boolean(entry?.url));
    const photo = photos.aisle[aisle.id] ?? firstPagePhoto ?? null;
    const aisleVendors = vendorSpotlightsAll
      .filter((v) => v.aisleIds.includes(aisle.id))
      .slice(0, 4)
      .map((v) => {
        const matchedItem = v.items.find((i) => i.aisleId === aisle.id) ?? v.items[0];
        return {
          name: v.name,
          slug: v.slug,
          logoUrl: v.logoUrl,
          marketName: v.markets[0]?.name ?? "Toronto market hall",
          itemLabel: matchedItem?.name ?? aisle.label,
        };
      });
    return {
      id: aisle.id,
      label: aisle.label,
      line: aisle.line || `${aisle.pages.length} items across Toronto stalls`,
      count: aisle.pages.length,
      photoUrl: photo?.url ?? null,
      photoAlt: photo?.alt ?? null,
      sampleTerms: aisle.pages.slice(0, 4).map((p) => {
        const termPhoto = productPhoto(photos, p.slug, aisle.id);
        return {
          term: p.term,
          slug: p.slug,
          photoUrl: termPhoto?.url ?? null,
        };
      }),
      topVendors: aisleVendors,
    };
  });

  const setupOptions = [...tagsPresent(markets, FIND_SETUP)];

  const fullWeek = fullWeekAll
    .filter((g) => g.id !== "earlier" && g.slots.length > 0)
    .slice(0, 4)
    .map((g) => ({
      ...g,
      slots: g.slots.slice(0, 4),
    }));

  return {
    nowIso,
    todayWeekday,
    todayFormatted,
    census,
    fullWeek,
    openNowSlots,
    laterTodaySlots,
    earlierTodaySlots,
    nextDayGroup,
    sellingTodayCount: sellingTodayRaw.length,
    sellingToday: sellingTodayRaw.slice(0, 5),
    weekVendors: weekVendors.slice(0, 5),
    vendorSpotlights,
    tape: tapeRaw.slice(0, 4),
    weeklyNote: weeklyPost
      ? {
          slug: weeklyPost.slug,
          title: weeklyPost.title,
          kicker: weeklyPost.kicker,
          description: plainBlogText(weeklyPost.description),
          date: weeklyPost.date,
        }
      : null,
    neighbourhoodCircuits,
    aisles,
    setupOptions,
  };
}
