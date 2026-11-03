import { distanceMeters } from "@/lib/geo";
import type { DirectorySort } from "@/lib/find-paths";
import { nextOpenSlot, type ScheduleRow } from "@/lib/schedule";
import type { DirectoryVendor } from "@/lib/vendor-halls";
import type { Market } from "@/types/database";

function distanceOrFar(
  here: { lat: number; lng: number },
  lat: number | null,
  lng: number | null,
) {
  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return Number.POSITIVE_INFINITY;
  }
  return distanceMeters(here, { lat, lng });
}

function byName(a: { name: string }, b: { name: string }) {
  return a.name.localeCompare(b.name);
}

function byScore(
  a: { name: string; rating_avg: number | null; review_count: number },
  b: { name: string; rating_avg: number | null; review_count: number },
) {
  const aAvg = a.rating_avg ?? -1;
  const bAvg = b.rating_avg ?? -1;
  if (bAvg !== aAvg) return bAvg - aAvg;
  if (b.review_count !== a.review_count) return b.review_count - a.review_count;
  return byName(a, b);
}

export function sortDirectoryMarkets(
  markets: Market[],
  sort: DirectorySort,
  options: {
    near?: { lat: number; lng: number };
    schedulesFor: (marketId: string) => ScheduleRow[];
    /** Rank "next open" against this instant. Callers that page a cached list must pass the same clock. */
    now?: Date;
  },
) {
  const list = [...markets];
  const now = options.now ?? new Date();
  if (sort === "near" && options.near) {
    const here = options.near;
    return list.sort(
      (a, b) =>
        distanceOrFar(here, a.lat, a.lng) - distanceOrFar(here, b.lat, b.lng) || byName(a, b),
    );
  }
  if (sort === "score") return list.sort(byScore);
  if (sort === "next") {
    // One slot per hall. Calling this inside the comparator rebuilds a year of
    // timezone dates on every comparison and holds the markets page past its limit.
    const wait = new Map<string, number>();
    for (const market of list) {
      wait.set(
        market.id,
        nextOpenSlot(options.schedulesFor(market.id), market.province, now)?.waitMinutes ??
          Number.POSITIVE_INFINITY,
      );
    }
    return list.sort(
      (a, b) =>
        (wait.get(a.id) ?? Number.POSITIVE_INFINITY) -
          (wait.get(b.id) ?? Number.POSITIVE_INFINITY) || byName(a, b),
    );
  }
  return list.sort(byName);
}

type SortableVendor = {
  name: string;
  rating_avg: number | null;
  review_count: number;
  halls?: DirectoryVendor["halls"];
};

export function sortDirectoryVendors<T extends SortableVendor>(
  vendors: T[],
  sort: DirectorySort,
  options: {
    near?: { lat: number; lng: number };
    marketsBySlug: Map<string, Pick<Market, "lat" | "lng">>;
  },
) {
  const list = [...vendors];
  if (sort === "score") return list.sort(byScore);
  if (sort === "near" && options.near) {
    const here = options.near;
    const dist = (vendor: T) => {
      let best = Number.POSITIVE_INFINITY;
      for (const hall of vendor.halls ?? []) {
        const market = options.marketsBySlug.get(hall.slug);
        if (!market) continue;
        best = Math.min(best, distanceOrFar(here, market.lat, market.lng));
      }
      return best;
    };
    return list.sort((a, b) => dist(a) - dist(b) || byName(a, b));
  }
  return list.sort(byName);
}
