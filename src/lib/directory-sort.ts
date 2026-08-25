import { distanceMeters } from "@/lib/geo";
import type { DirectorySort } from "@/lib/find-paths";
import { nextOpenSlot, type ScheduleRow } from "@/lib/schedule";
import type { DirectoryVendor } from "@/lib/vendor-halls";
import type { Market } from "@/types/database";

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
  },
) {
  const list = [...markets];
  if (sort === "near" && options.near) {
    const here = options.near;
    return list.sort(
      (a, b) =>
        distanceMeters(here, { lat: a.lat, lng: a.lng }) -
          distanceMeters(here, { lat: b.lat, lng: b.lng }) || byName(a, b),
    );
  }
  if (sort === "score") return list.sort(byScore);
  if (sort === "next") {
    return list.sort((a, b) => {
      const waitA =
        nextOpenSlot(options.schedulesFor(a.id), a.province)?.waitMinutes ??
        Number.POSITIVE_INFINITY;
      const waitB =
        nextOpenSlot(options.schedulesFor(b.id), b.province)?.waitMinutes ??
        Number.POSITIVE_INFINITY;
      return waitA - waitB || byName(a, b);
    });
  }
  return list.sort(byName);
}

export function sortDirectoryVendors(
  vendors: DirectoryVendor[],
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
    const dist = (vendor: DirectoryVendor) => {
      let best = Number.POSITIVE_INFINITY;
      for (const hall of vendor.halls) {
        const market = options.marketsBySlug.get(hall.slug);
        if (!market) continue;
        best = Math.min(best, distanceMeters(here, market));
      }
      return best;
    };
    return list.sort((a, b) => dist(a) - dist(b) || byName(a, b));
  }
  return list.sort(byName);
}
