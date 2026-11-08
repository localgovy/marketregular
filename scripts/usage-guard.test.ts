import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";
import { test } from "node:test";
import { isAbusiveCrawler } from "../src/lib/abusive-crawler.ts";
import {
  DIRECTORY_DATA_REVALIDATE_SECONDS,
  DIRECTORY_REVALIDATE_SECONDS,
} from "../src/lib/directory-cache.ts";

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

test("known scrapers are refused and browsers are not", () => {
  assert.equal(isAbusiveCrawler("Lightpanda/1.0"), true);
  assert.equal(
    isAbusiveCrawler(
      "Mozilla/5.0 (Linux; Android 5.0) AppleWebKit/537.36 (KHTML, like Gecko) Mobile Safari/537.36 (compatible; Bytespider; spider-feedback@bytedance.com)",
    ),
    true,
  );
  assert.equal(isAbusiveCrawler("Mozilla/5.0 (compatible; DotBot/1.2; +https://opensiteexplorer.org/dotbot)"), true);
  assert.equal(
    isAbusiveCrawler(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    ),
    false,
  );
  assert.equal(
    isAbusiveCrawler(
      "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    ),
    false,
  );
  assert.equal(isAbusiveCrawler(null), false);
  assert.equal(isAbusiveCrawler(""), false);
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
