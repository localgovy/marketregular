/**
 * Headless scrapers that fetched the dynamic pages hard enough to keep
 * functions provisioned. Search engines and ordinary browsers stay through.
 */
const ABUSIVE_CRAWLER =
  /lightpanda|bytespider|serpstatbot|reflectionbot|elevenlabscrawler|dotbot|petalbot|mj12bot|blexbot|dataforseo|seekport|megaindex/i;

export function isAbusiveCrawler(userAgent: string | null) {
  if (!userAgent) return false;
  return ABUSIVE_CRAWLER.test(userAgent);
}
