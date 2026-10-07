import "server-only";

import { listingRedirectDestination } from "@/data/listing-redirects";

/**
 * Retired public URLs are listed in listing-redirects.ts / next.config.ts so
 * crawlers get a 308 without probing live drafts (that would 301 vs 404 and
 * leak unpublished slugs). These helpers stay as a last resort if a slug
 * somehow still reaches the page.
 */
export async function retiredMarketTarget(slug: string): Promise<string | null> {
  return listingRedirectDestination(`/markets/${slug}`);
}

export async function retiredVendorTarget(slug: string): Promise<string | null> {
  return listingRedirectDestination(`/vendors/${slug}`);
}
