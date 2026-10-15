import assert from "node:assert/strict";
import { test } from "node:test";
import { FIND_CATEGORIES, FIND_PAGES } from "../src/data/find-pages.ts";
import {
  FOOD_CATEGORIES,
  menuCategoryLabel,
  menuInProductSearch,
  PET_FOOD_CATEGORY,
} from "../src/lib/product-categories.ts";
import {
  PRODUCT_CATEGORIES,
  PRODUCT_CATEGORY_LABELS,
} from "../src/types/database.ts";

test("pet-food is a stored category labelled Pet Food", () => {
  assert.ok(PRODUCT_CATEGORIES.includes("pet-food"));
  assert.equal(PRODUCT_CATEGORY_LABELS["pet-food"], "Pet Food");
  assert.equal(menuCategoryLabel("pet-food"), "Pet Food");
  assert.equal(menuCategoryLabel("bread-and-bakery"), "Bread and bakery");
});

test("pet-food is in product search and not on people-food find pages", () => {
  assert.equal(PET_FOOD_CATEGORY, "pet-food");
  assert.equal(menuInProductSearch("pet-food"), true);
  assert.equal(menuInProductSearch("bread-and-bakery"), true);
  assert.equal(menuInProductSearch("candles-and-crafts"), false);
  assert.equal((FOOD_CATEGORIES as readonly string[]).includes("pet-food"), false);
  assert.ok(FIND_CATEGORIES.some((category) => category.id === "pet-food" && category.label === "Pet Food"));
  assert.ok(FIND_PAGES.every((page) => page.category !== "pet-food"));
});
