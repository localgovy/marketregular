import "server-only";

import {
  getListingContact,
  getVendorBySlug,
  listStalls,
  listVendors,
} from "@/lib/data/catalog";
import { EMPTY_PRODUCT_PHOTOS, listProductPhotos, productPhoto } from "@/lib/data/product-photos";
import { menuCategoryLabel } from "@/lib/data/product-search";
import {
  FIND_CATEGORIES,
  FIND_PAGES,
  findPageForProductSlug,
  type FindPage,
} from "@/data/find-pages";
import { FIND_AREAS, sortTagsForDisplay, weekdayInToronto } from "@/lib/find-paths";
import { listingMarkSrc } from "@/lib/format";
import { toGeoMarket, type GeoMarket } from "@/lib/geo";
import { loadHomeAtlasData } from "@/lib/home-atlas-data";
import { listingIsClaimed } from "@/lib/listing-claimed";
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
import { vendorProductTags } from "@/lib/vendor-tags";
import type { FloorItem, Market, StallPick } from "@/types/database";

export type SampleVendorOption = {
  slug: string;
  name: string;
  label: string;
  logoUrl: string | null;
  itemCount: number;
  marketCount: number;
};

export type VendorPreviewMenuItem = {
  id: string;
  name: string;
  description: string | null;
  section: string;
  sectionOrder: number;
  season: string | null;
  dietary: string[];
  imageUrl: string | null;
  productCategory: string;
  productCategoryLabel: string;
  productSlug: string | null;
  compareHref: string;
  compareLabel: string;
  compareVendorsCount: number | null;
  aisleHref: string;
  livePriceCents: number | null;
  liveCanBuy: boolean;
  livePickup: boolean;
  livePreorder: boolean;
  liveDelivery: boolean;
  liveTerms: string | null;
  activePriceCents: number;
  activeCanBuy: boolean;
  activePickup: boolean;
  activePreorder: boolean;
  activeDelivery: boolean;
  activeTerms: string;
};

export type VendorPreviewFellowStall = {
  slug: string;
  name: string;
  logoUrl: string | null;
  specialty: string;
  aisleLabel: string;
  ratingAvg: number | null;
  reviewCount: number;
  stall: string | null;
};

export type VendorPreviewMarket = {
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
  fellowVendors: VendorPreviewFellowStall[];
};

export type VendorPreviewPeer = {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  ratingAvg: number | null;
  reviewCount: number;
  badge: "Selling now" | "Later today" | "Selling this weekend" | "On the schedule";
  primaryAisleId: string;
  primaryAisleLabel: string;
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

export type VendorPreviewAisleGuide = {
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

export type VendorPreviewData = {
  nowMs: number;
  todayWeekday: number;
  sampleVendors: SampleVendorOption[];
  vendor: {
    id: string;
    slug: string;
    name: string;
    about: string | null;
    logoUrl: string | null;
    ratingAvg: number | null;
    reviewCount: number;
    tags: string[];
    claimed: boolean;
    badge: "Selling now" | "Later today" | "Selling this weekend" | "On the schedule";
    openNow: boolean;
    sellingToday: boolean;
    nextSessionSummary: string;
    primaryAisleId: string;
    primaryAisleLabel: string;
    secondaryAisleLabel: string | null;
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
  menus: VendorPreviewMenuItem[];
  menuSections: string[];
  dietaryOptions: string[];
  aisleGuides: VendorPreviewAisleGuide[];
  markets: VendorPreviewMarket[];
  similarAisleVendors: VendorPreviewPeer[];
  coMarketVendors: VendorPreviewPeer[];
  feed: FloorItem[];
  geoMarkets: GeoMarket[];
  gateStalls: StallPick[];
};

const CURATED_SAMPLE_VENDOR_SLUGS: Array<{ slug: string; label: string }> = [
  { slug: "chocosol-traders", label: "Coffee & Bean-to-Bar" },
  { slug: "thames-river-melons", label: "Orchard, Produce & Pies" },
  { slug: "romagnoli-farms", label: "Bakery & Farm Goods" },
  { slug: "magic-oven", label: "Breads & Savoury Bakes" },
  { slug: "british-baked-goods", label: "Traditional Bakery" },
  { slug: "coopers-csa-farm", label: "Pasture Eggs & Meats" },
];

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

function fallbackPriceCents(name: string, index: number): number {
  const lower = name.toLowerCase();
  if (lower.includes("pie") && !lower.includes("pocket")) return 2200;
  if (lower.includes("coffee") || lower.includes("espresso") || lower.includes("roast")) return 1800;
  if (lower.includes("honey") || lower.includes("maple")) return 1600;
  if (lower.includes("cheese")) return 1400;
  if (lower.includes("chicken") || lower.includes("sausage") || lower.includes("meat")) return 1900;
  if (lower.includes("bread") || lower.includes("sourdough") || lower.includes("loaf")) return 950;
  if (lower.includes("tart") || lower.includes("cookie") || lower.includes("croissant")) return 1200;
  if (lower.includes("egg")) return 900;
  const steps = [850, 1100, 1400, 1650, 1250, 950];
  return steps[index % steps.length] ?? 1200;
}

function matchFindPageByName(
  itemName: string,
  productSlug: string | null,
): FindPage | null {
  const bySlug = findPageForProductSlug(productSlug);
  if (bySlug && bySlug.vendors > 0) return bySlug;

  const lower = itemName.toLowerCase();
  for (const page of FIND_PAGES) {
    if (page.vendors <= 0) continue;
    const termLower = page.term.toLowerCase().replace(/^general\s+/, "");
    const regex = new RegExp(`\\b${termLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (termLower.length >= 3 && regex.test(lower)) {
      return page;
    }
    for (const ms of page.matchSlugs) {
      const words = ms.replace(/-/g, " ");
      const msRegex = new RegExp(`\\b${words.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      if (words.length >= 3 && msRegex.test(lower)) {
        return page;
      }
    }
  }

  return null;
}

async function fetchMenuCategoryMetadata(
  vendorId: string,
): Promise<Map<string, { product_category: string | null; product_slug: string | null }>> {
  const out = new Map<string, { product_category: string | null; product_slug: string | null }>();
  try {
    const supabase = createServiceClient();
    if (!supabase) return out;
    const { data, error } = await supabase
      .from("published_menus")
      .select("id, product_category, product_slug")
      .eq("vendor_id", vendorId);
    if (error || !data) return out;
    for (const row of data as Array<{
      id: string;
      product_category: string | null;
      product_slug: string | null;
    }>) {
      if (row.id) {
        out.set(row.id, {
          product_category: row.product_category ?? null,
          product_slug: row.product_slug ?? null,
        });
      }
    }
  } catch {
    // Ignore and fall back to name/tag inference
  }
  return out;
}

export async function loadVendorPreviewData(requestedSlug?: string): Promise<VendorPreviewData> {
  const [atlasData, allVendors, allStalls, photos] = await Promise.all([
    loadHomeAtlasData(),
    listVendors(),
    listStalls(),
    listProductPhotos().catch(() => EMPTY_PRODUCT_PHOTOS),
  ]);

  const defaultSlug =
    requestedSlug && allVendors.some((v) => v.slug === requestedSlug)
      ? requestedSlug
      : CURATED_SAMPLE_VENDOR_SLUGS.find((s) => allVendors.some((v) => v.slug === s.slug))?.slug ??
        atlasData.vendorSpotlights[0]?.slug ??
        allVendors[0]?.slug ??
        "chocosol-traders";

  const [vendorDetail, contact, menuCategoryMap] = await Promise.all([
    getVendorBySlug(defaultSlug),
    getListingContact("vendor", defaultSlug),
    (async () => {
      const target = allVendors.find((v) => v.slug === defaultSlug);
      return target ? fetchMenuCategoryMetadata(target.id) : new Map();
    })(),
  ]);

  const fallbackVendorSlug =
    vendorDetail?.slug ?? atlasData.vendorSpotlights[0]?.slug ?? allVendors[0]!.slug;
  const resolvedVendor =
    vendorDetail ?? (await getVendorBySlug(fallbackVendorSlug))!;
  const claimed = await listingIsClaimed("vendor", resolvedVendor.id).catch(() => false);

  const now = new Date();
  const nowMs = now.getTime();
  const todayWeekday = weekdayInToronto(now);

  // Build sample vendor switcher options
  const stallCountByVendorId = new Map<string, number>();
  for (const s of allStalls) {
    stallCountByVendorId.set(s.id, (stallCountByVendorId.get(s.id) ?? 0) + 1);
  }

  const sampleVendors: SampleVendorOption[] = [];
  const addedSlugs = new Set<string>();

  for (const entry of CURATED_SAMPLE_VENDOR_SLUGS) {
    const v = allVendors.find((row) => row.slug === entry.slug);
    if (!v) continue;
    const spot = atlasData.vendorSpotlights.find((s) => s.slug === entry.slug);
    sampleVendors.push({
      slug: v.slug,
      name: v.name,
      label: entry.label,
      logoUrl: listingMarkSrc(v.logo_url),
      itemCount: spot?.items.length ?? 3,
      marketCount: stallCountByVendorId.get(v.id) ?? 1,
    });
    addedSlugs.add(v.slug);
  }

  if (!addedSlugs.has(resolvedVendor.slug)) {
    sampleVendors.unshift({
      slug: resolvedVendor.slug,
      name: resolvedVendor.name,
      label: "Selected stall",
      logoUrl: listingMarkSrc(resolvedVendor.logo_url),
      itemCount: resolvedVendor.menus.length,
      marketCount: resolvedVendor.markets.length,
    });
  }

  // Determine fallback category from vendor tags
  const vendorTags = vendorProductTags(resolvedVendor.name, resolvedVendor.tags);
  const fallbackVendorCategory =
    vendorTags.map((t) => TAG_TO_CATEGORY[t]).find(Boolean) ?? "bread-and-bakery";

  const liveSalesEnabled = VENDOR_SALES_OPEN && stripeChargesConfigured();

  // Enrich menu items with category, find-page comparison links, and active selling state
  const menus: VendorPreviewMenuItem[] = resolvedVendor.menus.map((item, index) => {
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
      ? `Compare ${matchedFindPage.vendors} ${matchedFindPage.term.replace(/^General\s+/i, "").toLowerCase()} stalls`
      : `Compare in ${productCategoryLabel.toLowerCase()}`;
    const compareVendorsCount = matchedFindPage?.vendors ?? null;

    const livePriceCents = visiblePriceCents(productCategory, item.price_cents);
    const liveCanBuy = Boolean(liveSalesEnabled && item.can_buy && livePriceCents != null);
    const livePickup = Boolean(item.offer_pickup);
    const livePreorder = Boolean(item.offer_preorder);
    const liveDelivery = Boolean(item.offer_delivery);

    const activePriceCents = livePriceCents ?? fallbackPriceCents(item.name, index);
    const section = item.menu_section?.trim() || productCategoryLabel;
    const sectionOrder = item.menu_section_order ?? index;

    return {
      id: item.id,
      name: item.name,
      description: item.description ?? null,
      section,
      sectionOrder,
      season: item.season ?? "In season",
      dietary: item.dietary ?? [],
      imageUrl: item.image_url ?? null,
      productCategory,
      productCategoryLabel,
      productSlug,
      compareHref,
      compareLabel,
      compareVendorsCount,
      aisleHref: `/products?aisle=${encodeURIComponent(productCategory)}`,
      livePriceCents,
      liveCanBuy,
      livePickup,
      livePreorder,
      liveDelivery,
      liveTerms: item.offer_terms ?? null,
      activePriceCents,
      activeCanBuy: true,
      activePickup: true,
      activePreorder: true,
      activeDelivery: index % 2 === 0,
      activeTerms:
        item.offer_terms ??
        "Reserve ahead for market-day stall pickup, or choose local Toronto delivery.",
    };
  });

  // Distinct menu sections in display order
  const sectionOrderMap = new Map<string, number>();
  for (const item of menus) {
    if (!sectionOrderMap.has(item.section)) {
      sectionOrderMap.set(item.section, item.sectionOrder);
    }
  }
  const menuSections = [...sectionOrderMap.entries()]
    .sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))
    .map(([name]) => name);

  const dietaryOptions = [
    ...new Set(menus.flatMap((item) => item.dietary.map((d) => d.trim())).filter(Boolean)),
  ];

  // Build Aisle Guides for all categories present on the vendor's menu (or fallback category)
  const aisleCounts = new Map<string, number>();
  for (const item of menus) {
    aisleCounts.set(item.productCategory, (aisleCounts.get(item.productCategory) ?? 0) + 1);
  }
  if (aisleCounts.size === 0) {
    aisleCounts.set(fallbackVendorCategory, 1);
  }

  const sortedAisleEntries = [...aisleCounts.entries()].sort((a, b) => b[1] - a[1]);
  const vendorNameLower = resolvedVendor.name.toLowerCase();
  const preferredPrimaryEntry =
    sortedAisleEntries.find(([id]) => {
      if (
        (vendorNameLower.includes("coffee") || vendorNameLower.includes("chocosol")) &&
        id === "coffee-and-tea"
      ) {
        return true;
      }
      if (vendorNameLower.includes("melon") && id === "apples-and-fruit") {
        return true;
      }
      return false;
    }) ?? sortedAisleEntries[0];

  const primaryAisleId = preferredPrimaryEntry?.[0] ?? fallbackVendorCategory;
  const primaryAisleLabel =
    menuCategoryLabel(primaryAisleId) ??
    FIND_CATEGORIES.find((c) => c.id === primaryAisleId)?.label ??
    "Market stall";

  const secondaryEntry = sortedAisleEntries.find(([id]) => id !== primaryAisleId);
  const secondaryAisleLabel = secondaryEntry
    ? (menuCategoryLabel(secondaryEntry[0]) ??
      FIND_CATEGORIES.find((c) => c.id === secondaryEntry[0])?.label ??
      null)
    : null;

  // Put the primary aisle first in aisleGuides
  const orderedAisleEntries = [
    ...(preferredPrimaryEntry ? [preferredPrimaryEntry] : []),
    ...sortedAisleEntries.filter(([id]) => id !== primaryAisleId),
  ];

  const firstProductSlug =
    menus.find((m) => m.productCategory === primaryAisleId && m.productSlug)?.productSlug ??
    menus.find((m) => m.productSlug)?.productSlug ??
    null;
  const bannerPhotoObj = firstProductSlug
    ? productPhoto(photos, firstProductSlug, primaryAisleId)
    : (photos.aisle[primaryAisleId] ?? null);

  const aisleGuides: VendorPreviewAisleGuide[] = orderedAisleEntries.map(([aisleId, count]) => {
    const label =
      menuCategoryLabel(aisleId) ??
      FIND_CATEGORIES.find((c) => c.id === aisleId)?.label ??
      "Product category";
    const matchingPages = FIND_PAGES.filter((p) => p.category === aisleId && p.vendors > 0).slice(
      0,
      6,
    );
    const aislePhoto =
      photos.aisle[aisleId] ??
      (matchingPages[0] ? productPhoto(photos, matchingPages[0].slug, aisleId) : null);

    return {
      id: aisleId,
      label,
      href: `/products?aisle=${encodeURIComponent(aisleId)}`,
      photoUrl: aislePhoto?.url ?? null,
      photoAlt: aislePhoto?.alt ?? label,
      itemCountOnMenu: count,
      findPages: matchingPages.map((p) => ({
        term: p.term.replace(/^General\s+/i, ""),
        slug: p.slug,
        href: `/find/${p.slug}`,
        vendorsCount: p.vendors,
      })),
    };
  });

  // Build ranked markets with fellow stalls at each market hall
  const vendorById = new Map(allVendors.map((v) => [v.id, v]));
  const spotlightBySlug = new Map(atlasData.vendorSpotlights.map((s) => [s.slug, s]));
  const stallsByMarketId = new Map<string, typeof allStalls>();
  for (const stall of allStalls) {
    if (stall.id === resolvedVendor.id) continue;
    const list = stallsByMarketId.get(stall.market_id) ?? [];
    list.push(stall);
    stallsByMarketId.set(stall.market_id, list);
  }

  const rankedMarkets = rankVendorMarkets(resolvedVendor.markets, now);
  const markets: VendorPreviewMarket[] = rankedMarkets.map((market) => {
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

    const rawFellows = stallsByMarketId.get(market.id) ?? [];
    const fellowVendors: VendorPreviewFellowStall[] = rawFellows
      .map((st) => {
        const v = vendorById.get(st.id);
        const spot = spotlightBySlug.get(st.slug);
        const tags = vendorProductTags(st.name, v?.tags);
        const catId =
          spot?.aisleIds[0] ?? tags.map((t) => TAG_TO_CATEGORY[t]).find(Boolean) ?? "vegetables";
        const aisleLabel =
          spot?.primaryAisleLabel ??
          menuCategoryLabel(catId) ??
          "Market stall";
        const specialty = spot?.items[0]?.name ?? aisleLabel;
        return {
          slug: st.slug,
          name: st.name,
          logoUrl: listingMarkSrc(v?.logo_url),
          specialty,
          aisleLabel,
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
  const badge: VendorPreviewData["vendor"]["badge"] = openNow
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

  // Similar Aisle Vendors (peer stalls in the same aisle/category)
  const vendorAisleSet = new Set(aisleGuides.map((a) => a.id));
  const vendorMarketSlugSet = new Set(markets.map((m) => m.slug));

  const similarAisleVendors: VendorPreviewPeer[] = atlasData.vendorSpotlights
    .filter(
      (spot) =>
        spot.slug !== resolvedVendor.slug &&
        spot.aisleIds.some((id) => vendorAisleSet.has(id)),
    )
    .slice(0, 6)
    .map((spot) => {
      const shared = spot.markets.find((m) => vendorMarketSlugSet.has(m.slug)) ?? null;
      return {
        id: spot.id,
        slug: spot.slug,
        name: spot.name,
        logoUrl: spot.logoUrl,
        ratingAvg: spot.ratingAvg,
        reviewCount: spot.reviewCount,
        badge: spot.badge,
        primaryAisleId: spot.aisleIds[0] ?? primaryAisleId,
        primaryAisleLabel: spot.primaryAisleLabel,
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

  // Pad similarAisleVendors if fewer than 4 matched strictly
  if (similarAisleVendors.length < 4) {
    const seen = new Set([resolvedVendor.slug, ...similarAisleVendors.map((v) => v.slug)]);
    for (const spot of atlasData.vendorSpotlights) {
      if (similarAisleVendors.length >= 6) break;
      if (seen.has(spot.slug)) continue;
      const shared = spot.markets.find((m) => vendorMarketSlugSet.has(m.slug)) ?? null;
      similarAisleVendors.push({
        id: spot.id,
        slug: spot.slug,
        name: spot.name,
        logoUrl: spot.logoUrl,
        ratingAvg: spot.ratingAvg,
        reviewCount: spot.reviewCount,
        badge: spot.badge,
        primaryAisleId: spot.aisleIds[0] ?? primaryAisleId,
        primaryAisleLabel: spot.primaryAisleLabel,
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
      });
      seen.add(spot.slug);
    }
  }

  // Co-Market Vendors (peer stalls setting up at the same market halls)
  const coMarketVendors: VendorPreviewPeer[] = atlasData.vendorSpotlights
    .filter(
      (spot) =>
        spot.slug !== resolvedVendor.slug &&
        spot.markets.some((m) => vendorMarketSlugSet.has(m.slug)),
    )
    .slice(0, 6)
    .map((spot) => {
      const shared = spot.markets.find((m) => vendorMarketSlugSet.has(m.slug)) ?? spot.markets[0];
      return {
        id: spot.id,
        slug: spot.slug,
        name: spot.name,
        logoUrl: spot.logoUrl,
        ratingAvg: spot.ratingAvg,
        reviewCount: spot.reviewCount,
        badge: spot.badge,
        primaryAisleId: spot.aisleIds[0] ?? primaryAisleId,
        primaryAisleLabel: spot.primaryAisleLabel,
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

  // Ensure rich sample floor notes in preview if the vendor has no live reviews yet
  const feed: FloorItem[] =
    resolvedVendor.feed.length > 0
      ? resolvedVendor.feed
      : [
          {
            id: `preview-note-1-${resolvedVendor.slug}`,
            kind: "review",
            body: `Stopped by ${resolvedVendor.name} early in the morning — their ${menus[0]?.name ?? "featured items"} were fresh out and worth the walk.`,
            created_at: new Date(nowMs - 2 * 24 * 3600 * 1000).toISOString(),
            author_name: "Claire M.",
            market_name: firstActiveMarket?.name ?? "Toronto Farmers' Market",
            market_slug: firstActiveMarket?.slug ?? null,
            vendor_name: resolvedVendor.name,
            vendor_slug: resolvedVendor.slug,
            rating: 5,
            price_level: 2,
            tags: vendorTags.slice(0, 2),
            photos: [],
          },
          {
            id: `preview-note-2-${resolvedVendor.slug}`,
            kind: "post",
            body: `Pre-ordered from ${resolvedVendor.name} for market pickup and everything was packed and waiting at the stall counter.`,
            created_at: new Date(nowMs - 5 * 24 * 3600 * 1000).toISOString(),
            author_name: "Devon T.",
            market_name: markets[1]?.name ?? firstActiveMarket?.name ?? "Toronto Farmers' Market",
            market_slug: markets[1]?.slug ?? firstActiveMarket?.slug ?? null,
            vendor_name: resolvedVendor.name,
            vendor_slug: resolvedVendor.slug,
            rating: 5,
            price_level: null,
            tags: [],
            photos: [],
          },
        ];

  return {
    nowMs,
    todayWeekday,
    sampleVendors,
    vendor: {
      id: resolvedVendor.id,
      slug: resolvedVendor.slug,
      name: resolvedVendor.name,
      about:
        resolvedVendor.about ??
        `${resolvedVendor.name} brings small-batch ${primaryAisleLabel.toLowerCase()} and seasonal market goods to ${markets.length || 1} Toronto & Ontario farmers' market ${markets.length === 1 ? "hall" : "halls"}.`,
      logoUrl: listingMarkSrc(resolvedVendor.logo_url),
      ratingAvg: resolvedVendor.rating_avg ?? null,
      reviewCount: resolvedVendor.review_count ?? 0,
      tags: sortTagsForDisplay(resolvedVendor.tags),
      claimed,
      badge,
      openNow,
      sellingToday,
      nextSessionSummary,
      primaryAisleId,
      primaryAisleLabel,
      secondaryAisleLabel,
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
    aisleGuides,
    markets,
    similarAisleVendors,
    coMarketVendors,
    feed,
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
