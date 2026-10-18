import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { FIND_CATEGORIES, FIND_PAGES, findPagesByCategory, listedFindPages } from "../src/data/find-pages.ts";
import { COUNTRY_TAGS } from "../src/lib/constants.ts";
import {
  BABY_CATEGORY,
  GIFTS_CATEGORY,
  categoriesForFindScope,
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
    "baby",
    "gifts-and-sets",
  ] as const) {
    assert.ok(PRODUCT_CATEGORIES.includes(id));
    assert.equal(menuInProductSearch(id), true);
    assert.equal(menuCategoryLabel(id), PRODUCT_CATEGORY_LABELS[id]);
  }
  assert.equal(PRODUCT_CATEGORY_LABELS["pet-food"], "Pet Food");
  assert.equal(menuCategoryLabel("pet-food"), "Pet Food");
  assert.equal(PRODUCT_CATEGORY_LABELS.baby, "Baby goods");
  assert.equal(menuCategoryLabel("baby"), "Baby goods");
  assert.equal(PRODUCT_CATEGORY_LABELS["gifts-and-sets"], "Gift sets and boxes");
  assert.equal(menuCategoryLabel("gifts-and-sets"), "Gift sets and boxes");
  assert.equal(menuCategoryLabel("bread-and-bakery"), "Bread and bakery");
  assert.equal(menuCategoryLabel("clothing-and-accessories"), "Clothing and accessories");
  assert.equal(menuInProductSearch(null), true);
  assert.equal(menuInProductSearch("candles-and-crafts"), true);
  assert.equal(menuInProductSearch("not-a-category"), false);
});

test("find pages stay off pet food; empty groups stay hidden", () => {
  assert.equal(PET_FOOD_CATEGORY, "pet-food");
  assert.equal(BABY_CATEGORY, "baby");
  assert.equal(GIFTS_CATEGORY, "gifts-and-sets");
  assert.equal((FOOD_CATEGORIES as readonly string[]).includes("pet-food"), false);
  assert.equal((FOOD_CATEGORIES as readonly string[]).includes("baby"), false);
  assert.equal((FOOD_CATEGORIES as readonly string[]).includes("gifts-and-sets"), false);
  assert.ok((GOODS_CATEGORIES as readonly string[]).includes("baby"));
  assert.ok((GOODS_CATEGORIES as readonly string[]).includes("gifts-and-sets"));
  assert.ok((FOOD_CATEGORIES as readonly string[]).includes("spices-and-seasonings"));
  assert.ok((FOOD_CATEGORIES as readonly string[]).includes("oils-and-vinegars"));
  assert.ok((GOODS_CATEGORIES as readonly string[]).includes("clothing-and-accessories"));
  const browseGroups = new Set<string>([
    ...FOOD_CATEGORIES,
    ...GOODS_CATEGORIES,
    "cuisine",
    "production",
    "format",
  ]);
  assert.ok(FIND_PAGES.every((page) => browseGroups.has(page.category)));
  assert.ok(FIND_PAGES.every((page) => page.category !== "pet-food"));
  assert.ok(FIND_PAGES.every((page) => page.vendors > 0));
  const slugs = FIND_PAGES.map((page) => page.slug);
  assert.equal(new Set(slugs).size, slugs.length);
  assert.ok(FIND_CATEGORIES.some((category) => category.id === "pet-food" && category.label === "Pet Food"));
  assert.ok(FIND_CATEGORIES.some((category) => category.id === "baby" && category.label === "Baby goods"));
  assert.ok(
    FIND_CATEGORIES.some(
      (category) => category.id === "gifts-and-sets" && category.label === "Gift sets and boxes",
    ),
  );
  assert.ok(
    FIND_CATEGORIES.some(
      (category) => category.id === "clothing-and-accessories" && category.label === "Clothing and accessories",
    ),
  );
  const shown = findPagesByCategory().map((category) => category.id);
  assert.equal(shown.includes("pet-food"), false);
  for (const id of [
    "clothing-and-accessories",
    "home-and-kitchen",
    "art-and-stationery",
    "toys-and-kids",
    "baby",
    "gifts-and-sets",
    "health-and-wellness",
    "services",
    "garden-and-outdoor",
    "spices-and-seasonings",
    "oils-and-vinegars",
    "cuisine",
    "production",
    "format",
  ]) {
    assert.ok(shown.includes(id), id);
  }
  assert.ok(shown.includes("preserves-and-sauces"));
  assert.equal(listedFindPages([{ ...FIND_PAGES[0]!, vendors: 0 }]).length, 0);
});

test("classifier find pages map kinds, origin, production, and format", () => {
  const dumplings = FIND_PAGES.find((page) => page.slug === "dumplings-toronto");
  assert.deepEqual(dumplings?.matchClassifiers, ["kind.dumplings"]);
  assert.equal(dumplings?.classifierScope, "food");
  const indian = FIND_PAGES.find((page) => page.slug === "indian-food-toronto");
  assert.deepEqual(indian?.matchClassifiers, ["origin.indian"]);
  assert.equal(indian?.classifierScope, "food");
  const organic = FIND_PAGES.find((page) => page.slug === "organic-toronto");
  assert.deepEqual(organic?.matchClassifiers, ["production.organic"]);
  const frozen = FIND_PAGES.find((page) => page.slug === "frozen-toronto");
  assert.deepEqual(frozen?.matchClassifiers, ["format.frozen"]);
  const giftCards = FIND_PAGES.find((page) => page.slug === "gift-cards-toronto");
  assert.equal(giftCards?.category, "services");
  assert.equal(giftCards?.classifierScope, "goods");
  const babyGoods = FIND_PAGES.find((page) => page.slug === "baby-goods-toronto");
  assert.equal(babyGoods?.category, "baby");
  assert.equal(babyGoods?.classifierScope, "goods");
  const giftSets = FIND_PAGES.find((page) => page.slug === "gift-sets-toronto");
  assert.equal(giftSets?.category, "gifts-and-sets");
  assert.deepEqual(giftSets?.matchClassifiers, ["format.gift-set"]);
  assert.equal(giftSets?.classifierScope, "any");
  const food = categoriesForFindScope("food");
  assert.equal(food.includeNull, false);
  assert.equal(food.categories.includes("pet-food"), false);
  assert.equal(food.categories.includes("baby"), false);
  assert.equal(food.categories.includes("gifts-and-sets"), false);
  assert.equal(food.categories.includes("prepared-foods"), true);
  const goods = categoriesForFindScope("goods");
  assert.equal(goods.includeNull, true);
  assert.equal(goods.categories.includes("pet-food"), false);
  assert.equal(goods.categories.includes("baby"), true);
  assert.equal(goods.categories.includes("gifts-and-sets"), true);
  assert.equal(goods.categories.includes("clothing-and-accessories"), true);
  assert.equal(goods.categories.includes("prepared-foods"), false);
  const any = categoriesForFindScope("any");
  assert.equal(any.categories.includes("pet-food"), false);
  assert.equal(any.categories.includes("baby"), true);
  assert.equal(any.categories.includes("gifts-and-sets"), true);
  assert.equal(any.categories.includes("prepared-foods"), true);
  assert.equal(any.categories.includes("services"), true);
});

test("the search migration covers cuisine tags and gift-card phrases", () => {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const sql = readFileSync(
    join(root, "supabase/migrations/20261015203000_search_cuisine_and_goods_terms.sql"),
    "utf8",
  );
  for (const tag of COUNTRY_TAGS) {
    assert.ok(sql.includes(`'${tag}'`), tag);
  }
  assert.match(sql, /'gift card'/);
  assert.match(sql, /'gift cards'/);
  assert.match(sql, /kind\.gift-cards/);
  assert.match(sql, /security invoker/);
  assert.match(sql, /grant execute on function public\.search_products/);
});
