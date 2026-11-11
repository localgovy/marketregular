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

export function hasEmptyUserAgent(userAgent: string | null) {
  return !userAgent || userAgent.trim().length === 0;
}

/**
 * Detect HTTP clients on dynamic product search that impersonate a desktop or
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

const SPOOF_WINDOW_MS = 60_000;
const SPOOF_IP_LIMIT = 8;
const SPOOF_GLOBAL_LIMIT = 30;
const SPOOF_MAP_CAP = 512;

const spoofByIp = new Map<string, { windowStart: number; count: number }>();
let spoofGlobal = { windowStart: 0, count: 0 };

export function resetSpoofedSearchBursts() {
  spoofByIp.clear();
  spoofGlobal = { windowStart: 0, count: 0 };
}

/**
 * Allow single lookups from undocumented AI fetchers, link previewers, and
 * older WebViews, while stopping sustained non-browser search scraping bursts
 * even across rotating proxy IPs.
 */
export function exceedsSpoofedSearchBurst(ip: string, now = Date.now()): boolean {
  if (now - spoofGlobal.windowStart >= SPOOF_WINDOW_MS) {
    spoofGlobal = { windowStart: now, count: 1 };
  } else {
    spoofGlobal.count += 1;
  }
  if (spoofGlobal.count > SPOOF_GLOBAL_LIMIT) {
    return true;
  }

  const key = ip.trim().slice(0, 64) || "unknown";
  const current = spoofByIp.get(key);
  if (!current || now - current.windowStart >= SPOOF_WINDOW_MS) {
    if (!current && spoofByIp.size >= SPOOF_MAP_CAP) {
      const oldestKey = spoofByIp.keys().next().value;
      if (oldestKey !== undefined) spoofByIp.delete(oldestKey);
    }
    spoofByIp.set(key, { windowStart: now, count: 1 });
    return false;
  }
  current.count += 1;
  return current.count > SPOOF_IP_LIMIT;
}
