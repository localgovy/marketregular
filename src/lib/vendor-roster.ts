/**
 * Leslieville asked us not to publish a stall list on their hall pages.
 * `market_vendors` rows stay so the desk can put the roster back, and every
 * stall still has its own searchable vendor page.
 */
export const HIDDEN_VENDOR_ROSTER_SLUGS = new Set([
  "the-leslieville-farmers-market",
  "leslieville-farmers-market-east-end-food-hub",
]);

export function publishesVendorRoster(slug: string) {
  return !HIDDEN_VENDOR_ROSTER_SLUGS.has(slug);
}

export function publicStallCount(slug: string, count: number) {
  return publishesVendorRoster(slug) ? count : 0;
}
