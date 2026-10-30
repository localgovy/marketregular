/**
 * These shops stay in search after their only hall was taken off the public site.
 * They are not tied to that hall anymore.
 *
 * `search_products` inlines the same slugs so their menus stay searchable
 * without a published hall. Keep this list and that SQL list identical.
 */
export const UNAFFILIATED_VENDOR_SLUGS_LIST = [
  "broken-stone-winery",
  "lovell-springs-trout-farm",
  "matz-fruit-barn",
  "trail-estate-winery",
  "trillium-organic-farm",
] as const;

export const UNAFFILIATED_VENDOR_SLUGS = new Set<string>(UNAFFILIATED_VENDOR_SLUGS_LIST);
