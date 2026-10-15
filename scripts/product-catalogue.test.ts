import assert from "node:assert/strict";
import { test } from "node:test";
import { FIND_SLUGS_AT_PRODUCTS } from "../src/data/find-redirects.ts";
import {
  BREAKFAST_ID,
  BREAKFAST_SLUGS,
  FEATURED_PRODUCT_SLUGS,
  catalogueAisles,
  filterCatalogue,
  liveFindPages,
  parseAisle,
  sortCatalogue,
} from "../src/lib/product-catalogue.ts";

const live = liveFindPages();
const liveSlugs = new Set(live.map((page) => page.slug));

test("folded find slugs stay out of the products directory", () => {
  assert.equal(FIND_SLUGS_AT_PRODUCTS.includes("oranges-toronto"), true);
  assert.equal(FIND_SLUGS_AT_PRODUCTS.includes("sourdough-toronto"), false);
  for (const slug of FIND_SLUGS_AT_PRODUCTS) {
    assert.equal(liveSlugs.has(slug), false, slug);
  }
});

test("featured and breakfast products are live find pages", () => {
  for (const slug of FEATURED_PRODUCT_SLUGS) assert.equal(liveSlugs.has(slug), true, slug);
  for (const slug of BREAKFAST_SLUGS) assert.equal(liveSlugs.has(slug), true, slug);
  assert.equal(filterCatalogue(live, BREAKFAST_ID).length, BREAKFAST_SLUGS.length);
});

test("featured order leads with sourdough and name order is alphabetical", () => {
  assert.equal(sortCatalogue(live, "featured")[0]?.slug, "sourdough-toronto");
  const named = sortCatalogue(live, "name").map((page) => page.term);
  const sorted = [...named].sort((a, b) => a.localeCompare(b, "en-CA"));
  assert.deepEqual(named, sorted);
});

test("an unknown aisle is ignored and every live aisle has a page", () => {
  assert.equal(parseAisle("not-an-aisle"), null);
  assert.equal(parseAisle("  vegetables  "), "vegetables");
  assert.equal(parseAisle("breakfast"), "breakfast");
  const aisles = catalogueAisles(live);
  assert.equal(aisles.length, 16);
  assert.ok(aisles.every((aisle) => aisle.pages.length > 0));
});
