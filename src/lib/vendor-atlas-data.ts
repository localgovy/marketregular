import "server-only";

import {
  getListingContact,
  getVendorBySlug,
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
import { loadHomeAtlasData, type HomeAtlasData, type HomeAtlasVendorSpotlight } from "@/lib/home-atlas-data";
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
import { createServiceClient } from "@/lib/supabase/admin";
import { rankVendorMarkets, vendorMarketInSeason } from "@/lib/vendor-markets";
import {
  matchFindPageByName,
  orderedSectionNames,
  stallCompareLabel,
} from "@/lib/vendor-atlas-match";
import { vendorProductTags } from "@/lib/vendor-tags";
import type { FloorItem, Market, StallPick, StallRef, Vendor, VendorDetail } from "@/types/database";

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
    nextSessionSummary: string;
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

type MenuCategoryMeta = { product_category: string | null; product_slug: string | null };

/** One pass for every stall page, instead of a category query per vendor. */
async function fetchAllMenuCategoryMetadata(): Promise<Map<string, MenuCategoryMeta>> {
  const out = new Map<string, MenuCategoryMeta>();
  try {
    const supabase = createServiceClient();
    if (!supabase) return out;
    const pageSize = 1000;
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await supabase
        .from("published_menus")
        .select("id, product_category, product_slug")
        .range(from, from + pageSize - 1);
      if (error || !data) return out;
      for (const row of data as Array<{ id: string } & MenuCategoryMeta>) {
        if (!row.id) continue;
        out.set(row.id, {
          product_category: row.product_category ?? null,
          product_slug: row.product_slug ?? null,
        });
      }
      if (data.length < pageSize) break;
    }
  } catch {
    // Name matching still classifies the menu when this column is unavailable.
  }
  return out;
}

type SharedVendorAtlasContext = {
  expires: number;
  atlasData: Pick<HomeAtlasData, "vendorSpotlights">;
  vendorById: Map<string, Vendor>;
  spotlightBySlug: Map<string, HomeAtlasVendorSpotlight>;
  stallsByMarketId: Map<string, StallRef[]>;
  photos: typeof EMPTY_PRODUCT_PHOTOS;
  menuCategoryById: Map<string, MenuCategoryMeta>;
};

let sharedContextMemory: SharedVendorAtlasContext | null = null;
let sharedContextTask: Promise<SharedVendorAtlasContext> | null = null;

function fallbackSharedContext(): SharedVendorAtlasContext {
  return {
    expires: 0,
    atlasData: { vendorSpotlights: [] },
    vendorById: new Map(),
    spotlightBySlug: new Map(),
    stallsByMarketId: new Map(),
    photos: EMPTY_PRODUCT_PHOTOS,
    menuCategoryById: new Map(),
  };
}

async function loadSharedVendorAtlasContext(): Promise<SharedVendorAtlasContext> {
  const [atlasData, allVendors, allStalls, photos, menuCategoryById] = await Promise.all([
    loadHomeAtlasData(),
    listVendors(),
    listStalls(),
    listProductPhotos().catch(() => EMPTY_PRODUCT_PHOTOS),
    fetchAllMenuCategoryMetadata(),
  ]);

  const vendorById = new Map(allVendors.map((v) => [v.id, v]));
  const spotlightBySlug = new Map(atlasData.vendorSpotlights.map((s) => [s.slug, s]));
  const stallsByMarketId = new Map<string, StallRef[]>();
  for (const stall of allStalls) {
    const list = stallsByMarketId.get(stall.market_id) ?? [];
    list.push(stall);
    stallsByMarketId.set(stall.market_id, list);
  }

  return {
    expires: Date.now() + DIRECTORY_REVALIDATE_SECONDS * 1000,
    atlasData: { vendorSpotlights: atlasData.vendorSpotlights },
    vendorById,
    spotlightBySlug,
    stallsByMarketId,
    photos,
    menuCategoryById,
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

  const { atlasData, vendorById, spotlightBySlug, stallsByMarketId, photos, menuCategoryById: menuCategoryMap } = ctx;
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
    const dbMeta = menuCategoryMap.get(item.id);
    const rawCategory = dbMeta?.product_category ?? item.product_category ?? null;
    const rawSlug = dbMeta?.product_slug ?? item.product_slug ?? null;
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
        const spot = spotlightBySlug.get(st.slug);
        const tags = vendorProductTags(st.name, v?.tags);
        const catId =
          spot?.aisleIds[0] ?? tags.map((t) => TAG_TO_CATEGORY[t]).find(Boolean) ?? "vegetables";
        const categoryLabel =
          spot?.primaryAisleLabel ??
          menuCategoryLabel(catId) ??
          "Market stall";
        const specialty = spot?.items[0]?.name ?? categoryLabel;
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
    : "Toronto farmers' markets";

  // Similar stalls in the same product category
  const vendorMarketSlugSet = new Set(markets.map((m) => m.slug));

  const rankedPeers = [...atlasData.vendorSpotlights].sort((a, b) => {
    const aShared = a.markets.some((m) => vendorMarketSlugSet.has(m.slug)) ? 1 : 0;
    const bShared = b.markets.some((m) => vendorMarketSlugSet.has(m.slug)) ? 1 : 0;
    return bShared - aShared || (b.reviewCount ?? 0) - (a.reviewCount ?? 0) || a.name.localeCompare(b.name);
  });
  const primaryPeers = rankedPeers.filter(
    (spot) => spot.slug !== resolvedVendor.slug && spot.aisleIds.includes(primaryCategoryId),
  );
  const similarVendors: VendorAtlasPeer[] = primaryPeers.slice(0, 6).map((spot) => {
    const shared = spot.markets.find((m) => vendorMarketSlugSet.has(m.slug)) ?? null;
    return {
      id: spot.id,
      slug: spot.slug,
      name: spot.name,
      logoUrl: spot.logoUrl,
      ratingAvg: spot.ratingAvg,
      reviewCount: spot.reviewCount,
      badge: spot.badge,
      primaryCategoryId: spot.aisleIds[0] ?? primaryCategoryId,
      primaryCategoryLabel: spot.primaryAisleLabel,
      photoUrl: spot.photoUrl,
      photoAlt: spot.photoAlt,
      sharedMarketName: shared?.name ?? null,
      sharedMarketSlug: shared?.slug ?? null,
      items: spot.items.map((i) => ({
        name: i.name,
        priceCents: i.priceCents,
        href: i.href,
      })),
      markets: spot.markets.slice(0, 2).map((m) => ({
        name: m.name,
        slug: m.slug,
        hours: m.hours,
      })),
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
