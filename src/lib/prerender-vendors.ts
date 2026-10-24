/** Stalls written at build time. The rest render on the first request and stay cached for the page revalidate. */
export const PRERENDER_VENDOR_LIMIT = 200;

type PrerenderVendor = {
  id: string;
  slug: string;
  review_count?: number | null;
};

type PrerenderStall = {
  id: string;
};

/**
 * Busiest stalls first: more reviews, then more markets, then a published menu.
 * Slug order keeps the set stable when those counts tie.
 */
export function prerenderVendorSlugs(
  vendors: readonly PrerenderVendor[],
  stalls: readonly PrerenderStall[],
  menuVendorIds: ReadonlySet<string>,
  limit = PRERENDER_VENDOR_LIMIT,
): string[] {
  const stallCount = new Map<string, number>();
  for (const stall of stalls) {
    stallCount.set(stall.id, (stallCount.get(stall.id) ?? 0) + 1);
  }
  return [...vendors]
    .sort((a, b) => {
      const byReviews = (b.review_count ?? 0) - (a.review_count ?? 0);
      if (byReviews !== 0) return byReviews;
      const byStalls = (stallCount.get(b.id) ?? 0) - (stallCount.get(a.id) ?? 0);
      if (byStalls !== 0) return byStalls;
      const byMenu = Number(menuVendorIds.has(b.id)) - Number(menuVendorIds.has(a.id));
      if (byMenu !== 0) return byMenu;
      return a.slug.localeCompare(b.slug);
    })
    .slice(0, Math.max(0, limit))
    .map((vendor) => vendor.slug);
}
