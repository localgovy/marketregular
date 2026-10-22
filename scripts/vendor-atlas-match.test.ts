import assert from "node:assert/strict";
import { test } from "node:test";
import {
  matchFindPageByName,
  orderedSectionNames,
  stallCompareLabel,
} from "../src/lib/vendor-atlas-match.ts";

test("a longer product name beats an earlier shorter page", () => {
  const page = matchFindPageByName("Country sourdough bread", null);
  assert.equal(page?.slug, "sourdough-toronto");
});

test("an explicit product slug still wins over the item name", () => {
  const page = matchFindPageByName("Country loaf", "croissants");
  assert.equal(page?.slug, "croissants-toronto");
});

test("compare links name the stalls and the product", () => {
  assert.equal(stallCompareLabel(23, "Croissants"), "Compare 23 stalls selling croissants");
  assert.equal(stallCompareLabel(55, "General Bread"), "Compare 55 stalls selling bread");
});

test("numbered menu sections stay ahead of sections without an order", () => {
  assert.deepEqual(
    orderedSectionNames([
      { name: "Sweets", order: null },
      { name: "Breads", order: 1 },
      { name: "Drinks", order: 2 },
    ]),
    ["Breads", "Drinks", "Sweets"],
  );
});
