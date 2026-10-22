import "server-only";

import {
  getDirectoryCensus,
  listMarkets,
  listSchedules,
  listStalls,
  listVendors,
} from "@/lib/data/catalog";
import {
  EMPTY_PRODUCT_PHOTOS,
  listProductPhotos,
  productPhoto,
  type ProductPhoto,
} from "@/lib/data/product-photos";
import {
  findTitle,
  listFindVendors,
  pageIsAlcohol,
  type FindVendor,
} from "@/lib/data/product-search";
import { FIND_CATEGORIES, type FindPage } from "@/data/find-pages";
import { weekdayInToronto } from "@/lib/find-paths";
import { listingMarkSrc } from "@/lib/format";
import { LAUNCH_CITY } from "@/lib/launch";
import {
  BREAKFAST_ID,
  BREAKFAST_SLUGS,
  catalogueAisles,
  liveFindPages,
} from "@/lib/product-catalogue";
import { knownPrice, sortFindVendors, torontoWeekday } from "@/lib/product-sort";
import { isMarketOpen } from "@/lib/schedule";
import { stallHall } from "@/lib/season-fold";
import { vendorProductTags } from "@/lib/vendor-tags";
import { vendorsSellingToday } from "@/lib/vendor-week";
import type { MarketSchedule } from "@/types/database";

export type ProductsAtlasStallPreview = {
  name: string;
  slug: string;
  logoUrl: string | null;
  ratingAvg: number | null;
  reviewCount: number;
  badge: string;
  marketName: string | null;
  marketSlug: string | null;
  itemName: string;
  priceCents: number | null;
  itemHref: string;
};

export type ProductsAtlasSpotlight = {
  id: string;
  label: string;
  blurb: string;
  photo: ProductPhoto | null;
  guideCount: number;
  vendorCount: number;
  topGuides: Array<{
    term: string;
    slug: string;
    vendors: number;
    photoUrl: string | null;
  }>;
  featuredStalls: ProductsAtlasStallPreview[];
};

export type FindProductMarketSummary = {
  slug: string;
  name: string;
  logoUrl: string | null;
  ratingAvg: number | null;
  reviewCount: number;
  hours: Array<{ day: string; hours: string }>;
  vendorCount: number;
  sampleVendors: Array<{
    name: string;
    slug: string;
    logoUrl: string | null;
  }>;
};

export type FindProductSiblingGuide = {
  term: string;
  slug: string;
  vendors: number;
  photoUrl: string | null;
  photoAlt: string | null;
};

export type FindProductAtlasData = {
  slug: string;
  term: string;
  cleanTerm: string;
  title: string;
  category: string;
  categoryLabel: string;
  alcohol: boolean;
  today: number;
  heroPhoto: ProductPhoto | null;
  vendors: FindVendor[];
  stats: {
    vendorsCount: number;
    itemsCount: number;
    marketsCount: number;
    todayVendorsCount: number;
    pricedVendorsCount: number;
    minPriceCents: number | null;
    maxPriceCents: number | null;
  };
  markets: FindProductMarketSummary[];
  siblingGuides: FindProductSiblingGuide[];
  popularGuides: FindProductSiblingGuide[];
};

const TAG_TO_AISLE_PREVIEW: Record<
  string,
  { aisleId: string; itemName: string; itemHref: string }
> = {
  bakery: {
    aisleId: "bread-and-bakery",
    itemName: "Fresh-baked loaves & pastries",
    itemHref: "/find/bread-toronto",
  },
  bread: {
    aisleId: "bread-and-bakery",
    itemName: "Artisan sourdough & bread",
    itemHref: "/find/sourdough-toronto",
  },
  produce: {
    aisleId: "vegetables",
    itemName: "Seasonal field vegetables & greens",
    itemHref: "/products?aisle=vegetables",
  },
  organic: {
    aisleId: "vegetables",
    itemName: "Certified organic farm produce",
    itemHref: "/find/organic-toronto",
  },
  cheese: {
    aisleId: "cheese-and-dairy",
    itemName: "Small-batch farmstead cheese",
    itemHref: "/find/cheese-toronto",
  },
  dairy: {
    aisleId: "cheese-and-dairy",
    itemName: "Creamery butter & dairy",
    itemHref: "/find/cheese-toronto",
  },
  meat: {
    aisleId: "meat-and-turkey",
    itemName: "Pasture-raised cuts & sausages",
    itemHref: "/find/sausages-toronto",
  },
  poultry: {
    aisleId: "meat-and-turkey",
    itemName: "Farm-raised poultry & eggs",
    itemHref: "/find/chicken-toronto",
  },
  eggs: {
    aisleId: "eggs",
    itemName: "Free-run farm eggs",
    itemHref: "/find/eggs-toronto",
  },
  honey: {
    aisleId: "honey",
    itemName: "Raw Ontario wildflower honey",
    itemHref: "/find/honey-toronto",
  },
  maple: {
    aisleId: "maple",
    itemName: "Wood-fired Ontario maple syrup",
    itemHref: "/find/maple-syrup-toronto",
  },
  "prepared-food": {
    aisleId: "prepared-foods",
    itemName: "Hot prepared dishes & hand pies",
    itemHref: "/products?aisle=prepared-foods",
  },
  coffee: {
    aisleId: "coffee-and-tea",
    itemName: "Small-batch roasted coffee & espresso",
    itemHref: "/find/coffee-toronto",
  },
  tea: {
    aisleId: "coffee-and-tea",
    itemName: "Botanical & loose-leaf teas",
    itemHref: "/find/tea-toronto",
  },
  seafood: {
    aisleId: "seafood",
    itemName: "Smoked trout & Great Lakes fish",
    itemHref: "/find/fish-toronto",
  },
  fruit: {
    aisleId: "apples-and-fruit",
    itemName: "Orchard apples, berries & stone fruit",
    itemHref: "/find/apples-toronto",
  },
  preserves: {
    aisleId: "preserves-and-sauces",
    itemName: "Small-batch jams, pickles & sauces",
    itemHref: "/find/jam-toronto",
  },
  sweets: {
    aisleId: "pies-and-sweets",
    itemName: "Fruit pies, cookies & butter tarts",
    itemHref: "/find/butter-tarts-toronto",
  },
};

export async function loadProductsHubContext(activeAisle: string | null) {
  const [markets, vendors, stalls, schedules, photos, census] = await Promise.all([
    listMarkets(),
    listVendors(),
    listStalls(),
    listSchedules(),
    listProductPhotos().catch(() => EMPTY_PRODUCT_PHOTOS),
    getDirectoryCensus(),
  ]);

  const now = new Date();
  const todayWeekday = weekdayInToronto(now);
  const scheduleMap = new Map<string, MarketSchedule[]>();
  for (const row of schedules) {
    const list = scheduleMap.get(row.market_id) ?? [];
    list.push(row);
    scheduleMap.set(row.market_id, list);
  }

  let openNowCount = 0;
  for (const market of markets) {
    const mSched = scheduleMap.get(market.id) ?? [];
    if (isMarketOpen(mSched, market.province, now)) {
      openNowCount += 1;
    }
  }

  const sellingTodayRaw = vendorsSellingToday(stalls, markets, vendors, scheduleMap, now);
  const sellingTodayBySlug = new Map(sellingTodayRaw.map((r) => [r.vendorSlug, r]));

  const stallsByVendorId = new Map<string, typeof stalls>();
  for (const stall of stalls) {
    if (!stallHall(markets, scheduleMap, stall.market_id)) continue;
    const list = stallsByVendorId.get(stall.id) ?? [];
    list.push(stall);
    stallsByVendorId.set(stall.id, list);
  }

  const live = liveFindPages();
  const aisles = catalogueAisles(live);

  const stallsByAisle: Record<string, ProductsAtlasStallPreview[]> = {};
  for (const aisle of aisles) {
    stallsByAisle[aisle.id] = [];
  }

  const allPreviews: Array<ProductsAtlasStallPreview & { aisleIds: string[]; openNow: boolean; sellingToday: boolean }> = [];

  for (const vendor of vendors) {
    const vStalls = stallsByVendorId.get(vendor.id);
    if (!vStalls?.length) continue;

    const tags = vendorProductTags(vendor.name, vendor.tags);
    const matchedPreviews = tags
      .map((t) => TAG_TO_AISLE_PREVIEW[t])
      .filter((x): x is NonNullable<typeof x> => Boolean(x));
    if (!matchedPreviews.length) continue;

    const primaryHall = stallHall(markets, scheduleMap, vStalls[0]!.market_id);
    const todayRow = sellingTodayBySlug.get(vendor.slug);
    const openNow = Boolean(todayRow?.open);
    const sellingToday = Boolean(todayRow);
    const onWeekend = vStalls.some(
      (s) => s.days.includes(0) || s.days.includes(6) || s.days.includes(todayWeekday),
    );
    const badge = openNow
      ? "Selling now"
      : sellingToday
        ? "Later today"
        : onWeekend
          ? "Selling this weekend"
          : "On the schedule";

    const lead = matchedPreviews[0]!;
    allPreviews.push({
      name: vendor.name,
      slug: vendor.slug,
      logoUrl: listingMarkSrc(vendor.logo_url),
      ratingAvg: vendor.rating_avg ?? null,
      reviewCount: vendor.review_count ?? 0,
      badge,
      marketName: primaryHall?.market.name ?? null,
      marketSlug: primaryHall?.market.slug ?? null,
      itemName: lead.itemName,
      priceCents: null,
      itemHref: lead.itemHref,
      aisleIds: [...new Set(matchedPreviews.map((m) => m.aisleId))],
      openNow,
      sellingToday,
    });
  }

  allPreviews.sort(
    (a, b) =>
      Number(b.openNow) - Number(a.openNow) ||
      Number(b.sellingToday) - Number(a.sellingToday) ||
      Number(Boolean(b.logoUrl)) - Number(Boolean(a.logoUrl)) ||
      (b.reviewCount ?? 0) - (a.reviewCount ?? 0) ||
      a.name.localeCompare(b.name, "en-CA"),
  );

  for (const preview of allPreviews) {
    for (const aisleId of preview.aisleIds) {
      const list = stallsByAisle[aisleId];
      if (list && list.length < 4) {
        list.push(preview);
      }
    }
  }

  const activeAisleObj =
    activeAisle && activeAisle !== BREAKFAST_ID
      ? aisles.find((a) => a.id === activeAisle) ?? null
      : null;

  const spotlightPages =
    activeAisle === BREAKFAST_ID
      ? live.filter((p) => (BREAKFAST_SLUGS as readonly string[]).includes(p.slug))
      : activeAisleObj
        ? activeAisleObj.pages
        : live.slice(0, 8);

  const spotlightId = activeAisle ?? "all";
  const spotlightLabel =
    activeAisle === BREAKFAST_ID
      ? "Breakfast staples"
      : activeAisleObj
        ? activeAisleObj.label
        : "Featured market products";
  const spotlightBlurb =
    activeAisle === BREAKFAST_ID
      ? "Fresh-baked sourdough, free-run farm eggs, raw Ontario honey, small-batch coffee, and wood-fired maple syrup."
      : activeAisleObj
        ? activeAisleObj.line ||
          `Compare ${activeAisleObj.label.toLowerCase()} across Toronto farmers' markets.`
        : "Compare what Toronto market stalls grow, bake, and prepare — with listed prices, stall ratings, and weekly market hours.";

  const leadSlug = spotlightPages[0]?.slug ?? "sourdough-toronto";
  const leadCategory = spotlightPages[0]?.category ?? "bread-and-bakery";
  const heroPhoto =
    (activeAisleObj ? photos.aisle[activeAisleObj.id] : null) ??
    productPhoto(photos, leadSlug, leadCategory);

  const featuredStallsForSpotlight: ProductsAtlasStallPreview[] =
    activeAisle && activeAisle !== BREAKFAST_ID && stallsByAisle[activeAisle]?.length
      ? stallsByAisle[activeAisle]!
      : allPreviews.slice(0, 4);

  const totalVendorsInSpotlight = spotlightPages.reduce((sum, p) => sum + p.vendors, 0);

  const spotlight: ProductsAtlasSpotlight = {
    id: spotlightId,
    label: spotlightLabel,
    blurb: spotlightBlurb,
    photo: heroPhoto,
    guideCount: spotlightPages.length,
    vendorCount: totalVendorsInSpotlight,
    topGuides: spotlightPages.slice(0, 6).map((p) => {
      const pPhoto = productPhoto(photos, p.slug, p.category);
      return {
        term: p.term.replace(/^General\s+/i, ""),
        slug: p.slug,
        vendors: p.vendors,
        photoUrl: pPhoto?.url ?? null,
      };
    }),
    featuredStalls: featuredStallsForSpotlight,
  };

  return {
    markets,
    census,
    openNowCount,
    sellingTodayCount: sellingTodayRaw.length,
    photos,
    spotlight,
    stallsByAisle,
    featuredStalls: allPreviews.slice(0, 6),
  };
}

export async function loadFindProductAtlasData(
  page: FindPage,
  now = new Date(),
): Promise<FindProductAtlasData> {
  const today = torontoWeekday(now);
  const [rawVendors, photos] = await Promise.all([
    listFindVendors(page, now),
    listProductPhotos().catch(() => EMPTY_PRODUCT_PHOTOS),
  ]);

  const vendors = sortFindVendors(rawVendors, "next", today);
  const alcohol = pageIsAlcohol(page.category);
  const title = findTitle(page.term, LAUNCH_CITY);
  const cleanTerm = page.term.replace(/^General\s+/i, "");
  const categoryLabel =
    FIND_CATEGORIES.find((c) => c.id === page.category)?.label ?? "Market goods";

  const heroPhoto =
    productPhoto(photos, page.slug, page.category) ??
    photos.aisle[page.category] ??
    null;

  // Compute price and availability statistics
  let itemsCount = 0;
  let pricedVendorsCount = 0;
  let todayVendorsCount = 0;
  let minPriceCents: number | null = null;
  let maxPriceCents: number | null = null;

  const marketMap = new Map<
    string,
    {
      slug: string;
      name: string;
      logoUrl: string | null;
      ratingAvg: number | null;
      reviewCount: number;
      hours: Array<{ day: string; hours: string }>;
      vendorCount: number;
      sampleVendors: Array<{ name: string; slug: string; logoUrl: string | null }>;
    }
  >();

  for (const vendor of vendors) {
    itemsCount += vendor.items.length;
    if (
      vendor.badge === "Open now" ||
      vendor.badge === "Later today" ||
      vendor.waitDays === 0
    ) {
      todayVendorsCount += 1;
    }

    let vendorHasPrice = false;
    if (!alcohol) {
      for (const item of vendor.items) {
        const p = knownPrice(item.priceCents);
        if (p != null) {
          vendorHasPrice = true;
          if (minPriceCents == null || p < minPriceCents) minPriceCents = p;
          if (maxPriceCents == null || p > maxPriceCents) maxPriceCents = p;
        }
      }
    }
    if (vendorHasPrice) pricedVendorsCount += 1;

    for (const m of vendor.markets) {
      const existing = marketMap.get(m.slug);
      if (existing) {
        existing.vendorCount += 1;
        if (
          existing.sampleVendors.length < 3 &&
          !existing.sampleVendors.some((sv) => sv.slug === vendor.slug)
        ) {
          existing.sampleVendors.push({
            name: vendor.name,
            slug: vendor.slug,
            logoUrl: vendor.logoUrl,
          });
        }
        if (existing.hours.length === 0 && m.hours.length > 0) {
          existing.hours = m.hours;
        }
      } else {
        marketMap.set(m.slug, {
          slug: m.slug,
          name: m.name,
          logoUrl: m.logoUrl ?? null,
          ratingAvg: m.ratingAvg,
          reviewCount: m.reviewCount,
          hours: m.hours,
          vendorCount: 1,
          sampleVendors: [
            {
              name: vendor.name,
              slug: vendor.slug,
              logoUrl: vendor.logoUrl,
            },
          ],
        });
      }
    }
  }

  const markets = [...marketMap.values()].sort(
    (a, b) => b.vendorCount - a.vendorCount || a.name.localeCompare(b.name, "en-CA"),
  );

  const live = liveFindPages();
  const siblingGuides: FindProductSiblingGuide[] = live
    .filter((p) => p.category === page.category && p.slug !== page.slug)
    .slice(0, 8)
    .map((p) => {
      const pPhoto = productPhoto(photos, p.slug, p.category);
      return {
        term: p.term.replace(/^General\s+/i, ""),
        slug: p.slug,
        vendors: p.vendors,
        photoUrl: pPhoto?.url ?? null,
        photoAlt: pPhoto?.alt ?? p.term,
      };
    });

  const popularGuides: FindProductSiblingGuide[] = live
    .filter((p) => p.category !== page.category && p.slug !== page.slug)
    .slice(0, 6)
    .map((p) => {
      const pPhoto = productPhoto(photos, p.slug, p.category);
      return {
        term: p.term.replace(/^General\s+/i, ""),
        slug: p.slug,
        vendors: p.vendors,
        photoUrl: pPhoto?.url ?? null,
        photoAlt: pPhoto?.alt ?? p.term,
      };
    });

  return {
    slug: page.slug,
    term: page.term,
    cleanTerm,
    title,
    category: page.category,
    categoryLabel,
    alcohol,
    today,
    heroPhoto,
    vendors,
    stats: {
      vendorsCount: vendors.length,
      itemsCount,
      marketsCount: markets.length,
      todayVendorsCount,
      pricedVendorsCount,
      minPriceCents,
      maxPriceCents,
    },
    markets,
    siblingGuides,
    popularGuides,
  };
}
