import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { isAbusiveCrawler } from "../src/lib/abusive-crawler.ts";
import {
  DIRECTORY_DATA_REVALIDATE_SECONDS,
  DIRECTORY_REVALIDATE_SECONDS,
} from "../src/lib/directory-cache.ts";

test("published directory rows are not rewritten every couple of minutes", () => {
  assert.ok(DIRECTORY_DATA_REVALIDATE_SECONDS >= 60 * 60);
  assert.equal(DIRECTORY_REVALIDATE_SECONDS, 120);
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
