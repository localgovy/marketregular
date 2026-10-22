import "server-only";

import { getDirectoryCensus } from "@/lib/data/catalog";
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
import { loadHomeAtlasData, type HomeAtlasVendorSpotlight } from "@/lib/home-atlas-data";
import { LAUNCH_CITY } from "@/lib/launch";
import {
  BREAKFAST_ID,
  BREAKFAST_SLUGS,
  catalogueAisles,
  liveFindPages,
} from "@/lib/product-catalogue";
import { knownPrice, sortFindVendors, torontoWeekday } from "@/lib/product-sort";

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

function mapVendorSpotlightToPreview(
  spot: HomeAtlasVendorSpotlight,
  preferredAisleId?: string | null,
): ProductsAtlasStallPreview {
  const matchedItem =
    (preferredAisleId
      ? spot.items.find((i) => i.aisleId === preferredAisleId)
      : null) ?? spot.items[0];
  const primaryMarket = spot.markets[0];
  return {
    name: spot.name,
    slug: spot.slug,
    logoUrl: spot.logoUrl,
    ratingAvg: spot.ratingAvg,
    reviewCount: spot.reviewCount,
    badge: spot.badge,
    marketName: primaryMarket?.name ?? null,
    marketSlug: primaryMarket?.slug ?? null,
    itemName: matchedItem?.name ?? spot.primaryAisleLabel,
    priceCents: matchedItem?.priceCents ?? null,
    itemHref: matchedItem?.href ?? `/vendors/${spot.slug}`,
  };
}

export async function loadProductsHubContext(activeAisle: string | null) {
  const [homeAtlas, photos, census] = await Promise.all([
    loadHomeAtlasData().catch(() => null),
    listProductPhotos().catch(() => EMPTY_PRODUCT_PHOTOS),
    getDirectoryCensus(),
  ]);

  const live = liveFindPages();
  const aisles = catalogueAisles(live);
  const spotlights = homeAtlas?.vendorSpotlights ?? [];

  // Map each aisle to its top stall previews
  const stallsByAisle: Record<string, ProductsAtlasStallPreview[]> = {};
  for (const aisle of aisles) {
    stallsByAisle[aisle.id] = spotlights
      .filter((v) => v.aisleIds.includes(aisle.id))
      .slice(0, 4)
      .map((v) => mapVendorSpotlightToPreview(v, aisle.id));
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
        ? activeAisleObj.line || `Compare ${activeAisleObj.label.toLowerCase()} across Toronto farmers' markets.`
        : "Compare what Toronto market stalls grow, bake, and prepare — with listed prices, stall ratings, and weekly market hours.";

  const leadSlug = spotlightPages[0]?.slug ?? "sourdough-toronto";
  const leadCategory = spotlightPages[0]?.category ?? "bread-and-bakery";
  const heroPhoto =
    (activeAisleObj ? photos.aisle[activeAisleObj.id] : null) ??
    productPhoto(photos, leadSlug, leadCategory);

  const featuredStalls: ProductsAtlasStallPreview[] =
    activeAisle && activeAisle !== BREAKFAST_ID && stallsByAisle[activeAisle]?.length
      ? stallsByAisle[activeAisle]!
      : spotlights.slice(0, 4).map((v) => mapVendorSpotlightToPreview(v, activeAisle));

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
    featuredStalls,
  };

  return {
    census: homeAtlas?.census ?? census,
    openNowCount: homeAtlas?.openNowSlots.length ?? 0,
    sellingTodayCount: homeAtlas?.sellingTodayCount ?? 0,
    photos,
    spotlight,
    stallsByAisle,
    featuredStalls: spotlights.slice(0, 6).map((v) => mapVendorSpotlightToPreview(v, activeAisle)),
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
