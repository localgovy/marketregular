import { WEEKDAYS } from "@/lib/constants";
import { listMarkets, listStalls, listVendors } from "@/lib/data/catalog";
import { listingScore } from "@/lib/listing-score";
import { vendorHasSubstance } from "@/lib/listing-substance";
import { guessVendorTags, vendorProductTags } from "@/lib/vendor-tags";
import type { StallRef, Vendor } from "@/types/database";

const PEEK = 3;

export type BlogStallPeek = {
  slug: string;
  name: string;
};

export type BlogMarketPeek = {
  ratingAvg: number | null;
  reviewCount: number;
  vendors: BlogStallPeek[];
};

export type BlogMarketPeekRequest = {
  slug: string;
  weekday: number | null;
};

export function peekKey(slug: string, weekday: number | null) {
  return weekday == null ? slug : `${slug}:${weekday}`;
}

export function weekdayFromHeading(text: string): number | null {
  const word = text
    .trim()
    .split(/[\s,]+/)[0]
    ?.toLowerCase()
    .replace(/[^a-z]/g, "");
  if (!word) return null;
  const index = WEEKDAYS.findIndex((day) => day.toLowerCase() === word);
  return index >= 0 ? index : null;
}

function peekKind(vendor: Pick<Vendor, "name" | "tags">) {
  return vendorProductTags(vendor.name, vendor.tags)[0] ?? guessVendorTags(vendor.name)[0] ?? "";
}

function byPeekOrder(left: Vendor, right: Vendor) {
  const leftScore = listingScore(left.rating_avg, left.review_count);
  const rightScore = listingScore(right.rating_avg, right.review_count);
  const leftAvg = leftScore?.avg ?? -1;
  const rightAvg = rightScore?.avg ?? -1;
  if (rightAvg !== leftAvg) return rightAvg - leftAvg;
  const leftSubstance = vendorHasSubstance(left) ? 1 : 0;
  const rightSubstance = vendorHasSubstance(right) ? 1 : 0;
  if (rightSubstance !== leftSubstance) return rightSubstance - leftSubstance;
  return left.name.localeCompare(right.name);
}

function pickVendors(ranked: Vendor[]) {
  const picked: Vendor[] = [];
  const used = new Set<string>();
  for (const vendor of ranked) {
    if (picked.length >= PEEK) break;
    const kind = peekKind(vendor);
    if (kind && used.has(kind)) continue;
    picked.push(vendor);
    if (kind) used.add(kind);
  }
  for (const vendor of ranked) {
    if (picked.length >= PEEK) break;
    if (picked.some((row) => row.slug === vendor.slug)) continue;
    picked.push(vendor);
  }
  return picked.map((vendor) => ({ slug: vendor.slug, name: vendor.name }));
}

function stallsOnDay(stalls: StallRef[], weekday: number | null) {
  if (weekday == null) return stalls;
  const onDay = stalls.filter((stall) => !stall.days.length || stall.days.includes(weekday));
  return onDay.length ? onDay : stalls;
}

export async function loadBlogMarketPeeks(requests: BlogMarketPeekRequest[]) {
  const peeks = new Map<string, BlogMarketPeek>();
  if (!requests.length) return peeks;

  const [markets, stalls, vendors] = await Promise.all([
    listMarkets(),
    listStalls(),
    listVendors(),
  ]);
  const marketBySlug = new Map(markets.map((market) => [market.slug, market]));
  const vendorById = new Map(vendors.map((vendor) => [vendor.id, vendor]));
  const stallsByMarket = new Map<string, StallRef[]>();
  for (const stall of stalls) {
    const list = stallsByMarket.get(stall.market_id);
    if (list) list.push(stall);
    else stallsByMarket.set(stall.market_id, [stall]);
  }

  for (const request of requests) {
    const key = peekKey(request.slug, request.weekday);
    if (peeks.has(key)) continue;
    const market = marketBySlug.get(request.slug);
    if (!market) continue;

    const seen = new Set<string>();
    const ranked: Vendor[] = [];
    for (const stall of stallsOnDay(stallsByMarket.get(market.id) ?? [], request.weekday)) {
      const vendor = vendorById.get(stall.id);
      const slug = vendor?.slug ?? stall.slug;
      if (seen.has(slug)) continue;
      seen.add(slug);
      ranked.push(
        vendor ?? {
          id: stall.id,
          slug: stall.slug,
          name: stall.name,
          about: null,
          website: null,
          instagram: null,
          tiktok: null,
          facebook: null,
          phone: null,
          logo_url: null,
          tags: [],
          status: "published",
          review_count: 0,
          rating_avg: null,
        },
      );
    }
    ranked.sort(byPeekOrder);

    peeks.set(key, {
      ratingAvg: market.rating_avg,
      reviewCount: market.review_count,
      vendors: pickVendors(ranked),
    });
  }

  return peeks;
}
