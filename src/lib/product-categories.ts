import {
  PRODUCT_CATEGORY_LABELS,
  type ProductCategory,
} from "@/types/database";

/** People-food categories listed on find pages. Pet food is searchable, not here. */
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
] as const;

export const PET_FOOD_CATEGORY = "pet-food" satisfies ProductCategory;

const PRODUCT_SEARCH_CATEGORY_SET = new Set<string>([...FOOD_CATEGORIES, PET_FOOD_CATEGORY]);

/** Label for a stored category slug. */
export function menuCategoryLabel(category: string) {
  if (category in PRODUCT_CATEGORY_LABELS) {
    return PRODUCT_CATEGORY_LABELS[category as ProductCategory];
  }
  const [head, ...rest] = category.split("-");
  if (!head) return category;
  return [head.slice(0, 1).toUpperCase() + head.slice(1), ...rest].join(" ");
}

/** Product search keeps a menu row when its category is people food or pet food. */
export function menuInProductSearch(category: string | null | undefined) {
  return typeof category === "string" && PRODUCT_SEARCH_CATEGORY_SET.has(category);
}
