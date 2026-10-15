/**
 * Find slugs that 308 to `/products`. Some are still in `FIND_PAGES` so search
 * can match them. The products directory does not link to them.
 */
export const FIND_SLUGS_AT_PRODUCTS = [
  "lemon-toronto",
  "lemons-toronto",
  "oranges-toronto",
  "mango-toronto",
  "mangoes-toronto",
  "pineapple-toronto",
  "pineapples-toronto",
  "bananas-toronto",
  "turnips-toronto",
  "celery-toronto",
  "vegetables-toronto",
  "fruit-toronto",
  "meats-toronto",
  "poultry-toronto",
  "baked-goods-toronto",
  "desserts-toronto",
  "salads-toronto",
  "greens-toronto",
  "sauces-toronto",
  "citrus-toronto",
  "tropical-fruit-toronto",
  "grapes-toronto",
  "melons-toronto",
  "milk-toronto",
  "bee-pollen-toronto",
  "ice-cream-toronto",
  "apple-fritter-toronto",
  "burgers-toronto",
  "tacos-toronto",
  "caesar-salad-toronto",
  "greek-salad-toronto",
  "sausage-roll-toronto",
  "juices-toronto",
  "lemonade-toronto",
  "smoothies-toronto",
  "hot-sauce-toronto",
  "chutneys-toronto",
  "garlic-powder-toronto",
  "black-garlic-toronto",
  "garlic-scapes-toronto",
  "turnip-toronto",
  "parsnips-toronto",
  "peas-toronto",
  "cabbage-toronto",
  "cauliflower-toronto",
  "radishes-toronto",
  "arugula-toronto",
  "leeks-toronto",
  "fish-toronto",
  "pastries-toronto",
  "sweet-potatoes-toronto",
] as const;

const atProducts = new Set<string>(FIND_SLUGS_AT_PRODUCTS);

export function findSlugRedirectsToProducts(slug: string) {
  return atProducts.has(slug);
}
