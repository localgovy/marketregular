/** Curated find pages. Search still covers every other food slug. */
export type FindPage = {
  /** Sentence-case name used in the title. */
  term: string;
  /** Route param, including the -toronto suffix. */
  slug: string;
  category: string;
  /** Exact vendor_menus.product_slug values this page lists. */
  matchSlugs: string[];
  vendors: number;
};

export const FIND_CATEGORIES = [
  { id: "bread-and-bakery", label: "Bread and bakery" },
  { id: "pies-and-sweets", label: "Pies and sweets" },
  { id: "prepared-foods", label: "Prepared food" },
  { id: "vegetables", label: "Vegetables" },
  { id: "apples-and-fruit", label: "Fruit" },
  { id: "meat-and-turkey", label: "Meat" },
  { id: "seafood", label: "Seafood" },
  { id: "eggs", label: "Eggs" },
  { id: "cheese-and-dairy", label: "Cheese and dairy" },
  { id: "honey", label: "Honey" },
  { id: "maple", label: "Maple" },
  { id: "preserves-and-sauces", label: "Preserves and sauces" },
  { id: "nuts-and-snacks", label: "Nuts and snacks" },
  { id: "coffee-and-tea", label: "Coffee and tea" },
  { id: "beverages", label: "Drinks" },
  { id: "alcohol", label: "Alcohol" },
] as const;

export const FIND_PAGES: FindPage[] = [
  { term: "Bread", slug: "bread-toronto", category: "bread-and-bakery", matchSlugs: ["bread"], vendors: 22 },
  { term: "Sourdough", slug: "sourdough-toronto", category: "bread-and-bakery", matchSlugs: ["sourdough"], vendors: 39 },
  { term: "Bagels", slug: "bagels-toronto", category: "bread-and-bakery", matchSlugs: ["bagels"], vendors: 11 },
  { term: "Croissants", slug: "croissants-toronto", category: "bread-and-bakery", matchSlugs: ["croissants", "almond-croissant"], vendors: 16 },
  { term: "Focaccia", slug: "focaccia-toronto", category: "bread-and-bakery", matchSlugs: ["focaccia"], vendors: 8 },
  { term: "Scones", slug: "scones-toronto", category: "bread-and-bakery", matchSlugs: ["scones"], vendors: 11 },
  { term: "Muffins", slug: "muffins-toronto", category: "bread-and-bakery", matchSlugs: ["muffins"], vendors: 7 },
  { term: "Cookies", slug: "cookies-toronto", category: "pies-and-sweets", matchSlugs: ["cookies", "chocolate-chip-cookies"], vendors: 39 },
  { term: "Pies", slug: "pies-toronto", category: "pies-and-sweets", matchSlugs: ["pies", "apple-pie", "pumpkin-pie"], vendors: 29 },
  { term: "Butter tarts", slug: "butter-tarts-toronto", category: "pies-and-sweets", matchSlugs: ["butter-tarts"], vendors: 17 },
  { term: "Cakes", slug: "cakes-toronto", category: "pies-and-sweets", matchSlugs: ["cakes", "cheesecake", "cupcakes"], vendors: 19 },
  { term: "Brownies", slug: "brownies-toronto", category: "pies-and-sweets", matchSlugs: ["brownies"], vendors: 10 },
  { term: "Cinnamon buns", slug: "cinnamon-buns-toronto", category: "pies-and-sweets", matchSlugs: ["cinnamon-buns"], vendors: 9 },
  { term: "Donuts", slug: "donuts-toronto", category: "pies-and-sweets", matchSlugs: ["donuts"], vendors: 6 },
  { term: "Tarts", slug: "tarts-toronto", category: "pies-and-sweets", matchSlugs: ["tarts"], vendors: 8 },
  { term: "Soups", slug: "soups-toronto", category: "prepared-foods", matchSlugs: ["soups"], vendors: 14 },
  { term: "Sandwiches", slug: "sandwiches-toronto", category: "prepared-foods", matchSlugs: ["sandwiches"], vendors: 12 },
  { term: "Pizza", slug: "pizza-toronto", category: "prepared-foods", matchSlugs: ["pizza"], vendors: 9 },
  { term: "Meat pies", slug: "meat-pies-toronto", category: "prepared-foods", matchSlugs: ["meat-pies"], vendors: 9 },
  { term: "Quiche", slug: "quiche-toronto", category: "prepared-foods", matchSlugs: ["quiche"], vendors: 8 },
  { term: "Perogies", slug: "perogies-toronto", category: "prepared-foods", matchSlugs: ["perogies"], vendors: 6 },
  { term: "Butter chicken", slug: "butter-chicken-toronto", category: "prepared-foods", matchSlugs: ["butter-chicken"], vendors: 7 },
  { term: "Jerk chicken", slug: "jerk-chicken-toronto", category: "prepared-foods", matchSlugs: ["jerk-chicken"], vendors: 6 },
  { term: "Tomatoes", slug: "tomatoes-toronto", category: "vegetables", matchSlugs: ["tomatoes", "cherry-tomatoes", "heirloom-tomatoes"], vendors: 52 },
  { term: "Garlic", slug: "garlic-toronto", category: "vegetables", matchSlugs: ["garlic"], vendors: 34 },
  { term: "Carrots", slug: "carrots-toronto", category: "vegetables", matchSlugs: ["carrots"], vendors: 27 },
  { term: "Potatoes", slug: "potatoes-toronto", category: "vegetables", matchSlugs: ["potatoes"], vendors: 20 },
  { term: "Peppers", slug: "peppers-toronto", category: "vegetables", matchSlugs: ["peppers"], vendors: 25 },
  { term: "Beans", slug: "beans-toronto", category: "vegetables", matchSlugs: ["beans", "green-beans"], vendors: 33 },
  { term: "Beets", slug: "beets-toronto", category: "vegetables", matchSlugs: ["beets"], vendors: 23 },
  { term: "Cucumbers", slug: "cucumbers-toronto", category: "vegetables", matchSlugs: ["cucumbers"], vendors: 20 },
  { term: "Onions", slug: "onions-toronto", category: "vegetables", matchSlugs: ["onions", "green-onions"], vendors: 19 },
  { term: "Sweet corn", slug: "sweet-corn-toronto", category: "vegetables", matchSlugs: ["sweet-corn", "corn"], vendors: 24 },
  { term: "Squash", slug: "squash-toronto", category: "vegetables", matchSlugs: ["squash"], vendors: 16 },
  { term: "Zucchini", slug: "zucchini-toronto", category: "vegetables", matchSlugs: ["zucchini"], vendors: 16 },
  { term: "Lettuce", slug: "lettuce-toronto", category: "vegetables", matchSlugs: ["lettuce", "romaine-lettuce"], vendors: 19 },
  { term: "Kale", slug: "kale-toronto", category: "vegetables", matchSlugs: ["kale"], vendors: 14 },
  { term: "Broccoli", slug: "broccoli-toronto", category: "vegetables", matchSlugs: ["broccoli"], vendors: 15 },
  { term: "Spinach", slug: "spinach-toronto", category: "vegetables", matchSlugs: ["spinach"], vendors: 12 },
  { term: "Mushrooms", slug: "mushrooms-toronto", category: "vegetables", matchSlugs: ["mushrooms"], vendors: 14 },
  { term: "Herbs", slug: "herbs-toronto", category: "vegetables", matchSlugs: ["herbs", "basil", "dill", "parsley", "rosemary", "thyme"], vendors: 33 },
  { term: "Asparagus", slug: "asparagus-toronto", category: "vegetables", matchSlugs: ["asparagus"], vendors: 15 },
  { term: "Eggplant", slug: "eggplant-toronto", category: "vegetables", matchSlugs: ["eggplant"], vendors: 17 },
  { term: "Pumpkins", slug: "pumpkins-toronto", category: "vegetables", matchSlugs: ["pumpkins"], vendors: 13 },
  { term: "Microgreens", slug: "microgreens-toronto", category: "vegetables", matchSlugs: ["microgreens", "broccoli-microgreens"], vendors: 16 },
  { term: "Bok choy", slug: "bok-choy-toronto", category: "vegetables", matchSlugs: ["bok-choy"], vendors: 9 },
  { term: "Okra", slug: "okra-toronto", category: "vegetables", matchSlugs: ["okra"], vendors: 6 },
  { term: "Apples", slug: "apples-toronto", category: "apples-and-fruit", matchSlugs: ["apples"], vendors: 26 },
  { term: "Strawberries", slug: "strawberries-toronto", category: "apples-and-fruit", matchSlugs: ["strawberries"], vendors: 22 },
  { term: "Raspberries", slug: "raspberries-toronto", category: "apples-and-fruit", matchSlugs: ["raspberries"], vendors: 22 },
  { term: "Blueberries", slug: "blueberries-toronto", category: "apples-and-fruit", matchSlugs: ["blueberries"], vendors: 10 },
  { term: "Peaches", slug: "peaches-toronto", category: "apples-and-fruit", matchSlugs: ["peaches", "nectarines"], vendors: 16 },
  { term: "Pears", slug: "pears-toronto", category: "apples-and-fruit", matchSlugs: ["pears"], vendors: 13 },
  { term: "Plums", slug: "plums-toronto", category: "apples-and-fruit", matchSlugs: ["plums"], vendors: 14 },
  { term: "Cherries", slug: "cherries-toronto", category: "apples-and-fruit", matchSlugs: ["cherries"], vendors: 11 },
  { term: "Rhubarb", slug: "rhubarb-toronto", category: "apples-and-fruit", matchSlugs: ["rhubarb"], vendors: 9 },
  { term: "Apricots", slug: "apricots-toronto", category: "apples-and-fruit", matchSlugs: ["apricots"], vendors: 9 },
  { term: "Blackberries", slug: "blackberries-toronto", category: "apples-and-fruit", matchSlugs: ["blackberries"], vendors: 6 },
  { term: "Beef", slug: "beef-toronto", category: "meat-and-turkey", matchSlugs: ["beef", "grass-fed-beef"], vendors: 25 },
  { term: "Pork", slug: "pork-toronto", category: "meat-and-turkey", matchSlugs: ["pork"], vendors: 14 },
  { term: "Chicken", slug: "chicken-toronto", category: "meat-and-turkey", matchSlugs: ["chicken", "free-range-chicken"], vendors: 26 },
  { term: "Sausages", slug: "sausages-toronto", category: "meat-and-turkey", matchSlugs: ["sausages", "breakfast-sausage", "summer-sausage"], vendors: 24 },
  { term: "Lamb", slug: "lamb-toronto", category: "meat-and-turkey", matchSlugs: ["lamb"], vendors: 10 },
  { term: "Bacon", slug: "bacon-toronto", category: "meat-and-turkey", matchSlugs: ["bacon"], vendors: 8 },
  { term: "Peameal bacon", slug: "peameal-bacon-toronto", category: "meat-and-turkey", matchSlugs: ["peameal-bacon"], vendors: 17 },
  { term: "Turkey", slug: "turkey-toronto", category: "meat-and-turkey", matchSlugs: ["turkey"], vendors: 8 },
  { term: "Pepperettes", slug: "pepperettes-toronto", category: "meat-and-turkey", matchSlugs: ["pepperettes"], vendors: 7 },
  { term: "Seafood", slug: "seafood-toronto", category: "seafood", matchSlugs: ["seafood"], vendors: 49 },
  { term: "Eggs", slug: "eggs-toronto", category: "eggs", matchSlugs: ["eggs"], vendors: 31 },
  { term: "Cheese", slug: "cheese-toronto", category: "cheese-and-dairy", matchSlugs: ["cheese"], vendors: 16 },
  { term: "Honey", slug: "honey-toronto", category: "honey", matchSlugs: ["honey", "comb-honey", "honeycomb"], vendors: 56 },
  { term: "Creamed honey", slug: "creamed-honey-toronto", category: "honey", matchSlugs: ["creamed-honey"], vendors: 8 },
  { term: "Maple syrup", slug: "maple-syrup-toronto", category: "maple", matchSlugs: ["maple-syrup"], vendors: 36 },
  { term: "Maple butter", slug: "maple-butter-toronto", category: "maple", matchSlugs: ["maple-butter"], vendors: 9 },
  { term: "Jams", slug: "jams-toronto", category: "preserves-and-sauces", matchSlugs: ["jams", "jellies"], vendors: 16 },
  { term: "Pickles", slug: "pickles-toronto", category: "preserves-and-sauces", matchSlugs: ["pickles"], vendors: 14 },
  { term: "Preserves", slug: "preserves-toronto", category: "preserves-and-sauces", matchSlugs: ["preserves"], vendors: 11 },
  { term: "Apple butter", slug: "apple-butter-toronto", category: "preserves-and-sauces", matchSlugs: ["apple-butter"], vendors: 6 },
  { term: "Dried fruits", slug: "dried-fruits-toronto", category: "nuts-and-snacks", matchSlugs: ["dried-fruits"], vendors: 8 },
  { term: "Coffee", slug: "coffee-toronto", category: "coffee-and-tea", matchSlugs: ["coffee"], vendors: 11 },
  { term: "Tea", slug: "tea-toronto", category: "coffee-and-tea", matchSlugs: ["tea", "matcha"], vendors: 15 },
  { term: "Apple cider", slug: "apple-cider-toronto", category: "beverages", matchSlugs: ["apple-cider"], vendors: 18 },
  { term: "Wine", slug: "wine-toronto", category: "alcohol", matchSlugs: ["wine"], vendors: 37 },
];

const bySlug = new Map(FIND_PAGES.map((page) => [page.slug, page]));

export function findPageBySlug(slug: string) {
  return bySlug.get(slug) ?? null;
}

export function findPageForProductSlug(productSlug: string | null | undefined) {
  if (!productSlug) return null;
  return FIND_PAGES.find((page) => page.matchSlugs.includes(productSlug)) ?? null;
}

export function findPagesByCategory() {
  return FIND_CATEGORIES.map((category) => ({
    ...category,
    pages: FIND_PAGES.filter((page) => page.category === category.id),
  })).filter((category) => category.pages.length > 0);
}
