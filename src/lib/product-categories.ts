import {
  PRODUCT_CATEGORIES,
  PRODUCT_CATEGORY_LABELS,
  type ProductCategory,
} from "@/types/database";

/** People-food categories listed on find pages. Pet food, baby goods, and gift sets are not in this list. */
export const FOOD_CATEGORIES = [
  "bread-and-bakery",
  "eggs",
  "honey",
  "cheese-and-dairy",
  "maple",
  "apples-and-fruit",
  "vegetables",
  "meat-and-turkey",
  "pies-and-sweets",
  "prepared-foods",
  "preserves-and-sauces",
  "coffee-and-tea",
  "alcohol",
  "seafood",
  "flour-and-grains",
  "nuts-and-snacks",
  "beverages",
  "spices-and-seasonings",
  "oils-and-vinegars",
] as const;

export const GOODS_CATEGORIES = [
  "clothing-and-accessories",
  "home-and-kitchen",
  "art-and-stationery",
  "toys-and-kids",
  "baby",
  "gifts-and-sets",
  "health-and-wellness",
  "services",
  "garden-and-outdoor",
] as const;

export const PET_FOOD_CATEGORY = "pet-food" satisfies ProductCategory;

export const BABY_CATEGORY = "baby" satisfies ProductCategory;

export const GIFTS_CATEGORY = "gifts-and-sets" satisfies ProductCategory;

/** Older goods buckets a classifier find page can still list. */
export const LEGACY_GOODS_CATEGORIES = [
  "plants-and-flowers",
  "body-care",
  "candles-and-crafts",
  "jewellery-and-accessories",
  "other",
] as const;

export type FindClassifierScope = "food" | "goods" | "any";

/** Categories a find page may list. Pet food is never included. Baby goods and gift sets are included for goods and any. */
export function categoriesForFindScope(scope: FindClassifierScope | undefined) {
  if (scope === "goods") {
    return {
      categories: [...GOODS_CATEGORIES, ...LEGACY_GOODS_CATEGORIES],
      includeNull: true,
    };
  }
  if (scope === "any") {
    return {
      categories: [...FOOD_CATEGORIES, ...GOODS_CATEGORIES, ...LEGACY_GOODS_CATEGORIES],
      includeNull: true,
    };
  }
  return {
    categories: [...FOOD_CATEGORIES],
    includeNull: false,
  };
}

const PRODUCT_SEARCH_CATEGORY_SET = new Set<string>(PRODUCT_CATEGORIES);

/** Label for a stored category slug. */
export function menuCategoryLabel(category: string) {
  if (category in PRODUCT_CATEGORY_LABELS) {
    return PRODUCT_CATEGORY_LABELS[category as ProductCategory];
  }
  const [head, ...rest] = category.split("-");
  if (!head) return category;
  return [head.slice(0, 1).toUpperCase() + head.slice(1), ...rest].join(" ");
}

/**
 * Product search keeps food, pet food, goods, and the older craft buckets.
 * Classified items of any of those categories (and null) can match.
 * Pet-food rows still need a pet word in search_products.
 * Baby rows still need a baby word in search_products.
 * Gift sets are always allowed. They are not gated.
 */
export function menuInProductSearch(category: string | null | undefined) {
  if (category == null) return true;
  return PRODUCT_SEARCH_CATEGORY_SET.has(category);
}
