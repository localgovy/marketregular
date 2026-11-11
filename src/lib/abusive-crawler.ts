/**
 * Headless scrapers that fetched the dynamic pages hard enough to keep
 * functions provisioned. Search engines, legitimate AI assistants, and
 * ordinary browsers stay through.
 */
const ABUSIVE_CRAWLER =
  /lightpanda|bytespider|serpstatbot|reflectionbot|elevenlabscrawler|dotbot|petalbot|mj12bot|blexbot|dataforseo|seekport|megaindex|ccbot|scrapy|headlesschrome|phantomjs/i;

const CLAIMED_BROWSER = /chrome\/|crios\/|firefox\/|safari\//i;

const DECLARED_AUTOMATION =
  /bot|crawl|spider|slurp|chatgpt|gptbot|oai-searchbot|claude|anthropic|perplexity|meta-webindexer|meta-external|facebookexternalhit|muse|grok|xai|duckassist|exa|applebot|google|bingpreview|microsoftpreview|twitter|slack|discord|whatsapp|linkedin|telegram|pinterest|iframely|ahrefs|semrush|lighthouse/i;

export function isAbusiveCrawler(userAgent: string | null) {
  if (!userAgent) return false;
  return ABUSIVE_CRAWLER.test(userAgent);
}

/**
 * Reject HTTP scrapers on dynamic product search that impersonate a desktop or
 * mobile browser User-Agent while sending raw non-browser headers (`Accept: *\/*`
 * or missing, with no Fetch Metadata `Sec-Fetch-Mode`). Declared search and AI
 * assistant crawlers and plain non-spoofed HTTP clients are not matched.
 */
export function isSpoofedBrowserSearch(
  headers: Pick<Headers, "get">,
): boolean {
  const ua = headers.get("user-agent") ?? "";
  if (!ua || !CLAIMED_BROWSER.test(ua)) return false;
  if (DECLARED_AUTOMATION.test(ua)) return false;
  if (headers.get("sec-fetch-mode")?.trim()) return false;
  const accept = headers.get("accept")?.trim().toLowerCase() ?? "";
  return accept === "" || accept === "*/*";
}
