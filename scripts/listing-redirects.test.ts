import assert from "node:assert/strict";
import { test } from "node:test";
import {
  flattenListingRedirects,
  isListingRedirectSource,
  LISTING_REDIRECTS,
  listingRedirectDestination,
  listingRedirectsForNextConfig,
} from "../src/data/listing-redirects.ts";
import { parseListingPath } from "../src/lib/listing-alias-lookup.ts";
import { publicSitemapEntries } from "../src/lib/sitemap-entries.ts";

test("listing redirects are unique and single-hop", () => {
  const sources = LISTING_REDIRECTS.map((row) => row.source);
  assert.equal(new Set(sources).size, sources.length);
  const sourceSet = new Set(sources);
  for (const row of LISTING_REDIRECTS) {
    assert.notEqual(row.source, row.destination);
    assert.equal(sourceSet.has(row.destination), false, row.source);
  }
});

test("GSC 404 slugs that were renamed or retired redirect", () => {
  assert.equal(listingRedirectDestination("/vendors/clement-s-poultry"), "/vendors/clement-poultry");
  assert.equal(listingRedirectDestination("/markets/yzd-farmers-market"), "/markets");
  assert.equal(listingRedirectDestination("/vendors/gebeta-toronto"), "/vendors/gebeta");
  assert.equal(
    listingRedirectDestination("/vendors/pilliteri-estate-winery"),
    "/vendors/pillitteri-estates-winery",
  );
});

test("flattenListingRedirects collapses a chain", () => {
  const flat = flattenListingRedirects([
    { source: "/vendors/a", destination: "/vendors/b" },
    { source: "/vendors/b", destination: "/vendors/c" },
  ]);
  const bySource = Object.fromEntries(flat.map((row) => [row.source, row.destination]));
  assert.equal(bySource["/vendors/a"], "/vendors/c");
  assert.equal(bySource["/vendors/b"], "/vendors/c");
});

test("next.config listing redirects stay permanent", () => {
  for (const row of listingRedirectsForNextConfig()) {
    assert.equal(row.permanent, true);
    assert.equal(isListingRedirectSource(row.source), true);
  }
});

test("parseListingPath ignores directory indexes", () => {
  assert.deepEqual(parseListingPath("/vendors/clement-poultry"), { kind: "vendor", slug: "clement-poultry" });
  assert.deepEqual(parseListingPath("/markets/yzd-farmers-market"), { kind: "market", slug: "yzd-farmers-market" });
  assert.equal(parseListingPath("/markets"), null);
  assert.equal(parseListingPath("/markets/day"), null);
  assert.equal(parseListingPath("/markets/open-today"), null);
  assert.equal(parseListingPath("/markets/tag"), null);
  assert.equal(parseListingPath("/markets/day/sunday"), null);
  assert.equal(parseListingPath("/vendors/hooked/buy/abc"), null);
});

test("sitemap drops redirect sources and keeps the live slug", () => {
  const paths = publicSitemapEntries({
    markets: [{ slug: "yzd-farmers-market" }, { slug: "wychwood-barns" }],
    vendors: [{ slug: "clement-s-poultry" }, { slug: "clement-poultry" }, { slug: "hooked" }],
    posts: [],
  }).map((entry) => entry.path);
  assert.equal(paths.includes("/markets/yzd-farmers-market"), false);
  assert.equal(paths.includes("/vendors/clement-s-poultry"), false);
  assert.ok(paths.includes("/markets/wychwood-barns"));
  assert.ok(paths.includes("/vendors/clement-poultry"));
  assert.ok(paths.includes("/vendors/hooked"));
});
