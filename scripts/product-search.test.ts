import assert from "node:assert/strict";
import { test } from "node:test";
import { FIND_CATEGORIES, FIND_PAGES, findPagesByCategory } from "../src/data/find-pages.ts";
import {
  FOOD_CATEGORIES,
  GOODS_CATEGORIES,
  menuCategoryLabel,
  menuInProductSearch,
  PET_FOOD_CATEGORY,
} from "../src/lib/product-categories.ts";
import {
  PRODUCT_CATEGORIES,
  PRODUCT_CATEGORY_LABELS,
} from "../src/types/database.ts";

test("new categories and pet-food have labels and are searchable", () => {
  for (const id of [
    "pet-food",
    "clothing-and-accessories",
    "home-and-kitchen",
    "art-and-stationery",
    "toys-and-kids",
    "health-and-wellness",
    "services",
    "garden-and-outdoor",
    "spices-and-seasonings",
    "oils-and-vinegars",
  ] as const) {
    assert.ok(PRODUCT_CATEGORIES.includes(id));
    assert.equal(menuInProductSearch(id), true);
    assert.equal(menuCategoryLabel(id), PRODUCT_CATEGORY_LABELS[id]);
  }
  assert.equal(PRODUCT_CATEGORY_LABELS["pet-food"], "Pet Food");
  assert.equal(menuCategoryLabel("pet-food"), "Pet Food");
  assert.equal(menuCategoryLabel("bread-and-bakery"), "Bread and bakery");
  assert.equal(menuCategoryLabel("clothing-and-accessories"), "Clothing and accessories");
  assert.equal(menuInProductSearch(null), true);
  assert.equal(menuInProductSearch("candles-and-crafts"), true);
  assert.equal(menuInProductSearch("not-a-category"), false);
});

test("find pages stay on people-food slugs; new groups hide when empty", () => {
  assert.equal(PET_FOOD_CATEGORY, "pet-food");
  assert.equal((FOOD_CATEGORIES as readonly string[]).includes("pet-food"), false);
  assert.ok((FOOD_CATEGORIES as readonly string[]).includes("spices-and-seasonings"));
  assert.ok((FOOD_CATEGORIES as readonly string[]).includes("oils-and-vinegars"));
  assert.ok((GOODS_CATEGORIES as readonly string[]).includes("clothing-and-accessories"));
  assert.ok(FIND_PAGES.every((page) => (FOOD_CATEGORIES as readonly string[]).includes(page.category)));
  assert.ok(FIND_PAGES.every((page) => page.category !== "pet-food"));
  assert.ok(FIND_CATEGORIES.some((category) => category.id === "pet-food" && category.label === "Pet Food"));
  assert.ok(
    FIND_CATEGORIES.some(
      (category) => category.id === "clothing-and-accessories" && category.label === "Clothing and accessories",
    ),
  );
  const shown = findPagesByCategory().map((category) => category.id);
  assert.equal(shown.includes("pet-food"), false);
  assert.equal(shown.includes("clothing-and-accessories"), false);
  assert.ok(shown.includes("preserves-and-sauces"));
});
