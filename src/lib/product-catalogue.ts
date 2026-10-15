import { FIND_CATEGORIES, FIND_PAGES } from "@/data/find-pages";
import { findSlugRedirectsToProducts } from "@/data/find-redirects";
import { parseCatalogueSort, type CatalogueSort } from "@/lib/product-browse-href";

export type { CatalogueSort };
export { parseCatalogueSort };

export const BREAKFAST_ID = "breakfast";

/** Six aisles shown as tiles. The rest are chips. */
export const FEATURED_AISLE_IDS = [
  "vegetables",
  "apples-and-fruit",
  "bread-and-bakery",
  "pies-and-sweets",
  "cheese-and-dairy",
  "prepared-foods",
] as const;

/** Editorial order for the opening grid. Not a popularity ranking. */
export const FEATURED_PRODUCT_SLUGS = [
  "sourdough-toronto",
  "eggs-toronto",
  "honey-toronto",
  "apples-toronto",
  "cheese-toronto",
  "coffee-toronto",
  "cookies-toronto",
  "pizza-toronto",
  "croissants-toronto",
  "maple-syrup-toronto",
  "carrots-toronto",
  "tea-toronto",
] as const;

export const BREAKFAST_SLUGS = [
  "sourdough-toronto",
  "eggs-toronto",
  "honey-toronto",
  "coffee-toronto",
  "croissants-toronto",
  "maple-syrup-toronto",
] as const;

export const PRODUCT_TRIES = [
  { term: "Sourdough", slug: "sourdough-toronto" },
  { term: "Eggs", slug: "eggs-toronto" },
  { term: "Honey", slug: "honey-toronto" },
  { term: "Coffee", slug: "coffee-toronto" },
] as const;

const AISLE_LINES: Record<string, string> = {
  "bread-and-bakery": "Loaves, bagels, and the bakery stall",
  "pies-and-sweets": "Pies, cookies, cakes, and tarts",
  "prepared-foods": "Soups, sandwiches, and cooked plates",
  vegetables: "Greens, roots, and the rest of the stall",
  "apples-and-fruit": "Apples, berries, and stone fruit",
  "meat-and-turkey": "Beef, pork, chicken, and sausages",
  seafood: "Fish and seafood",
  eggs: "Eggs",
  "cheese-and-dairy": "Cheese and dairy",
  honey: "Honey",
  maple: "Maple syrup and maple butter",
  "preserves-and-sauces": "Jams, pickles, and preserves",
  "nuts-and-snacks": "Dried fruit and snacks",
  "coffee-and-tea": "Coffee and tea",
  beverages: "Cider and other drinks",
  alcohol: "Wine",
};

const aisleIds = new Set<string>([BREAKFAST_ID, ...FIND_CATEGORIES.map((category) => category.id)]);

export type CataloguePage = {
  term: string;
  slug: string;
  category: string;
  categoryLabel: string;
};

export type CatalogueAisle = {
  id: string;
  label: string;
  line: string;
  pages: CataloguePage[];
};

export function parseAisle(value: string | null | undefined) {
  const aisle = value?.trim() ?? "";
  return aisleIds.has(aisle) ? aisle : null;
}

export function aisleLabel(aisle: string) {
  if (aisle === BREAKFAST_ID) return "Breakfast";
  return FIND_CATEGORIES.find((category) => category.id === aisle)?.label ?? null;
}

export function aisleLine(aisle: string) {
  if (aisle === BREAKFAST_ID) return "Bread, eggs, honey, coffee, and maple.";
  return AISLE_LINES[aisle] ?? "";
}

/** Curated find pages that still resolve. Folded slugs stay in search, not here. */
export function liveFindPages(): CataloguePage[] {
  const labels = new Map<string, string>(
    FIND_CATEGORIES.map((category) => [category.id, category.label]),
  );
  return FIND_PAGES.filter((page) => !findSlugRedirectsToProducts(page.slug)).map((page) => ({
    term: page.term,
    slug: page.slug,
    category: page.category,
    categoryLabel: labels.get(page.category) ?? page.category,
  }));
}

export function catalogueAisles(pages: CataloguePage[]): CatalogueAisle[] {
  return FIND_CATEGORIES.map((category) => ({
    id: category.id,
    label: category.label,
    line: AISLE_LINES[category.id] ?? "",
    pages: pages.filter((page) => page.category === category.id),
  })).filter((aisle) => aisle.pages.length > 0);
}

export function splitAisles(aisles: CatalogueAisle[]) {
  const byId = new Map(aisles.map((aisle) => [aisle.id, aisle]));
  const featured = FEATURED_AISLE_IDS.flatMap((id) => {
    const aisle = byId.get(id);
    return aisle ? [aisle] : [];
  });
  const featuredIds = new Set<string>(featured.map((aisle) => aisle.id));
  return {
    featured,
    rest: aisles.filter((aisle) => !featuredIds.has(aisle.id)),
  };
}

export function filterCatalogue(pages: CataloguePage[], aisle: string | null) {
  if (!aisle) return pages;
  if (aisle === BREAKFAST_ID) {
    const wanted = new Set<string>(BREAKFAST_SLUGS);
    return pages.filter((page) => wanted.has(page.slug));
  }
  return pages.filter((page) => page.category === aisle);
}

export function sortCatalogue(pages: CataloguePage[], sort: CatalogueSort) {
  if (sort === "name") {
    return [...pages].sort((a, b) => a.term.localeCompare(b.term, "en-CA"));
  }
  const rank = new Map<string, number>(FEATURED_PRODUCT_SLUGS.map((slug, index) => [slug, index]));
  return [...pages].sort((a, b) => {
    const ai = rank.get(a.slug);
    const bi = rank.get(b.slug);
    if (ai != null && bi != null) return ai - bi;
    if (ai != null) return -1;
    if (bi != null) return 1;
    return 0;
  });
}

export function catalogueHeading(aisle: string | null) {
  if (!aisle) {
    return {
      title: "Find a product",
      blurb: "A short list to start from. The full directory is below.",
    };
  }
  const label = aisleLabel(aisle) ?? "Products";
  const line = aisleLine(aisle);
  return {
    title: label,
    blurb: line && line !== label ? line : "Stalls that list it, and the markets where they set up.",
  };
}
