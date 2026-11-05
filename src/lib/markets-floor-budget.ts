import { DIRECTORY_CACHE_BUDGET, serializedBytes } from "@/lib/directory-cache";
import type { FloorTaxonomy } from "@/lib/markets-floor-types";

/** One PostgREST page. */
export const FLOOR_TAXONOMY_PAGE = 1000;
/**
 * Hard stop for the hourly menu scan.
 * 50 pages is 50,000 rows, above the live menu table, and the scan stops
 * on the first short page. Hitting this cap means the table outgrew the budget.
 */
export const FLOOR_TAXONOMY_PAGE_CAP = 50;

/**
 * The data cache refuses an entry over 2MB and then refetches it on every request.
 * Shrink the aggregate until it fits, instead of letting that happen.
 */
export function fitFloorTaxonomy(taxonomy: Record<string, FloorTaxonomy>) {
  const budget = DIRECTORY_CACHE_BUDGET;
  if (serializedBytes(taxonomy) <= budget) return taxonomy;
  const withoutSamples: Record<string, FloorTaxonomy> = {};
  for (const [slug, entry] of Object.entries(taxonomy)) {
    withoutSamples[slug] = { ...entry, samples: [] };
  }
  if (serializedBytes(withoutSamples) <= budget) return withoutSamples;
  const fitted: Record<string, FloorTaxonomy> = {};
  for (const slug of Object.keys(withoutSamples).sort()) {
    fitted[slug] = withoutSamples[slug]!;
    if (serializedBytes(fitted) > budget) {
      delete fitted[slug];
      break;
    }
  }
  return fitted;
}
