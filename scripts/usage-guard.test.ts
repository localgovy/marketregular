import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";
import { test } from "node:test";
import {
  exceedsSpoofedSearchBurst,
  hasEmptyUserAgent,
  isAbusiveCrawler,
  isSpoofedBrowserSearch,
  resetSpoofedSearchBursts,
} from "../src/lib/abusive-crawler.ts";
import {
  MAX_PRODUCT_SEARCH_OFFSET,
  MIN_PRODUCT_SEARCH_CHARS,
  PRODUCT_PAGE,
} from "../src/lib/product-hits.ts";
import {
  DIRECTORY_DATA_REVALIDATE_SECONDS,
  DIRECTORY_REVALIDATE_SECONDS,
  PUBLISHED_ROWS_REVALIDATE_SECONDS,
} from "../src/lib/directory-cache.ts";
import { isInjectionProbe } from "../src/lib/injection-probe.ts";
import {
  currentSearchInFlight,
  resetSearchConcurrency,
  tryAcquireSearchSlot,
} from "../src/lib/search-concurrency.ts";

function routeFiles(dir: string, out: string[] = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) routeFiles(path, out);
    else if (basename(path) === "page.tsx") out.push(path);
  }
  return out;
}

test("published directory rows are not rewritten every couple of minutes", () => {
  assert.ok(DIRECTORY_DATA_REVALIDATE_SECONDS >= 60 * 60);
  assert.ok(DIRECTORY_REVALIDATE_SECONDS >= 60 * 60);
});

test("public pages are not regenerated more than once a quarter hour", () => {
  const root = new URL("../src/app", import.meta.url);
  for (const file of routeFiles(root.pathname)) {
    const source = readFileSync(file, "utf8");
    const match = source.match(/export const revalidate = (\d+)/);
    if (!match) continue;
    assert.ok(Number(match[1]) >= 900, file);
  }
});

test("cached directory reads stay on the hourly clock", () => {
  const files = [
    "../src/lib/data/catalog.ts",
    "../src/lib/data/product-photos.ts",
    "../src/lib/data/product-search.ts",
    "../src/lib/home-atlas-data.ts",
    "../src/lib/products-atlas-data.ts",
    "../src/lib/markets-floor-data.ts",
  ];
  for (const file of files) {
    const source = readFileSync(new URL(file, import.meta.url), "utf8");
    const numbers = [...source.matchAll(/revalidate:\s*(\d+)/g)].map((match) => Number(match[1]));
    for (const value of numbers) {
      const searchCache = file.endsWith("product-search.ts") && value === 60;
      assert.ok(searchCache || value >= 900, `${file} revalidates in ${value}s`);
    }
  }
});

test("stall pages rebuild once a day and keep their hours on the browser clock", () => {
  const page = readFileSync(new URL("../src/app/vendors/[slug]/page.tsx", import.meta.url), "utf8");
  const revalidate = Number(page.match(/export const revalidate = (\d+)/)?.[1]);
  assert.ok(revalidate >= 24 * 60 * 60, "stall page revalidate");
  assert.ok(PUBLISHED_ROWS_REVALIDATE_SECONDS >= revalidate, "a shorter row lifetime would rebuild every stall page sooner");
  const photos = readFileSync(new URL("../src/lib/data/product-photos.ts", import.meta.url), "utf8");
  assert.match(photos, /revalidate: PUBLISHED_ROWS_REVALIDATE_SECONDS/);
  const atlas = readFileSync(new URL("../src/components/vendor-atlas.tsx", import.meta.url), "utf8");
  assert.match(atlas, /useNow\(source\.clock\.renderedAt\)/);
  assert.match(atlas, /applyVendorClock\(/);
  const data = readFileSync(new URL("../src/lib/vendor-atlas-data.ts", import.meta.url), "utf8");
  for (const clock of ["isMarketOpen(", "nextOpenLabel(", "hallDayHours(", "sessionOnWeekday("]) {
    assert.equal(data.includes(clock), false, `${clock} belongs in vendor-atlas-clock`);
  }
});

test("market pages rebuild once a day and read today's session in the browser", () => {
  const page = readFileSync(new URL("../src/app/markets/[slug]/page.tsx", import.meta.url), "utf8");
  const revalidate = Number(page.match(/export const revalidate = (\d+)/)?.[1]);
  assert.ok(revalidate >= 24 * 60 * 60, "market page revalidate");
  assert.ok(PUBLISHED_ROWS_REVALIDATE_SECONDS >= revalidate);
  assert.equal(page.includes("sessionToday("), false);
  assert.equal(page.includes("todayWeekday="), false);
  const roster = readFileSync(new URL("../src/components/market-vendors.tsx", import.meta.url), "utf8");
  assert.match(roster, /useNow\(renderedAt\)/);
});

test("the stylesheet is a cached file, not copied into every page", () => {
  const config = readFileSync(new URL("../next.config.ts", import.meta.url), "utf8");
  assert.equal(config.includes("inlineCss"), false);
});

test("product browse is cached and product search cannot run for a minute", () => {
  const browse = readFileSync(
    new URL("../src/app/products/browse/[aisle]/[sort]/page.tsx", import.meta.url),
    "utf8",
  );
  const search = readFileSync(new URL("../src/app/products/search/page.tsx", import.meta.url), "utf8");
  assert.equal(browse.includes("searchParams"), false);
  assert.match(browse, /export const revalidate = 3600/);
  const duration = search.match(/export const maxDuration = (\d+)/);
  assert.ok(duration);
  assert.ok(Number(duration[1]) <= 20);
});

test("a docs-only commit can skip a build and a blog commit cannot", () => {
  const vercel = readFileSync(new URL("../vercel.json", import.meta.url), "utf8");
  const ignore = readFileSync(new URL("../scripts/vercel-ignore-build.mjs", import.meta.url), "utf8");
  assert.match(vercel, /vercel-ignore-build\.mjs/);
  assert.match(ignore, /docs\//);
  assert.equal(ignore.includes('file.startsWith("content/")'), false);
  assert.match(ignore, /content\//);
});

test("known scrapers are refused and browsers and good chatbots are not", () => {
  for (const scraper of [
    "Lightpanda/1.0",
    "Mozilla/5.0 (Linux; Android 5.0) AppleWebKit/537.36 (KHTML, like Gecko) Mobile Safari/537.36 (compatible; Bytespider; spider-feedback@bytedance.com)",
    "Mozilla/5.0 (compatible; DotBot/1.2; +https://opensiteexplorer.org/dotbot)",
    "CCBot/2.0 (https://commoncrawl.org/faq/)",
    "Scrapy/2.11.2 (+https://scrapy.org)",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Unknown; Linux x86_64) AppleWebKit/538.1 (KHTML, like Gecko) PhantomJS/2.1.1 Safari/538.1",
  ]) {
    assert.equal(isAbusiveCrawler(scraper), true, scraper);
  }

  for (const allowed of [
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15 (Applebot/0.1; +http://www.apple.com/go/applebot)",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36; compatible; OAI-SearchBot/1.4; +https://openai.com/searchbot",
    "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0; +https://openai.com/bot",
    "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.2; +https://openai.com/gptbot)",
    "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Claude-User/1.0; +https://support.anthropic.com)",
    "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Claude-SearchBot/1.0; +https://support.anthropic.com)",
    "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)",
    "Mozilla/5.0 (compatible; meta-webindexer/1.1; +https://developers.facebook.com/docs/sharing/webmasters/crawler)",
    "Mozilla/5.0 (compatible; Meta-ExternalFetcher/1.1; +https://developers.facebook.com/docs/sharing/webmasters/crawler)",
    "Muse/1.0",
    "GrokBot/1.0",
    "Mozilla/5.0 (compatible; xAI-SearchBot/1.0; +https://x.ai)",
    "GrokAgent/1.0",
    "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)",
    "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Perplexity-User/1.0; +https://perplexity.ai/perplexity-user)",
    "Mozilla/5.0 (compatible; DuckAssistBot/1.0; +https://duckduckgo.com/duckassistbot)",
  ]) {
    assert.equal(isAbusiveCrawler(allowed), false, allowed);
  }
  assert.equal(isAbusiveCrawler(null), false);
  assert.equal(isAbusiveCrawler(""), false);
});

test("spoofed browser headers on dynamic search are caught without blocking browsers or chatbots", () => {
  assert.equal(
    isSpoofedBrowserSearch(
      new Headers({
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36",
        accept: "*/*",
      }),
    ),
    true,
  );
  assert.equal(
    isSpoofedBrowserSearch(
      new Headers({
        "user-agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/147.0.0.0 Mobile/15E148 Safari/604.1",
      }),
    ),
    true,
  );

  // Real browser document navigation and RSC client fetch both pass.
  assert.equal(
    isSpoofedBrowserSearch(
      new Headers({
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "sec-fetch-mode": "navigate",
      }),
    ),
    false,
  );
  assert.equal(
    isSpoofedBrowserSearch(
      new Headers({
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36",
        accept: "*/*",
        "sec-fetch-mode": "cors",
      }),
    ),
    false,
  );

  // Declared chatbots (including Chrome-based OAI-SearchBot) and plain HTTP tools pass.
  for (const botUa of [
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36; compatible; OAI-SearchBot/1.4; +https://openai.com/searchbot",
    "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0; +https://openai.com/bot",
    "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Claude-User/1.0; +https://support.anthropic.com)",
    "Mozilla/5.0 (compatible; meta-webindexer/1.1; +https://developers.facebook.com/docs/sharing/webmasters/crawler)",
    "Muse/1.0",
    "GrokBot/1.0",
    "Mozilla/5.0 (compatible; xAI-SearchBot/1.0; +https://x.ai)",
    "curl/8.7.1",
  ]) {
    assert.equal(
      isSpoofedBrowserSearch(new Headers({ "user-agent": botUa, accept: "*/*" })),
      false,
      botUa,
    );
  }

  assert.equal(hasEmptyUserAgent(null), true);
  assert.equal(hasEmptyUserAgent("   "), true);
  assert.equal(hasEmptyUserAgent("GrokBot/1.0"), false);

  // Single lookups from undocumented AI fetchers or link previewers pass;
  // single-IP (>8/min) and rotating-proxy (>30/min) scraping bursts are stopped.
  resetSpoofedSearchBursts();
  const baseNow = 1_700_000_000_000;
  for (let i = 1; i <= 8; i += 1) {
    assert.equal(exceedsSpoofedSearchBurst("198.51.100.1", baseNow + i), false);
  }
  assert.equal(exceedsSpoofedSearchBurst("198.51.100.1", baseNow + 9), true);

  resetSpoofedSearchBursts();
  for (let i = 1; i <= 30; i += 1) {
    assert.equal(exceedsSpoofedSearchBurst(`203.0.113.${i}`, baseNow + i), false);
  }
  assert.equal(exceedsSpoofedSearchBurst("203.0.113.31", baseNow + 31), true);
  assert.equal(exceedsSpoofedSearchBurst("203.0.113.31", baseNow + 61_000), false);
  resetSpoofedSearchBursts();
});

test("bulk extraction surfaces stay closed and bounded", () => {
  assert.equal(
    existsSync(new URL("../src/app/api/search/route.ts", import.meta.url)),
    false,
    "unused /api/search JSON endpoint must stay removed",
  );
  assert.ok(MIN_PRODUCT_SEARCH_CHARS >= 2);
  assert.ok(MAX_PRODUCT_SEARCH_OFFSET + PRODUCT_PAGE <= 200);

  const searchLib = readFileSync(
    new URL("../src/lib/data/product-search.ts", import.meta.url),
    "utf8",
  );
  assert.match(searchLib, /MIN_PRODUCT_SEARCH_CHARS/);
  assert.match(searchLib, /MAX_PRODUCT_SEARCH_OFFSET/);
  assert.match(searchLib, /search-vendors-v2/);
  assert.equal(searchLib.includes('.from("published_vendors")'), false);
  assert.equal(searchLib.includes("4000"), false);

  const productsAction = readFileSync(
    new URL("../src/app/actions/products.ts", import.meta.url),
    "utf8",
  );
  assert.match(productsAction, /MIN_PRODUCT_SEARCH_CHARS/);
  assert.match(productsAction, /MAX_PRODUCT_SEARCH_OFFSET/);
  assert.match(productsAction, /tryAcquireSearchSlot\(\)/);
  assert.match(productsAction, /takeCatalogSlot\(\)/);
  assert.equal(productsAction.includes("4_000"), false);

  const productsScreen = readFileSync(
    new URL("../src/app/products/screen.tsx", import.meta.url),
    "utf8",
  );
  assert.match(productsScreen, /tryAcquireSearchSlot\(\)/);
  assert.match(productsScreen, /takeCatalogSlot\(\)/);

  const homeLazy = readFileSync(
    new URL("../src/app/actions/home-lazy.ts", import.meta.url),
    "utf8",
  );
  assert.match(homeLazy, /auth\.getUser\(\)/);
  assert.match(homeLazy, /takeCatalogSlot\(\)/);
  assert.equal(homeLazy.includes("4000"), false);

  const menuPhotosAction = readFileSync(
    new URL("../src/app/actions/menu-item-photos.ts", import.meta.url),
    "utf8",
  );
  assert.match(menuPhotosAction, /createAuthedServerClient\(\)/);
  assert.match(menuPhotosAction, /takeCatalogSlot\(\)/);

  const proxySource = readFileSync(new URL("../src/proxy.ts", import.meta.url), "utf8");
  assert.match(proxySource, /isSpoofedBrowserSearch\(request\.headers\)/);
  assert.match(proxySource, /exceedsSpoofedSearchBurst\(/);
  assert.match(proxySource, /hasEmptyUserAgent\(/);
  assert.match(proxySource, /isProductSearchRequest\(request\)/);
  assert.match(searchLib, /isInjectionProbe\(/);
  assert.match(productsAction, /isInjectionProbe\(/);
  assert.match(proxySource, /isInjectionProbe\(/);
  assert.match(proxySource, /token_hash/);
  assert.match(proxySource, /error_description/);
});

test("sql-shaped searches are probes and ordinary product text is not", () => {
  for (const probe of [
    "' OR 1=1",
    "union select",
    "UNION SELECT name FROM vendor_menus",
    "pg_sleep(10)",
    "information_schema.tables",
    "pg_catalog.pg_tables",
    "bread /*",
    "honey--",
    "a; drop table vendor_menus",
    "x;select 1",
    "or 1 = 1",
    "\0honey",
    "%00",
  ]) {
    assert.equal(isInjectionProbe(probe), true, probe);
  }
  for (const ordinary of [
    "mom's",
    "gluten-free",
    "mac & cheese",
    "jalapeño",
    "honey",
    "sourdough",
    "100% rye",
    "co-op",
    "oranges",
    "bread/toronto",
    "",
    "or 2",
  ]) {
    assert.equal(isInjectionProbe(ordinary), false, ordinary);
  }

  resetSearchConcurrency();
  const releases = Array.from({ length: 4 }, () => tryAcquireSearchSlot(4));
  assert.equal(releases.every((fn) => typeof fn === "function"), true);
  assert.equal(currentSearchInFlight(), 4);
  assert.equal(tryAcquireSearchSlot(4), null);
  releases[0]?.();
  releases[0]?.();
  assert.equal(currentSearchInFlight(), 3);
  const extra = tryAcquireSearchSlot(4);
  assert.equal(typeof extra, "function");
  extra?.();
  for (const fn of releases) fn?.();
  assert.equal(currentSearchInFlight(), 0);
});

test("request-path warmups and full-site login invalidation stay out", () => {
  const markets = readFileSync(new URL("../src/app/markets/(index)/page.tsx", import.meta.url), "utf8");
  const auth = readFileSync(new URL("../src/app/actions/auth.ts", import.meta.url), "utf8");
  const directory = readFileSync(new URL("../src/lib/revalidate-directory.ts", import.meta.url), "utf8");
  assert.equal(markets.includes("warmChip"), false);
  assert.equal(markets.includes("after("), false);
  assert.equal(markets.includes("loadMarketsFloorView"), true);
  assert.equal(markets.includes("loadMarketsFloorData"), false);
  assert.equal(markets.includes("loadHomePreviewData"), false);
  assert.equal(auth.includes('revalidatePath("/", "layout")'), false);
  assert.equal(directory.includes('"layout"'), false);
});
