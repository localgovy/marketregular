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
import { isMarketOpen, isOpenOnWeekday } from "@/lib/schedule";
import type {
  FloorItem,
  Market,
  MarketDetail,
  MarketSchedule,
  Post,
  Review,
  SearchFilters,
  Vendor,
  VendorDetail,
} from "@/types/database";

function haystack(parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join(" ").toLowerCase();
}

export function localMarkets(): Market[] {
  return seedMarkets.map(toPublicMarket);
}

export function localVendors(): Vendor[] {
  return seedVendors.map(toPublicVendor);
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
  if (filters.tag) {
    markets = markets.filter((m) => m.tags.includes(filters.tag!));
    vendors = vendors.filter((v) => v.tags.includes(filters.tag!));
  }
  if (filters.weekday != null) {
    markets = markets.filter((m) =>
      isOpenOnWeekday(schedulesFor(m.id), filters.weekday!),
    );
  }
  if (filters.openNow) {
    markets = markets.filter((m) => isMarketOpen(schedulesFor(m.id), m.province));
  }
  if (filters.near) {
    markets = markets
      .map((m) => ({ m, d: distanceMeters(filters.near!, { lat: m.lat, lng: m.lng }) }))
      .sort((a, b) => a.d - b.d)
      .map((x) => x.m);
  }

  return { markets, vendors };
}

export function localMarketBySlug(slug: string): MarketDetail | null {
  const seed = seedMarkets.find((m) => m.slug === slug);
  if (!seed) return null;
  const market = toPublicMarket(seed);
  const vendorLinks = seedMarketVendors.filter((mv) => mv.market_id === market.id);
  const vendors = vendorLinks.flatMap((link) => {
    const v = seedVendors.find((x) => x.id === link.vendor_id);
    if (!v) return [];
    return [{ ...toPublicVendor(v), stall: link.stall, days: link.days }];
  });
  return {
    ...market,
    schedules: schedulesFor(market.id),
    vendors,
    reviews: seedReviews.filter((r) => r.market_id === market.id && !r.flagged),
    posts: seedPosts.filter((p) => p.market_id === market.id && !p.flagged),
  };
}

export function localVendorBySlug(slug: string): VendorDetail | null {
  const seed = seedVendors.find((v) => v.slug === slug);
  if (!seed) return null;
  const vendor = toPublicVendor(seed);
  const links = seedMarketVendors.filter((mv) => mv.vendor_id === vendor.id);
  const markets = links.flatMap((link) => {
    const m = seedMarkets.find((x) => x.id === link.market_id);
    if (!m) return [];
    return [{ ...toPublicMarket(m), stall: link.stall, days: link.days }];
  });
  return {
    ...vendor,
    menus: menusFor(vendor.id),
    markets,
    reviews: seedReviews.filter((r) => r.vendor_id === vendor.id && !r.flagged),
  };
}

export function localPosts(limit = 20): Post[] {
  return [...seedPosts]
    .filter((p) => !p.flagged)
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
    .slice(0, limit);
}

export function localReviewsForMarket(marketId: string): Review[] {
  return seedReviews.filter((r) => r.market_id === marketId && !r.flagged);
}

export function localCities() {
  return [...new Set(seedMarkets.map((m) => m.city))].sort();
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

export function localFloorTape(limit = 24): FloorItem[] {
  const posts: FloorItem[] = seedPosts
    .filter((p) => !p.flagged)
    .map((p) => ({
      id: p.id,
      kind: "post" as const,
      body: p.body,
      created_at: p.created_at,
      author_name: p.author_name ?? null,
      market_name: p.market_name ?? null,
      market_slug: p.market_slug ?? null,
      vendor_name: null,
      vendor_slug: null,
      rating: null,
      verified_on_site: p.verified_on_site,
    }));

  const reviews: FloorItem[] = seedReviews
    .filter((r) => !r.flagged)
    .map((r) => {
      const market = seedMarkets.find((m) => m.id === r.market_id);
      const vendor = seedVendors.find((v) => v.id === r.vendor_id);
      return {
        id: r.id,
        kind: "review" as const,
        body: r.body,
        created_at: r.created_at,
        author_name: r.author_name ?? null,
        market_name: market?.name ?? null,
        market_slug: market?.slug ?? null,
        vendor_name: vendor?.name ?? null,
        vendor_slug: vendor?.slug ?? null,
        rating: r.rating,
        verified_on_site: r.verified_on_site,
      };
    });

  return [...posts, ...reviews]
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
    .slice(0, limit);
}
