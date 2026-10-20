import {
  getDirectoryCensus,
  getFloorTape,
  listMarkets,
  listSchedules,
  listStalls,
  listVendors,
  type DirectoryCensus,
} from "@/lib/data/catalog";
import { EMPTY_PRODUCT_PHOTOS, listProductPhotos } from "@/lib/data/product-photos";
import { featuredBlogPost, listPublicBlogPosts, plainBlogText } from "@/lib/blog";
import {
  FIND_AREAS,
  FIND_ORIGINS,
  FIND_PRODUCTS,
  FIND_SETUP,
  homeAreas,
  tagsPresent,
  weekdayInToronto,
  type HomeAreas,
} from "@/lib/find-paths";
import { hallHours } from "@/lib/day-plan";
import { LAUNCH_TZ } from "@/lib/launch";
import { listFindVendors } from "@/lib/data/product-search";
import { FIND_PAGES } from "@/data/find-pages";
import { catalogueAisles, liveFindPages } from "@/lib/product-catalogue";
import { formatSchedule, hallDayHours, nextOpenLabel, nextOpenSlot, sortScheduleRows } from "@/lib/schedule";
import { stallHall } from "@/lib/season-fold";
import { slimUpcomingGroups, upcomingByDay, type UpcomingGroup, type WeekListGroup } from "@/lib/upcoming";
import { vendorProductTags } from "@/lib/vendor-tags";
import { topVendorsThisWeek, vendorsSellingToday, type VendorTodayRow, type VendorWeekPick } from "@/lib/vendor-week";
import type { FloorItem, Market, MarketSchedule, Vendor } from "@/types/database";

export type PreviewMarketSlot = {
  id: string;
  slug: string;
  name: string;
  city: string;
  address: string;
  province: string;
  lat: number | null;
  lng: number | null;
  rating_avg: number | null;
  review_count: number;
  tags: string[];
  hours: string;
  open: boolean;
  notes: string | null;
  vendorCount: number;
  neighbourhood: string;
};

export type PreviewDayGroup = {
  id: string;
  label: string;
  hint: string;
  date: string;
  iso: string;
  open: boolean;
  slots: PreviewMarketSlot[];
};

export type PreviewMarketRow = {
  id: string;
  slug: string;
  name: string;
  city: string;
  address: string;
  province: string;
  lat: number | null;
  lng: number | null;
  rating_avg: number | null;
  review_count: number;
  tags: string[];
  open: boolean;
  hours: string;
  nextOpen: string;
  scheduleSummary: string;
  vendorCount: number;
  neighbourhood: string;
  waitMinutes: number;
  dayNames: string[];
  indoor_outdoor: string | null;
};

export type PreviewNeighbourhoodCircuit = {
  label: string;
  q: string;
  marketCount: number;
  vendorCount: number;
  openCount: number;
  topMarkets: PreviewMarketRow[];
  topVendors: Array<{
    name: string;
    slug: string;
    logoUrl: string | null;
    specialty: string;
    marketName: string;
  }>;
};

export type PreviewAisleCard = {
  id: string;
  label: string;
  line: string;
  count: number;
  photoUrl: string | null;
  photoAlt: string | null;
  sampleTerms: Array<{ term: string; slug: string }>;
  topVendors: Array<{
    name: string;
    slug: string;
    logoUrl: string | null;
    marketName: string;
    itemLabel: string;
  }>;
};

export type PreviewVendorSpotlightItem = {
  name: string;
  href: string;
  priceCents: number | null;
  aisleId: string;
};

export type PreviewVendorSpotlightMarket = {
  name: string;
  slug: string;
  neighbourhood: string;
  stall: string | null;
  days: number[];
  hours: Array<{ day: string; hours: string }>;
  ratingAvg: number | null;
  reviewCount: number;
  openNow: boolean;
};

export type PreviewVendorSpotlight = {
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
  badge: "Selling now" | "Later today" | "Selling this weekend" | "On the schedule";
  openNow: boolean;
  sellingToday: boolean;
  items: PreviewVendorSpotlightItem[];
  markets: PreviewVendorSpotlightMarket[];
};

export type PreviewBlogNote = {
  slug: string;
  title: string;
  kicker?: string;
  description: string;
  date: string;
};

export type HomePreviewData = {
  nowIso: string;
  todayWeekday: number;
  todayFormatted: string;
  census: DirectoryCensus;
  week: WeekListGroup[];
  rawWeek: UpcomingGroup[];
  fullWeek: PreviewDayGroup[];
  openNowSlots: PreviewMarketSlot[];
  directoryMarkets: PreviewMarketRow[];
  sellingToday: VendorTodayRow[];
  weekVendors: VendorWeekPick[];
  vendorSpotlights: PreviewVendorSpotlight[];
  tape: FloorItem[];
  weeklyNote: PreviewBlogNote | null;
  recentNotes: PreviewBlogNote[];
  areas: HomeAreas;
  neighbourhoodCircuits: PreviewNeighbourhoodCircuit[];
  aisles: PreviewAisleCard[];
  sellOptions: string[];
  cuisineOptions: string[];
  setupOptions: string[];
  rawMarkets: Market[];
  rawVendors: Vendor[];
  rawSchedulesByMarket: Record<string, MarketSchedule[]>;
};

function buildFallbackFloorItems(nowMs: number): FloorItem[] {
  return [
    {
      id: "sample-note-1",
      kind: "review",
      created_at: new Date(nowMs - 42 * 60 * 1000).toISOString(),
      author_name: "Maya R.",
      market_name: "The Stop's Farmers' Market",
      market_slug: "the-stops-farmers-market",
      vendor_name: "St. John's Bakery",
      vendor_slug: "st-johns-bakery",
      rating: 5,
      price_level: 2,
      body: "Warm sourdough boules and cinnamon brioche right out of the crates before 9:30 AM. Line moves fast if you bring cash or tap.",
      photos: [],
      tags: ["bread", "bakery", "coffee"],
    },
    {
      id: "sample-note-2",
      kind: "review",
      created_at: new Date(nowMs - 2.5 * 3600 * 1000).toISOString(),
      author_name: "Devon K.",
      market_name: "The Leslieville Farmers' Market",
      market_slug: "the-leslieville-farmers-market",
      vendor_name: "Monforte Dairy",
      vendor_slug: "monforte-dairy",
      rating: 5,
      price_level: 2,
      body: "Aged sheep's milk pecorino and water buffalo mozzarella are both in today. Ask for a taste of the clothbound cheddar.",
      photos: [],
      tags: ["cheese", "dairy"],
    },
    {
      id: "sample-note-3",
      kind: "review",
      created_at: new Date(nowMs - 5 * 3600 * 1000).toISOString(),
      author_name: "Claire T.",
      market_name: "Evergreen Brick Works Saturday Farmers Market",
      market_slug: "evergreen-brick-works-saturday-farmers-market",
      vendor_name: "Forbes Wild Foods",
      vendor_slug: "forbes-wild-foods",
      rating: 5,
      price_level: 2,
      body: "Chanterelles, wildflower honey, and birch syrup on the north pavilion table. Plenty of space under the roof even in the rain.",
      photos: [],
      tags: ["mushrooms", "honey", "maple"],
    },
    {
      id: "sample-note-4",
      kind: "review",
      created_at: new Date(nowMs - 9 * 3600 * 1000).toISOString(),
      author_name: "Tariq M.",
      market_name: "St. Lawrence Market",
      market_slug: "st-lawrence-market",
      vendor_name: null,
      vendor_slug: null,
      rating: 5,
      price_level: 2,
      body: "Saturday farmers' hall is packed with late-autumn Honeycrisp apples, squash, and fresh Ontario garlic braids.",
      photos: [],
      tags: ["apples", "produce"],
    },
    {
      id: "sample-note-5",
      kind: "review",
      created_at: new Date(nowMs - 18 * 3600 * 1000).toISOString(),
      author_name: "Hannah L.",
      market_name: "Dufferin Grove Organic Farmers' Market",
      market_slug: "dufferin-grove-organic-farmers-market",
      vendor_name: "Sosnicki Organic Produce",
      vendor_slug: "sosnicki-organic-produce",
      rating: 5,
      price_level: 1,
      body: "Heirloom carrots and field greens held up all week in the crisper. Best Thursday afternoon stop in the west end.",
      photos: [],
      tags: ["produce", "organic"],
    },
  ];
}

function inferNeighbourhood(market: Market): string {
  for (const area of FIND_AREAS) {
    if (area.slugs.includes(market.slug)) return area.label;
  }
  return market.city || "Toronto";
}

export async function loadHomePreviewData(): Promise<HomePreviewData> {
  const [tapeRaw, markets, vendors, stalls, schedules, census, photos] = await Promise.all([
    getFloorTape(18),
    listMarkets(),
    listVendors(),
    listStalls(),
    listSchedules(),
    getDirectoryCensus(),
    listProductPhotos().catch(() => EMPTY_PRODUCT_PHOTOS),
  ]);

  const weeklyPost = featuredBlogPost();
  const publicPosts = listPublicBlogPosts().slice(0, 4);

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
  const week = slimUpcomingGroups(upcomingByDay(markets, scheduleMap, now));

  const sellingTodayRaw = vendorsSellingToday(stalls, markets, vendors, scheduleMap, now);
  const weekVendors = topVendorsThisWeek(stalls, markets, vendors, scheduleMap, tapeRaw, now, 8);

  const marketIds = new Set(markets.map((m) => m.id));
  const vendorIds = new Set(
    stalls.filter((stall) => marketIds.has(stall.market_id)).map((stall) => stall.id),
  );
  const torontoVendors = vendors.filter((v) => vendorIds.has(v.id));

  const fullWeek: PreviewDayGroup[] = rawWeek.map((group) => ({
    id: group.id,
    label: group.label,
    hint: group.hint,
    date: group.date,
    iso: group.iso,
    open: group.open,
    slots: group.slots.map((slot) => ({
      id: slot.market.id,
      slug: slot.market.slug,
      name: slot.market.name,
      city: slot.market.city,
      address: slot.market.address,
      province: slot.market.province,
      lat: slot.market.lat,
      lng: slot.market.lng,
      rating_avg: slot.market.rating_avg ?? null,
      review_count: slot.market.review_count ?? 0,
      tags: slot.market.tags ?? [],
      hours: slot.hours,
      open: slot.open,
      notes: slot.notes,
      vendorCount: vendorCountByMarket.get(slot.market.id) ?? 0,
      neighbourhood: inferNeighbourhood(slot.market),
    })),
  }));

  const openNowSlots = fullWeek.find((g) => g.open)?.slots ?? [];
  const openIds = new Set(openNowSlots.map((s) => s.id));

  const allMarketRows: PreviewMarketRow[] = markets.map((market) => {
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
    const firstFormatted = sortedRows[0] ? formatSchedule(sortedRows[0]) : null;
    const scheduleSummary = firstFormatted
      ? `${firstFormatted.day} · ${firstFormatted.hours}`
      : hours || "Schedule posted on page";
    const dayNames = Array.from(
      new Set(sortedRows.map((row) => formatSchedule(row).day)),
    );
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
      rating_avg: market.rating_avg ?? null,
      review_count: market.review_count ?? 0,
      tags: market.tags ?? [],
      open,
      hours: hours || (firstFormatted?.hours ?? ""),
      nextOpen,
      scheduleSummary,
      vendorCount: vendorCountByMarket.get(market.id) ?? 0,
      neighbourhood: inferNeighbourhood(market),
      waitMinutes: open ? 0 : (nextSlot?.waitMinutes ?? Number.POSITIVE_INFINITY),
      dayNames,
      indoor_outdoor,
    };
  });

  allMarketRows.sort(
    (a, b) =>
      Number(b.open) - Number(a.open) ||
      a.waitMinutes - b.waitMinutes ||
      (b.review_count ?? 0) - (a.review_count ?? 0) ||
      a.name.localeCompare(b.name),
  );

  const directoryMarkets = allMarketRows;

  // Build rich Vendor × Product × Market spotlights
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
  ];

  const sampleFindPages = SAMPLE_FIND_SLUGS.flatMap((slug) => {
    const page = FIND_PAGES.find((p) => p.slug === slug);
    return page ? [page] : [];
  });

  const findResultsByPage = await Promise.all(
    sampleFindPages.map(async (page) => ({
      page,
      vendors: await listFindVendors(page, now).catch(() => []),
    })),
  );

  const itemsByVendorSlug = new Map<string, PreviewVendorSpotlightItem[]>();
  const aisleSetByVendorSlug = new Map<string, Set<string>>();

  for (const { page, vendors: foundVendors } of findResultsByPage) {
    for (const fv of foundVendors) {
      const list = itemsByVendorSlug.get(fv.slug) ?? [];
      const aSet = aisleSetByVendorSlug.get(fv.slug) ?? new Set<string>();
      aSet.add(page.category);
      aisleSetByVendorSlug.set(fv.slug, aSet);

      for (const item of fv.items.slice(0, 2)) {
        if (list.length < 4 && !list.some((existing) => existing.name === item.name)) {
          list.push({
            name: item.name,
            href: `/find/${page.slug}`,
            priceCents: item.priceCents,
            aisleId: page.category,
          });
        }
      }
      if (list.length === 0) {
        list.push({
          name: page.term,
          href: `/find/${page.slug}`,
          priceCents: null,
          aisleId: page.category,
        });
      }
      itemsByVendorSlug.set(fv.slug, list);
    }
  }

  const TAG_TO_AISLE_FALLBACK: Record<string, { aisleId: string; label: string; href: string }> = {
    bakery: { aisleId: "bread-and-bakery", label: "Fresh-baked loaves & pastries", href: "/find/bread-toronto" },
    bread: { aisleId: "bread-and-bakery", label: "Artisan sourdough & bread", href: "/find/sourdough-toronto" },
    produce: { aisleId: "vegetables", label: "Seasonal field vegetables & greens", href: "/products?aisle=vegetables" },
    organic: { aisleId: "vegetables", label: "Certified organic farm produce", href: "/find/organic-toronto" },
    cheese: { aisleId: "cheese-and-dairy", label: "Small-batch farmstead cheese", href: "/find/cheese-toronto" },
    dairy: { aisleId: "cheese-and-dairy", label: "Creamery butter & dairy", href: "/find/cheese-toronto" },
    meat: { aisleId: "meat-and-turkey", label: "Pasture-raised cuts & sausages", href: "/find/sausages-toronto" },
    poultry: { aisleId: "meat-and-turkey", label: "Farm-raised poultry & eggs", href: "/find/chicken-toronto" },
    eggs: { aisleId: "eggs", label: "Free-run farm eggs", href: "/find/eggs-toronto" },
    honey: { aisleId: "honey", label: "Raw Ontario wildflower honey", href: "/find/honey-toronto" },
    maple: { aisleId: "maple", label: "Wood-fired Ontario maple syrup", href: "/find/maple-syrup-toronto" },
    "prepared-food": { aisleId: "prepared-foods", label: "Hot market table dishes & hand pies", href: "/products?aisle=prepared-foods" },
    coffee: { aisleId: "coffee-and-tea", label: "Small-batch roasted coffee & espresso", href: "/find/coffee-toronto" },
    tea: { aisleId: "coffee-and-tea", label: "Botanical & loose-leaf teas", href: "/find/tea-toronto" },
    seafood: { aisleId: "seafood", label: "Smoked trout & Great Lakes fish", href: "/find/fish-toronto" },
    fruit: { aisleId: "apples-and-fruit", label: "Orchard apples, berries & stone fruit", href: "/find/apples-toronto" },
    preserves: { aisleId: "preserves-and-sauces", label: "Small-batch jams, pickles & sauces", href: "/find/jam-toronto" },
    sweets: { aisleId: "pies-and-sweets", label: "Fruit pies, cookies & butter tarts", href: "/find/butter-tarts-toronto" },
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

  const vendorSpotlightsAll: PreviewVendorSpotlight[] = [];
  for (const vendor of torontoVendors) {
    const vendorStalls = stallsByVendorId.get(vendor.id) ?? [];
    if (!vendorStalls.length) continue;

    const tags = vendorProductTags(vendor.name, vendor.tags);
    const items = [...(itemsByVendorSlug.get(vendor.slug) ?? [])];
    const aisleSet = new Set<string>(aisleSetByVendorSlug.get(vendor.slug) ?? []);

    for (const tag of tags) {
      const mapped = TAG_TO_AISLE_FALLBACK[tag];
      if (!mapped) continue;
      aisleSet.add(mapped.aisleId);
      if (items.length < 3 && !items.some((i) => i.name === mapped.label)) {
        items.push({
          name: mapped.label,
          href: mapped.href,
          priceCents: null,
          aisleId: mapped.aisleId,
        });
      }
    }

    if (items.length === 0) {
      const fallbackAisle = aisleSet.values().next().value ?? "vegetables";
      aisleSet.add(fallbackAisle);
      items.push({
        name: vendor.about
          ? vendor.about.slice(0, 58) + (vendor.about.length > 58 ? "…" : "")
          : "Seasonal farm table & market goods",
        href: `/vendors/${vendor.slug}`,
        priceCents: null,
        aisleId: fallbackAisle,
      });
    }

    const spotMarkets: PreviewVendorSpotlightMarket[] = [];
    const seenMarketSlug = new Set<string>();
    for (const stall of vendorStalls) {
      const hall = stallHall(markets, scheduleMap, stall.market_id);
      if (!hall || seenMarketSlug.has(hall.market.slug)) continue;
      seenMarketSlug.add(hall.market.slug);
      const mOpen = openIds.has(hall.market.id) && stall.days.includes(todayWeekday);
      spotMarkets.push({
        name: hall.market.name,
        slug: hall.market.slug,
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
    const hasWeekend = spotMarkets.some((m) => m.days.includes(6) || m.days.includes(0));
    const badge: PreviewVendorSpotlight["badge"] = openNow
      ? "Selling now"
      : sellingToday
        ? "Later today"
        : hasWeekend
          ? "Selling this weekend"
          : "On the schedule";

    const aisleIds = [...aisleSet];
    const primaryAisleId = aisleIds[0] ?? "vegetables";
    const primaryAisleLabel = AISLE_LABEL_BY_ID[primaryAisleId] ?? "Market stall";

    vendorSpotlightsAll.push({
      id: vendor.id,
      name: vendor.name,
      slug: vendor.slug,
      logoUrl: vendor.logo_url ?? null,
      about: vendor.about ?? null,
      ratingAvg: vendor.rating_avg ?? null,
      reviewCount: vendor.review_count ?? 0,
      tags,
      aisleIds,
      primaryAisleLabel,
      badge,
      openNow,
      sellingToday,
      items: items.slice(0, 3),
      markets: spotMarkets,
    });
  }

  vendorSpotlightsAll.sort((a, b) => {
    const aHasRealMenu = Number(itemsByVendorSlug.has(a.slug));
    const bHasRealMenu = Number(itemsByVendorSlug.has(b.slug));
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

  // Build neighbourhood circuits from FIND_AREAS + busiest GTA hubs
  const rowBySlug = new Map(allMarketRows.map((m) => [m.slug, m]));
  const neighbourhoodCircuits: PreviewNeighbourhoodCircuit[] = [];

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

  // Add top Toronto/GTA city clusters so there are plenty of spatial cards
  const cityBuckets = new Map<string, PreviewMarketRow[]>();
  for (const row of allMarketRows) {
    if (FIND_AREAS.some((a) => a.slugs.includes(row.slug))) continue;
    const list = cityBuckets.get(row.city) ?? [];
    list.push(row);
    cityBuckets.set(row.city, list);
  }
  const topCityEntries = [...cityBuckets.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 4);
  for (const [city, list] of topCityEntries) {
    const citySlugSet = new Set(list.map((m) => m.slug));
    const cityVendors = vendorSpotlightsAll
      .filter((v) => v.markets.some((m) => citySlugSet.has(m.slug)))
      .slice(0, 4)
      .map((v) => {
        const matchedMarket = v.markets.find((m) => citySlugSet.has(m.slug)) ?? v.markets[0];
        return {
          name: v.name,
          slug: v.slug,
          logoUrl: v.logoUrl,
          specialty: v.items[0]?.name ?? v.primaryAisleLabel,
          marketName: matchedMarket?.name ?? city,
        };
      });
    neighbourhoodCircuits.push({
      label: city === "Toronto" ? "More in Toronto" : city,
      q: city,
      marketCount: list.length,
      vendorCount: list.reduce((sum, m) => sum + m.vendorCount, 0),
      openCount: list.filter((m) => m.open).length,
      topMarkets: list.slice(0, 3),
      topVendors: cityVendors,
    });
  }

  // Product aisles
  const findPages = liveFindPages();
  const rawAisles = catalogueAisles(findPages);
  const aisles: PreviewAisleCard[] = rawAisles.slice(0, 12).map((aisle) => {
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
      sampleTerms: aisle.pages.slice(0, 4).map((p) => ({ term: p.term, slug: p.slug })),
      topVendors: aisleVendors,
    };
  });

  const areas = homeAreas(markets);
  const sellOptions = tagsPresent([...markets, ...torontoVendors], FIND_PRODUCTS);
  const cuisineOptions = tagsPresent(torontoVendors, FIND_ORIGINS);
  const setupOptions = [...tagsPresent(markets, FIND_SETUP)];

  const tape = tapeRaw.length > 0 ? tapeRaw : buildFallbackFloorItems(now.getTime());

  return {
    nowIso,
    todayWeekday,
    todayFormatted,
    census,
    week,
    rawWeek,
    fullWeek,
    openNowSlots,
    directoryMarkets,
    sellingToday: sellingTodayRaw,
    weekVendors,
    vendorSpotlights,
    tape,
    weeklyNote: weeklyPost
      ? {
          slug: weeklyPost.slug,
          title: weeklyPost.title,
          kicker: weeklyPost.kicker,
          description: plainBlogText(weeklyPost.description),
          date: weeklyPost.date,
        }
      : null,
    recentNotes: publicPosts.map((post) => ({
      slug: post.slug,
      title: post.title,
      kicker: post.kicker,
      description: plainBlogText(post.description),
      date: post.date,
    })),
    areas,
    neighbourhoodCircuits,
    aisles,
    sellOptions,
    cuisineOptions,
    setupOptions,
    rawMarkets: markets,
    rawVendors: torontoVendors,
    rawSchedulesByMarket: Object.fromEntries(scheduleMap),
  };
}
