import {
  menusFor,
  schedulesFor,
  seedMarketVendors,
  seedMarkets,
  seedPosts,
  seedReviews,
  seedVendors,
  toPublicMarket,
  toPublicVendor,
} from "@/data/directory";
import { distanceMeters } from "@/lib/geo";
import { decodeFloorBody, mergeReviews, reviewFromPost, reviewFromReview } from "@/lib/floor-note";
import { applyDirectoryTags, searchWeekdays } from "@/lib/find-paths";
import { isLaunchCity } from "@/lib/launch";
import { isMarketOpen, isOpenOnWeekday } from "@/lib/schedule";
import { groupVendorHalls, withVendorHalls } from "@/lib/vendor-halls";
import type {
  FloorItem,
  Market,
  MarketDetail,
  MarketSchedule,
  Post,
  Review,
  SearchFilters,
  StallRef,
  Vendor,
  VendorDetail,
} from "@/types/database";

function haystack(parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join(" ").toLowerCase();
}

function launchMarketIds() {
  return new Set(seedMarkets.filter((m) => isLaunchCity(m.city)).map((m) => m.id));
}

export function localMarkets(): Market[] {
  return seedMarkets.filter((m) => isLaunchCity(m.city)).map(toPublicMarket);
}

export function localVendors(): Vendor[] {
  const ids = launchMarketIds();
  const vendorIds = new Set(
    seedMarketVendors.filter((link) => ids.has(link.market_id)).map((link) => link.vendor_id),
  );
  return seedVendors.filter((v) => vendorIds.has(v.id)).map(toPublicVendor);
}

export function localSitemapVendors(): Vendor[] {
  return localVendors().filter(
    (vendor) => Boolean(vendor.about?.trim()) || menusFor(vendor.id).length > 0,
  );
}

export function localMenuCount() {
  return localVendors().reduce((n, vendor) => n + menusFor(vendor.id).length, 0);
}

export function localSearch(filters: SearchFilters) {
  const q = filters.q?.trim().toLowerCase();
  let markets = localMarkets();
  let vendors = localVendors();

  if (q) {
    markets = markets.filter((m) =>
      haystack([m.name, m.city, m.province, m.about, m.tags.join(" "), m.address]).includes(q),
    );
    vendors = vendors.filter((v) => {
      const marketNames = seedMarketVendors
        .filter((mv) => mv.vendor_id === v.id)
        .map((mv) => seedMarkets.find((m) => m.id === mv.market_id)?.name);
      return haystack([v.name, v.about, v.tags.join(" "), ...marketNames]).includes(q);
    });
  }
  if (filters.province) {
    markets = markets.filter((m) => m.province === filters.province);
    const ids = new Set(markets.map((m) => m.id));
    vendors = vendors.filter((v) =>
      seedMarketVendors.some((mv) => mv.vendor_id === v.id && ids.has(mv.market_id)),
    );
  }
  if (filters.city) {
    const city = filters.city.toLowerCase();
    markets = markets.filter((m) => m.city.toLowerCase() === city);
  }
  if (filters.setup) {
    markets = markets.filter((m) => m.tags.includes(filters.setup!));
  }
  const days = searchWeekdays(filters);
  if (days.length) {
    markets = markets.filter((m) =>
      days.some((day) => isOpenOnWeekday(schedulesFor(m.id), day)),
    );
  }
  if (filters.openNow) {
    markets = markets.filter((m) => isMarketOpen(schedulesFor(m.id), m.province));
  }
  if (filters.tags?.length) {
    const tagged = applyDirectoryTags(
      markets,
      vendors,
      seedMarketVendors
        .filter((link) => !days.length || link.days.some((day) => days.includes(day)))
        .map((link) => ({
          market_id: link.market_id,
          vendor_id: link.vendor_id,
        })),
      filters.tags,
    );
    markets = tagged.markets;
    vendors = tagged.vendors;
  }
  if (filters.near) {
    markets = markets
      .map((m) => ({ m, d: distanceMeters(filters.near!, { lat: m.lat, lng: m.lng }) }))
      .sort((a, b) => a.d - b.d)
      .map((x) => x.m);
  }

  return {
    markets,
    vendors: withVendorHalls(vendors, groupVendorHalls(localStalls(), localMarkets())),
  };
}

function withReviewPlace(row: (typeof seedReviews)[number]) {
  const market = seedMarkets.find((m) => m.id === row.market_id);
  const vendor = seedVendors.find((v) => v.id === row.vendor_id);
  return reviewFromReview({
    ...row,
    market_name: market?.name ?? null,
    market_slug: market?.slug ?? null,
    vendor_name: vendor?.name ?? null,
    vendor_slug: vendor?.slug ?? null,
  });
}

function feedForMarket(marketId: string): FloorItem[] {
  const vendorIds = new Set(
    seedMarketVendors.filter((link) => link.market_id === marketId).map((link) => link.vendor_id),
  );
  const stalls = localStalls();
  const fromPosts = seedPosts
    .filter((post) => !post.flagged && post.market_id === marketId)
    .map((post) => reviewFromPost(post, stalls));
  const fromReviews = seedReviews
    .filter((row) => {
      if (row.flagged) return false;
      if (row.market_id === marketId) return true;
      return Boolean(row.vendor_id && vendorIds.has(row.vendor_id));
    })
    .map(withReviewPlace);
  return mergeReviews([...fromPosts, ...fromReviews]);
}

function feedForVendor(vendorId: string, slug: string): FloorItem[] {
  const stalls = localStalls();
  const marketIds = new Set(
    seedMarketVendors.filter((link) => link.vendor_id === vendorId).map((link) => link.market_id),
  );
  const fromReviews = seedReviews
    .filter((row) => !row.flagged && row.vendor_id === vendorId)
    .map(withReviewPlace);
  const fromPosts = seedPosts
    .filter((post) => {
      if (post.flagged || !marketIds.has(post.market_id)) return false;
      const decoded = decodeFloorBody(post.body);
      return post.vendor_slug === slug || decoded.vendorSlug === slug;
    })
    .map((post) => reviewFromPost(post, stalls));
  return mergeReviews([...fromPosts, ...fromReviews]);
}

export function localMarketBySlug(slug: string): MarketDetail | null {
  const seed = seedMarkets.find((m) => m.slug === slug);
  if (!seed || !isLaunchCity(seed.city)) return null;
  const market = toPublicMarket(seed);
  const vendorLinks = seedMarketVendors.filter((mv) => mv.market_id === market.id);
  const hallsMap = groupVendorHalls(localStalls(), localMarkets());
  const vendors = vendorLinks.flatMap((link) => {
    const v = seedVendors.find((x) => x.id === link.vendor_id);
    if (!v) return [];
    return [
      {
        ...toPublicVendor(v),
        stall: link.stall,
        days: link.days,
        halls: hallsMap.get(v.id) ?? [],
      },
    ];
  });
  const posts = seedPosts.filter((p) => p.market_id === market.id && !p.flagged);
  const reviews = seedReviews.filter((r) => r.market_id === market.id && !r.flagged);
  return {
    ...market,
    schedules: schedulesFor(market.id),
    vendors,
    reviews,
    posts,
    feed: feedForMarket(market.id),
  };
}

export function localVendorBySlug(slug: string): VendorDetail | null {
  const seed = seedVendors.find((v) => v.slug === slug);
  if (!seed) return null;
  const vendor = toPublicVendor(seed);
  const links = seedMarketVendors.filter((mv) => mv.vendor_id === vendor.id);
  const markets = links.flatMap((link) => {
    const m = seedMarkets.find((x) => x.id === link.market_id);
    if (!m || !isLaunchCity(m.city)) return [];
    return [{ ...toPublicMarket(m), stall: link.stall, days: link.days }];
  });
  if (!markets.length) return null;
  return {
    ...vendor,
    menus: menusFor(vendor.id),
    markets,
    reviews: seedReviews.filter((r) => r.vendor_id === vendor.id && !r.flagged),
    feed: feedForVendor(vendor.id, vendor.slug),
  };
}

export function localPosts(limit = 20): Post[] {
  const ids = launchMarketIds();
  return [...seedPosts]
    .filter((p) => !p.flagged && ids.has(p.market_id))
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
    .slice(0, limit);
}

export function localReviewsForMarket(marketId: string): Review[] {
  return seedReviews.filter((r) => r.market_id === marketId && !r.flagged);
}

export function localCities() {
  return [...new Set(localMarkets().map((m) => m.city))].sort();
}

export function localFeatured() {
  return localMarkets().filter((m) => m.featured);
}

export function localOpenToday() {
  return localMarkets().filter((m) => isMarketOpen(schedulesFor(m.id), m.province));
}

export function localSchedules(): MarketSchedule[] {
  return localMarkets().flatMap((m) => schedulesFor(m.id));
}

export function localStalls(): StallRef[] {
  const ids = launchMarketIds();
  return seedMarketVendors.flatMap((link) => {
    if (!ids.has(link.market_id)) return [];
    const vendor = seedVendors.find((v) => v.id === link.vendor_id);
    if (!vendor) return [];
    return [
      {
        id: vendor.id,
        name: vendor.name,
        slug: vendor.slug,
        market_id: link.market_id,
        stall: link.stall,
        days: link.days,
      },
    ];
  });
}

export function localTablePeek(vendorIds: string[]) {
  const lines: Array<{
    vendorName: string;
    vendorSlug: string;
    item: string;
    priceCents: number | null;
    note: string | null;
  }> = [];
  for (const id of vendorIds) {
    const vendor = seedVendors.find((v) => v.id === id);
    if (!vendor) continue;
    const menu = menusFor(id)[0];
    if (!menu) continue;
    const review = seedReviews.find((r) => !r.flagged && r.vendor_id === id);
    lines.push({
      vendorName: vendor.name,
      vendorSlug: vendor.slug,
      item: menu.name,
      priceCents: menu.price_cents,
      note: review?.body ?? null,
    });
    if (lines.length >= 3) break;
  }
  return lines;
}

export function localFloorTape(limit = 24): FloorItem[] {
  const ids = launchMarketIds();
  const stalls = localStalls();
  const posts = seedPosts
    .filter((p) => !p.flagged && ids.has(p.market_id))
    .map((p) => reviewFromPost(p, stalls));
  const reviews = seedReviews
    .filter((r) => {
      if (r.flagged) return false;
      if (r.market_id) return ids.has(r.market_id);
      if (!r.vendor_id) return false;
      return seedMarketVendors.some((link) => link.vendor_id === r.vendor_id && ids.has(link.market_id));
    })
    .map(withReviewPlace);

  return mergeReviews([...posts, ...reviews]).slice(0, limit);
}
