import "server-only";

/**
 * Retired public URLs are listed in next.config.ts redirects so crawlers get a
 * 301 without probing live drafts (that would 301 vs 404 and leak unpublished slugs).
 */
export async function retiredMarketTarget(_slug: string): Promise<string | null> {
  return null;
}

export async function retiredVendorTarget(_slug: string): Promise<string | null> {
  return null;
}
