import "server-only";

import {
  getListingContact,
  getVendorBySlug,
  listMarkets,
  listSchedules,
  listStalls,
  listVendors,
} from "@/lib/data/catalog";
import {
  EMPTY_PRODUCT_PHOTOS,
  listProductPhotos,
  productPhoto,
} from "@/lib/data/product-photos";
import { menuCategoryLabel } from "@/lib/data/product-search";
import { FIND_CATEGORIES, FIND_PAGES } from "@/data/find-pages";
import { DIRECTORY_REVALIDATE_SECONDS } from "@/lib/directory-cache";
import { FIND_AREAS, sortTagsForDisplay, weekdayInToronto } from "@/lib/find-paths";
import { listingMarkSrc } from "@/lib/format";
import { toGeoMarket, type GeoMarket } from "@/lib/geo";
import { listingIsClaimed } from "@/lib/listing-claimed";
import type { ListingContactFields } from "@/lib/listing-substance";
import { visiblePriceCents } from "@/lib/product-hits";
import {
  hallDayHours,
  isMarketOpen,
  nextOpenLabel,
  sessionOnWeekday,
} from "@/lib/schedule";
import { VENDOR_SALES_OPEN } from "@/lib/selling";
import { stripeChargesConfigured } from "@/lib/stripe";
import { rankVendorMarkets, vendorMarketInSeason } from "@/lib/vendor-markets";
import {
  matchFindPageByName,
  orderedSectionNames,
  stallCompareLabel,
} from "@/lib/vendor-atlas-match";
import { vendorProductTags } from "@/lib/vendor-tags";
import type {
  FloorItem,
  Market,
  MarketSchedule,
  StallPick,
  StallRef,
  Vendor,
  VendorDetail,
} from "@/types/database";

export type VendorAtlasMenuItem = {
  id: string;
  name: string;
  description: string | null;
  section: string;
  sectionOrder: number | null;
  season: string | null;
  dietary: string[];
  imageUrl: string | null;
  productCategory: string;
  productCategoryLabel: string;
  productSlug: string | null;
  compareHref: string;
  compareLabel: string;
  compareVendorsCount: number | null;
  categoryHref: string;
  priceCents: number | null;
  canBuy: boolean;
  pickup: boolean;
  preorder: boolean;
  delivery: boolean;
  terms: string | null;
};

export type VendorAtlasFellowStall = {
  slug: string;
  name: string;
  logoUrl: string | null;
  specialty: string;
  categoryLabel: string;
  ratingAvg: number | null;
  reviewCount: number;
  stall: string | null;
};

export type VendorAtlasMarket = {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  neighbourhood: string;
  address: string;
  city: string;
  province: string;
  lat: number | null;
  lng: number | null;
  stall: string | null;
  ratingAvg: number | null;
  reviewCount: number;
  days: number[];
  hours: Array<{ day: string; hours: string }>;
  openNow: boolean;
  inSeason: boolean;
  nextOpen: string;
  fellowVendors: VendorAtlasFellowStall[];
};

export type VendorAtlasPeer = {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  ratingAvg: number | null;
  reviewCount: number;
  badge: "Selling now" | "Later today" | "Selling this weekend" | "On the schedule";
  primaryCategoryId: string;
  primaryCategoryLabel: string;
  photoUrl: string | null;
  photoAlt: string | null;
  sharedMarketName: string | null;
  sharedMarketSlug: string | null;
  items: Array<{ name: string; priceCents: number | null; href: string }>;
  markets: Array<{
    name: string;
    slug: string;
    hours: Array<{ day: string; hours: string }>;
  }>;
};

export type VendorAtlasCategoryGuide = {
  id: string;
  label: string;
  href: string;
  photoUrl: string | null;
  photoAlt: string | null;
  itemCountOnMenu: number;
  findPages: Array<{
    term: string;
    slug: string;
    href: string;
    vendorsCount: number;
  }>;
};

export type VendorAtlasData = {
  nowMs: number;
  todayWeekday: number;
  vendor: {
    id: string;
    slug: string;
    name: string;
    about: string | null;
    summaryLine: string;
    logoUrl: string | null;
    ratingAvg: number | null;
    reviewCount: number;
    tags: string[];
    claimed: boolean;
    badge: "Selling now" | "Later today" | "Selling this weekend" | "On the schedule";
    openNow: boolean;
    sellingToday: boolean;
    nextSessionSummary: string | null;
    primaryCategoryId: string;
    primaryCategoryLabel: string;
    secondaryCategoryLabel: string | null;
    bannerPhoto: { url: string; alt: string } | null;
    contact: {
      phone: string | null;
      email: string | null;
      website: string | null;
      instagram: string | null;
      tiktok: string | null;
      facebook: string | null;
    };
  };
  menus: VendorAtlasMenuItem[];
  menuSections: string[];
  dietaryOptions: string[];
  categoryGuides: VendorAtlasCategoryGuide[];
  markets: VendorAtlasMarket[];
  similarVendors: VendorAtlasPeer[];
  feed: FloorItem[];
  geoMarkets: GeoMarket[];
  gateStalls: StallPick[];
};

const TAG_TO_CATEGORY: Record<string, string> = {
  bakery: "bread-and-bakery",
  bread: "bread-and-bakery",
  sweets: "pies-and-sweets",
  "prepared-food": "prepared-foods",
  produce: "vegetables",
  organic: "vegetables",
  fruit: "apples-and-fruit",
  meat: "meat-and-turkey",
  poultry: "meat-and-turkey",
  seafood: "seafood",
  eggs: "eggs",
  cheese: "cheese-and-dairy",
  dairy: "cheese-and-dairy",
  honey: "honey",
  maple: "maple",
  preserves: "preserves-and-sauces",
  coffee: "coffee-and-tea",
  tea: "coffee-and-tea",
};

function inferNeighbourhood(market: Pick<Market, "slug" | "city">): string {
  for (const area of FIND_AREAS) {
    if (area.slugs.includes(market.slug)) return area.label;
  }
  return market.city || "Toronto";
}

type SharedVendorAtlasContext = {
  expires: number;
  vendorById: Map<string, Vendor>;
  stallsByMarketId: Map<string, StallRef[]>;
  stallsByVendorId: Map<string, StallRef[]>;
  marketsById: Map<string, Market>;
  schedulesByMarketId: Map<string, MarketSchedule[]>;
  photos: typeof EMPTY_PRODUCT_PHOTOS;
};

let sharedContextMemory: SharedVendorAtlasContext | null = null;
let sharedContextTask: Promise<SharedVendorAtlasContext> | null = null;

function fallbackSharedContext(): SharedVendorAtlasContext {
  return {
    expires: 0,
    vendorById: new Map(),
    stallsByMarketId: new Map(),
    stallsByVendorId: new Map(),
    marketsById: new Map(),
    schedulesByMarketId: new Map(),
    photos: EMPTY_PRODUCT_PHOTOS,
  };
}

function categoryFromTags(name: string, tags: string[] | undefined) {
  for (const tag of vendorProductTags(name, tags)) {
    const category = TAG_TO_CATEGORY[tag];
    if (category) return category;
  }
  return null;
}

function sellingBadge(
  stalls: StallRef[],
  marketsById: Map<string, Market>,
  schedulesByMarketId: Map<string, MarketSchedule[]>,
  now: Date,
  todayWeekday: number,
): VendorAtlasPeer["badge"] {
  let openNow = false;
  let sellingToday = false;
  let onWeekend = false;
  for (const stall of stalls) {
    const market = marketsById.get(stall.market_id);
    if (!market) continue;
    const schedules = schedulesByMarketId.get(market.id) ?? [];
    if (stall.days.includes(todayWeekday) && isMarketOpen(schedules, market.province, now)) {
      openNow = true;
    }
    if (
      stall.days.includes(todayWeekday) &&
      sessionOnWeekday(schedules, todayWeekday, market.province, now) != null
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
 * Directory rows the stall page already needs.
 * The homepage atlas and a full menu-table scan do not belong on this path:
 * they ran until the function was killed, so the page was never cached.
 */
async function loadSharedVendorAtlasContext(): Promise<SharedVendorAtlasContext> {
  const [allVendors, allStalls, markets, schedules, photos] = await Promise.all([
    listVendors(),
    listStalls(),
    listMarkets(),
    listSchedules(),
    listProductPhotos().catch(() => EMPTY_PRODUCT_PHOTOS),
  ]);

  const vendorById = new Map(allVendors.map((vendor) => [vendor.id, vendor]));
  const stallsByMarketId = new Map<string, StallRef[]>();
  const stallsByVendorId = new Map<string, StallRef[]>();
  for (const stall of allStalls) {
    const atMarket = stallsByMarketId.get(stall.market_id) ?? [];
    atMarket.push(stall);
    stallsByMarketId.set(stall.market_id, atMarket);
    const forVendor = stallsByVendorId.get(stall.id) ?? [];
    forVendor.push(stall);
    stallsByVendorId.set(stall.id, forVendor);
  }
  const schedulesByMarketId = new Map<string, MarketSchedule[]>();
  for (const row of schedules) {
    const list = schedulesByMarketId.get(row.market_id) ?? [];
    list.push(row);
    schedulesByMarketId.set(row.market_id, list);
  }

  return {
    expires: Date.now() + DIRECTORY_REVALIDATE_SECONDS * 1000,
    vendorById,
    stallsByMarketId,
    stallsByVendorId,
    marketsById: new Map(markets.map((market) => [market.id, market])),
    schedulesByMarketId,
    photos,
  };
}

async function getSharedVendorAtlasContext(): Promise<SharedVendorAtlasContext> {
  if (sharedContextMemory && sharedContextMemory.expires > Date.now()) {
    return sharedContextMemory;
  }
  if (!sharedContextTask) {
    sharedContextTask = loadSharedVendorAtlasContext()
      .then((ctx) => {
        sharedContextMemory = ctx;
        return ctx;
      })
      .catch(() => fallbackSharedContext())
      .finally(() => {
        sharedContextTask = null;
      });
  }
  return sharedContextTask;
}

export async function buildVendorAtlasData({
  vendor: resolvedVendor,
  contact,
  claimed,
  nowMs,
}: {
  vendor: VendorDetail;
  contact: ListingContactFields;
  claimed: boolean;
  nowMs: number;
}): Promise<VendorAtlasData> {
  const ctx = await getSharedVendorAtlasContext();

  const {
    vendorById,
    stallsByMarketId,
    stallsByVendorId,
    marketsById,
    schedulesByMarketId,
    photos,
  } = ctx;
  const now = new Date(nowMs);
  const todayWeekday = weekdayInToronto(now);

  // Determine fallback categories from vendor tags and name
  const vendorTags = vendorProductTags(resolvedVendor.name, resolvedVendor.tags);
  const tagCategories = [
    ...new Set(vendorTags.map((t) => TAG_TO_CATEGORY[t]).filter((c): c is string => Boolean(c))),
  ];
  const fallbackVendorCategory = tagCategories[0] ?? "vegetables";

  const liveSalesEnabled = VENDOR_SALES_OPEN && stripeChargesConfigured();

  // Enrich menu items with category, find-page comparison links, and live selling state
  const menus: VendorAtlasMenuItem[] = resolvedVendor.menus.map((item) => {
    const rawCategory = item.product_category ?? null;
    const rawSlug = item.product_slug ?? null;
    const matchedFindPage = matchFindPageByName(item.name, rawSlug);

    const productCategory =
      rawCategory ?? matchedFindPage?.category ?? fallbackVendorCategory;
    const productCategoryLabel =
      menuCategoryLabel(productCategory) ??
      FIND_CATEGORIES.find((c) => c.id === productCategory)?.label ??
      "Market goods";

    const productSlug = rawSlug ?? matchedFindPage?.matchSlugs[0] ?? null;
    const compareHref = matchedFindPage
      ? `/find/${matchedFindPage.slug}`
      : `/products?aisle=${encodeURIComponent(productCategory)}&q=${encodeURIComponent(item.name.split("(")[0]?.trim() || item.name)}`;
    const compareLabel = matchedFindPage
      ? stallCompareLabel(matchedFindPage.vendors, matchedFindPage.term)
      : `Compare in ${productCategoryLabel.toLowerCase()}`;
    const compareVendorsCount = matchedFindPage?.vendors ?? null;

    const priceCents = visiblePriceCents(productCategory, item.price_cents);
    const canBuy = Boolean(liveSalesEnabled && item.can_buy && priceCents != null);
    const pickup = Boolean(item.offer_pickup);
    const preorder = Boolean(item.offer_preorder);
    const delivery = Boolean(item.offer_delivery);

    const namedSection = item.menu_section?.trim() || null;
    const section = namedSection || productCategoryLabel;
    const sectionOrder = namedSection
      ? typeof item.menu_section_order === "number"
        ? item.menu_section_order
        : null
      : null;

    return {
      id: item.id,
      name: item.name,
      description: item.description ?? null,
      section,
      sectionOrder,
      season: item.season ?? null,
      dietary: item.dietary ?? [],
      imageUrl: item.image_url ?? null,
      productCategory,
      productCategoryLabel,
      productSlug,
      compareHref,
      compareLabel,
      compareVendorsCount,
      categoryHref: `/products?aisle=${encodeURIComponent(productCategory)}`,
      priceCents,
      canBuy,
      pickup,
      preorder,
      delivery,
      terms: item.offer_terms ?? null,
    };
  });

  const menuSections = orderedSectionNames(
    menus.map((item) => ({ name: item.section, order: item.sectionOrder })),
  );

  const dietaryOptions = [
    ...new Set(menus.flatMap((item) => item.dietary.map((d) => d.trim())).filter(Boolean)),
  ];

  // Build category counts from menu items or vendor specialty tags
  const categoryCounts = new Map<string, number>();
  for (const item of menus) {
    categoryCounts.set(
      item.productCategory,
      (categoryCounts.get(item.productCategory) ?? 0) + 1,
    );
  }
  if (categoryCounts.size === 0) {
    if (tagCategories.length > 0) {
      for (const cat of tagCategories.slice(0, 3)) {
        categoryCounts.set(cat, 0);
      }
    } else {
      categoryCounts.set(fallbackVendorCategory, 0);
    }
  }

  const sortedCategoryEntries = [...categoryCounts.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
  );
  const primaryCategoryId = sortedCategoryEntries[0]?.[0] ?? fallbackVendorCategory;
  const primaryCategoryLabel =
    menuCategoryLabel(primaryCategoryId) ??
    FIND_CATEGORIES.find((c) => c.id === primaryCategoryId)?.label ??
    "Market stall";

  const secondaryEntry = sortedCategoryEntries.find(([id]) => id !== primaryCategoryId);
  const secondaryCategoryLabel = secondaryEntry
    ? (menuCategoryLabel(secondaryEntry[0]) ??
      FIND_CATEGORIES.find((c) => c.id === secondaryEntry[0])?.label ??
      null)
    : null;

  const orderedCategoryEntries = [
    ...sortedCategoryEntries.filter(([id]) => id === primaryCategoryId),
    ...sortedCategoryEntries.filter(([id]) => id !== primaryCategoryId),
  ];

  const firstProductSlug =
    menus.find((m) => m.productCategory === primaryCategoryId && m.productSlug)?.productSlug ??
    menus.find((m) => m.productSlug)?.productSlug ??
    FIND_PAGES.find((p) => p.category === primaryCategoryId && p.vendors > 0)?.slug ??
    null;
  const bannerPhotoObj = firstProductSlug
    ? productPhoto(photos, firstProductSlug, primaryCategoryId)
    : (photos.aisle[primaryCategoryId] ?? null);

  const categoryGuides: VendorAtlasCategoryGuide[] = orderedCategoryEntries.map(
    ([categoryId, count]) => {
      const label =
        menuCategoryLabel(categoryId) ??
        FIND_CATEGORIES.find((c) => c.id === categoryId)?.label ??
        "Product category";
      const matchingPages = FIND_PAGES.filter(
        (p) => p.category === categoryId && p.vendors > 0,
      ).slice(0, 6);
      const catPhoto =
        photos.aisle[categoryId] ??
        (matchingPages[0] ? productPhoto(photos, matchingPages[0].slug, categoryId) : null);

      return {
        id: categoryId,
        label,
        href: `/products?aisle=${encodeURIComponent(categoryId)}`,
        photoUrl: catPhoto?.url ?? null,
        photoAlt: catPhoto?.alt ?? label,
        itemCountOnMenu: count,
        findPages: matchingPages.map((p) => ({
          term: p.term.replace(/^General\s+/i, ""),
          slug: p.slug,
          href: `/find/${p.slug}`,
          vendorsCount: p.vendors,
        })),
      };
    },
  );

  // Build ranked markets with fellow stalls at each market location
  const rankedMarkets = rankVendorMarkets(resolvedVendor.markets, now);
  const markets: VendorAtlasMarket[] = rankedMarkets.map((market) => {
    const hours = hallDayHours(market.days, market.schedules, market.province, now);
    const openNow =
      market.days.includes(todayWeekday) &&
      isMarketOpen(market.schedules, market.province, now);
    const inSeason = vendorMarketInSeason(market, now);
    const nextOpen = market.schedules.length
      ? nextOpenLabel(market.schedules, market.province, now)
      : openNow
        ? "Open now"
        : "Schedule posted";

    const rawFellows = (stallsByMarketId.get(market.id) ?? []).filter(
      (st) => st.id !== resolvedVendor.id,
    );
    const fellowVendors: VendorAtlasFellowStall[] = rawFellows
      .map((st) => {
        const v = vendorById.get(st.id);
        const catId = categoryFromTags(st.name, v?.tags) ?? "vegetables";
        const categoryLabel = menuCategoryLabel(catId) ?? "Market stall";
        const specialty = categoryLabel;
        return {
          slug: st.slug,
          name: st.name,
          logoUrl: listingMarkSrc(v?.logo_url),
          specialty,
          categoryLabel,
          ratingAvg: v?.rating_avg ?? null,
          reviewCount: v?.review_count ?? 0,
          stall: st.stall,
        };
      })
      .sort(
        (a, b) =>
          Number(Boolean(b.logoUrl)) - Number(Boolean(a.logoUrl)) ||
          (b.reviewCount ?? 0) - (a.reviewCount ?? 0) ||
          a.name.localeCompare(b.name),
      )
      .slice(0, 6);

    return {
      id: market.id,
      slug: market.slug,
      name: market.name,
      logoUrl: listingMarkSrc(market.logo_url),
      neighbourhood: inferNeighbourhood(market),
      address: market.address,
      city: market.city,
      province: market.province,
      lat: market.lat,
      lng: market.lng,
      stall: market.stall,
      ratingAvg: market.rating_avg ?? null,
      reviewCount: market.review_count ?? 0,
      days: market.days,
      hours,
      openNow,
      inSeason,
      nextOpen,
      fellowVendors,
    };
  });

  const openNow = markets.some((m) => m.openNow);
  const sellingToday = markets.some(
    (m) =>
      m.days.includes(todayWeekday) &&
      sessionOnWeekday(
        resolvedVendor.markets.find((rm) => rm.id === m.id)?.schedules ?? [],
        todayWeekday,
        m.province,
        now,
      ) != null,
  );
  const onWeekend = markets.some((m) =>
    m.hours.some((h) => h.day === "Sat" || h.day === "Sun"),
  );
  const badge: VendorAtlasData["vendor"]["badge"] = openNow
    ? "Selling now"
    : sellingToday
      ? "Later today"
      : onWeekend
        ? "Selling this weekend"
        : "On the schedule";

  const firstActiveMarket = markets.find((m) => m.hours.length > 0) ?? markets[0];
  const nextSessionSummary = firstActiveMarket
    ? firstActiveMarket.hours[0]
      ? `${firstActiveMarket.name} · ${firstActiveMarket.hours[0].day} ${firstActiveMarket.hours[0].hours}`
      : `${firstActiveMarket.name} · ${firstActiveMarket.nextOpen}`
    : null;

  // Similar stalls in the same product category
  const vendorMarketSlugSet = new Set(markets.map((m) => m.slug));

  const peerPhoto = photos.aisle[primaryCategoryId] ?? null;
  const peerLabel = menuCategoryLabel(primaryCategoryId) ?? primaryCategoryLabel;
  const rankedPeers = [...vendorById.values()]
    .flatMap((vendor) => {
      if (vendor.slug === resolvedVendor.slug) return [];
      if (categoryFromTags(vendor.name, vendor.tags) !== primaryCategoryId) return [];
      const stalls = stallsByVendorId.get(vendor.id);
      if (!stalls?.length) return [];
      const shared = stalls.find((stall) => {
        const market = marketsById.get(stall.market_id);
        return market ? vendorMarketSlugSet.has(market.slug) : false;
      });
      return [{ vendor, stalls, shared: Boolean(shared) }];
    })
    .sort(
      (a, b) =>
        Number(b.shared) - Number(a.shared) ||
        (b.vendor.review_count ?? 0) - (a.vendor.review_count ?? 0) ||
        a.vendor.name.localeCompare(b.vendor.name, "en-CA"),
    )
    .slice(0, 6);
  const similarVendors: VendorAtlasPeer[] = rankedPeers.map(({ vendor, stalls }) => {
    const sharedStall = stalls.find((stall) => {
      const market = marketsById.get(stall.market_id);
      return market ? vendorMarketSlugSet.has(market.slug) : false;
    });
    const sharedMarket = sharedStall ? marketsById.get(sharedStall.market_id) : undefined;
    const peerMarkets = stalls.flatMap((stall) => {
      const market = marketsById.get(stall.market_id);
      if (!market) return [];
      return [
        {
          name: market.name,
          slug: market.slug,
          hours: hallDayHours(
            stall.days,
            schedulesByMarketId.get(market.id) ?? [],
            market.province,
            now,
          ),
        },
      ];
    });
    return {
      id: vendor.id,
      slug: vendor.slug,
      name: vendor.name,
      logoUrl: listingMarkSrc(vendor.logo_url),
      ratingAvg: vendor.rating_avg ?? null,
      reviewCount: vendor.review_count ?? 0,
      badge: sellingBadge(stalls, marketsById, schedulesByMarketId, now, todayWeekday),
      primaryCategoryId,
      primaryCategoryLabel: peerLabel,
      photoUrl: peerPhoto?.url ?? null,
      photoAlt: peerPhoto?.alt ?? peerLabel,
      sharedMarketName: sharedMarket?.name ?? null,
      sharedMarketSlug: sharedMarket?.slug ?? null,
      items: [],
      markets: peerMarkets.slice(0, 2),
    };
  });

  const summaryLine =
    resolvedVendor.about?.trim() ||
    (markets.length > 0
      ? `${resolvedVendor.name} brings ${primaryCategoryLabel.toLowerCase()} and seasonal market goods to ${markets
          .map((m) => m.name)
          .slice(0, 2)
          .join(" and ")}${markets.length > 2 ? `, and ${markets.length - 2} other Ontario farmers' ${markets.length - 2 === 1 ? "market" : "markets"}` : ""}.`
      : `${resolvedVendor.name} is a Toronto & Ontario farmers' market stall known for ${primaryCategoryLabel.toLowerCase()}.`);

  return {
    nowMs,
    todayWeekday,
    vendor: {
      id: resolvedVendor.id,
      slug: resolvedVendor.slug,
      name: resolvedVendor.name,
      about: resolvedVendor.about,
      summaryLine,
      logoUrl: listingMarkSrc(resolvedVendor.logo_url),
      ratingAvg: resolvedVendor.rating_avg ?? null,
      reviewCount: resolvedVendor.review_count ?? 0,
      tags: sortTagsForDisplay(resolvedVendor.tags),
      claimed,
      badge,
      openNow,
      sellingToday,
      nextSessionSummary,
      primaryCategoryId,
      primaryCategoryLabel,
      secondaryCategoryLabel,
      bannerPhoto: bannerPhotoObj
        ? { url: bannerPhotoObj.url, alt: bannerPhotoObj.alt }
        : null,
      contact: {
        phone: contact.phone,
        email: contact.email,
        website: resolvedVendor.website,
        instagram: resolvedVendor.instagram,
        tiktok: resolvedVendor.tiktok,
        facebook: resolvedVendor.facebook,
      },
    },
    menus,
    menuSections,
    dietaryOptions,
    categoryGuides,
    markets,
    similarVendors,
    feed: resolvedVendor.feed,
    geoMarkets: resolvedVendor.markets.map(toGeoMarket),
    gateStalls: resolvedVendor.markets.map((market) => ({
      id: resolvedVendor.id,
      name: resolvedVendor.name,
      slug: resolvedVendor.slug,
      market_id: market.id,
      stall: market.stall,
    })),
  };
}

export async function loadVendorAtlasData(slug: string, nowMs = Date.now()): Promise<VendorAtlasData | null> {
  const [vendor, contact] = await Promise.all([
    getVendorBySlug(slug),
    getListingContact("vendor", slug),
  ]);
  if (!vendor) return null;
  const claimed = await listingIsClaimed("vendor", vendor.id).catch(() => false);
  return buildVendorAtlasData({ vendor, contact, claimed, nowMs });
}
