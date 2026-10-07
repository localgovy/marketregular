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
  { term: "Bread", slug: "bread-toronto", category: "bread-and-bakery", matchSlugs: ["bread"], vendors: 55 },
  { term: "Sourdough", slug: "sourdough-toronto", category: "bread-and-bakery", matchSlugs: ["sourdough"], vendors: 39 },
  { term: "Bagels", slug: "bagels-toronto", category: "bread-and-bakery", matchSlugs: ["bagels"], vendors: 21 },
  { term: "Croissants", slug: "croissants-toronto", category: "bread-and-bakery", matchSlugs: ["croissants", "almond-croissant"], vendors: 23 },
  { term: "Focaccia", slug: "focaccia-toronto", category: "bread-and-bakery", matchSlugs: ["focaccia"], vendors: 11 },
  { term: "Scones", slug: "scones-toronto", category: "bread-and-bakery", matchSlugs: ["scones"], vendors: 17 },
  { term: "Muffins", slug: "muffins-toronto", category: "bread-and-bakery", matchSlugs: ["muffins"], vendors: 22 },
  { term: "Cookies", slug: "cookies-toronto", category: "pies-and-sweets", matchSlugs: ["cookies", "chocolate-chip-cookies"], vendors: 82 },
  { term: "Pies", slug: "pies-toronto", category: "pies-and-sweets", matchSlugs: ["pies", "apple-pie", "pumpkin-pie"], vendors: 61 },
  { term: "Butter tarts", slug: "butter-tarts-toronto", category: "pies-and-sweets", matchSlugs: ["butter-tarts"], vendors: 27 },
  { term: "Cakes", slug: "cakes-toronto", category: "pies-and-sweets", matchSlugs: ["cakes", "cheesecake", "cupcakes"], vendors: 71 },
  { term: "Brownies", slug: "brownies-toronto", category: "pies-and-sweets", matchSlugs: ["brownies"], vendors: 29 },
  { term: "Cinnamon buns", slug: "cinnamon-buns-toronto", category: "pies-and-sweets", matchSlugs: ["cinnamon-buns"], vendors: 15 },
  { term: "Donuts", slug: "donuts-toronto", category: "pies-and-sweets", matchSlugs: ["donuts"], vendors: 18 },
  { term: "Tarts", slug: "tarts-toronto", category: "pies-and-sweets", matchSlugs: ["tarts"], vendors: 20 },
  { term: "Pastries", slug: "pastries-toronto", category: "pies-and-sweets", matchSlugs: ["pastries"], vendors: 14 },
  { term: "Ice cream", slug: "ice-cream-toronto", category: "pies-and-sweets", matchSlugs: ["ice-cream"], vendors: 17 },
  { term: "Apple fritters", slug: "apple-fritter-toronto", category: "pies-and-sweets", matchSlugs: ["apple-fritter"], vendors: 7 },
  { term: "Soups", slug: "soups-toronto", category: "prepared-foods", matchSlugs: ["soups"], vendors: 44 },
  { term: "Sandwiches", slug: "sandwiches-toronto", category: "prepared-foods", matchSlugs: ["sandwiches"], vendors: 19 },
  { term: "Pizza", slug: "pizza-toronto", category: "prepared-foods", matchSlugs: ["pizza"], vendors: 27 },
  { term: "Meat pies", slug: "meat-pies-toronto", category: "prepared-foods", matchSlugs: ["meat-pies"], vendors: 21 },
  { term: "Quiche", slug: "quiche-toronto", category: "prepared-foods", matchSlugs: ["quiche"], vendors: 11 },
  { term: "Perogies", slug: "perogies-toronto", category: "prepared-foods", matchSlugs: ["perogies"], vendors: 14 },
  { term: "Butter chicken", slug: "butter-chicken-toronto", category: "prepared-foods", matchSlugs: ["butter-chicken"], vendors: 12 },
  { term: "Jerk chicken", slug: "jerk-chicken-toronto", category: "prepared-foods", matchSlugs: ["jerk-chicken"], vendors: 11 },
  { term: "Burgers", slug: "burgers-toronto", category: "prepared-foods", matchSlugs: ["burgers"], vendors: 26 },
  { term: "Tacos", slug: "tacos-toronto", category: "prepared-foods", matchSlugs: ["tacos"], vendors: 15 },
  { term: "Sausage rolls", slug: "sausage-roll-toronto", category: "prepared-foods", matchSlugs: ["sausage-roll"], vendors: 7 },
  { term: "Tomatoes", slug: "tomatoes-toronto", category: "vegetables", matchSlugs: ["tomatoes", "cherry-tomatoes", "heirloom-tomatoes"], vendors: 63 },
  { term: "Garlic", slug: "garlic-toronto", category: "vegetables", matchSlugs: ["garlic"], vendors: 46 },
  { term: "Carrots", slug: "carrots-toronto", category: "vegetables", matchSlugs: ["carrots"], vendors: 30 },
  { term: "Parsnips", slug: "parsnips-toronto", category: "vegetables", matchSlugs: ["parsnips"], vendors: 5 },
  { term: "Potatoes", slug: "potatoes-toronto", category: "vegetables", matchSlugs: ["potatoes"], vendors: 27 },
  { term: "Sweet potatoes", slug: "sweet-potatoes-toronto", category: "vegetables", matchSlugs: ["sweet-potatoes"], vendors: 8 },
  { term: "Peppers", slug: "peppers-toronto", category: "vegetables", matchSlugs: ["peppers"], vendors: 30 },
  { term: "Beans", slug: "beans-toronto", category: "vegetables", matchSlugs: ["beans", "green-beans"], vendors: 36 },
  { term: "Peas", slug: "peas-toronto", category: "vegetables", matchSlugs: ["peas"], vendors: 18 },
  { term: "Beets", slug: "beets-toronto", category: "vegetables", matchSlugs: ["beets"], vendors: 27 },
  { term: "Turnips", slug: "turnip-toronto", category: "vegetables", matchSlugs: ["turnip"], vendors: 8 },
  { term: "Cucumbers", slug: "cucumbers-toronto", category: "vegetables", matchSlugs: ["cucumbers"], vendors: 26 },
  { term: "Onions", slug: "onions-toronto", category: "vegetables", matchSlugs: ["onions", "green-onions"], vendors: 24 },
  { term: "Leeks", slug: "leeks-toronto", category: "vegetables", matchSlugs: ["leeks"], vendors: 9 },
  { term: "Sweet corn", slug: "sweet-corn-toronto", category: "vegetables", matchSlugs: ["sweet-corn", "corn"], vendors: 30 },
  { term: "Squash", slug: "squash-toronto", category: "vegetables", matchSlugs: ["squash"], vendors: 24 },
  { term: "Zucchini", slug: "zucchini-toronto", category: "vegetables", matchSlugs: ["zucchini"], vendors: 19 },
  { term: "Lettuce", slug: "lettuce-toronto", category: "vegetables", matchSlugs: ["lettuce", "romaine-lettuce"], vendors: 25 },
  { term: "Arugula", slug: "arugula-toronto", category: "vegetables", matchSlugs: ["arugula"], vendors: 10 },
  { term: "Cabbage", slug: "cabbage-toronto", category: "vegetables", matchSlugs: ["cabbage"], vendors: 15 },
  { term: "Kale", slug: "kale-toronto", category: "vegetables", matchSlugs: ["kale"], vendors: 24 },
  { term: "Broccoli", slug: "broccoli-toronto", category: "vegetables", matchSlugs: ["broccoli"], vendors: 17 },
  { term: "Cauliflower", slug: "cauliflower-toronto", category: "vegetables", matchSlugs: ["cauliflower"], vendors: 11 },
  { term: "Spinach", slug: "spinach-toronto", category: "vegetables", matchSlugs: ["spinach"], vendors: 15 },
  { term: "Mushrooms", slug: "mushrooms-toronto", category: "vegetables", matchSlugs: ["mushrooms"], vendors: 25 },
  { term: "Herbs", slug: "herbs-toronto", category: "vegetables", matchSlugs: ["herbs", "basil", "dill", "parsley", "rosemary", "thyme"], vendors: 38 },
  { term: "Asparagus", slug: "asparagus-toronto", category: "vegetables", matchSlugs: ["asparagus"], vendors: 16 },
  { term: "Eggplant", slug: "eggplant-toronto", category: "vegetables", matchSlugs: ["eggplant"], vendors: 18 },
  { term: "Pumpkins", slug: "pumpkins-toronto", category: "vegetables", matchSlugs: ["pumpkins"], vendors: 14 },
  { term: "Radishes", slug: "radishes-toronto", category: "vegetables", matchSlugs: ["radishes"], vendors: 17 },
  { term: "Microgreens", slug: "microgreens-toronto", category: "vegetables", matchSlugs: ["microgreens", "broccoli-microgreens"], vendors: 20 },
  { term: "Bok choy", slug: "bok-choy-toronto", category: "vegetables", matchSlugs: ["bok-choy"], vendors: 10 },
  { term: "Okra", slug: "okra-toronto", category: "vegetables", matchSlugs: ["okra"], vendors: 6 },
  { term: "Apples", slug: "apples-toronto", category: "apples-and-fruit", matchSlugs: ["apples"], vendors: 35 },
  { term: "Strawberries", slug: "strawberries-toronto", category: "apples-and-fruit", matchSlugs: ["strawberries"], vendors: 28 },
  { term: "Raspberries", slug: "raspberries-toronto", category: "apples-and-fruit", matchSlugs: ["raspberries"], vendors: 24 },
  { term: "Blueberries", slug: "blueberries-toronto", category: "apples-and-fruit", matchSlugs: ["blueberries"], vendors: 16 },
  { term: "Blackberries", slug: "blackberries-toronto", category: "apples-and-fruit", matchSlugs: ["blackberries"], vendors: 7 },
  { term: "Peaches", slug: "peaches-toronto", category: "apples-and-fruit", matchSlugs: ["peaches", "nectarines"], vendors: 18 },
  { term: "Pears", slug: "pears-toronto", category: "apples-and-fruit", matchSlugs: ["pears"], vendors: 17 },
  { term: "Plums", slug: "plums-toronto", category: "apples-and-fruit", matchSlugs: ["plums"], vendors: 15 },
  { term: "Cherries", slug: "cherries-toronto", category: "apples-and-fruit", matchSlugs: ["cherries"], vendors: 15 },
  { term: "Grapes", slug: "grapes-toronto", category: "apples-and-fruit", matchSlugs: ["grapes"], vendors: 10 },
  { term: "Melons", slug: "melons-toronto", category: "apples-and-fruit", matchSlugs: ["melons"], vendors: 11 },
  { term: "Oranges", slug: "oranges-toronto", category: "apples-and-fruit", matchSlugs: ["oranges"], vendors: 9 },
  { term: "Rhubarb", slug: "rhubarb-toronto", category: "apples-and-fruit", matchSlugs: ["rhubarb"], vendors: 11 },
  { term: "Apricots", slug: "apricots-toronto", category: "apples-and-fruit", matchSlugs: ["apricots"], vendors: 9 },
  { term: "Beef", slug: "beef-toronto", category: "meat-and-turkey", matchSlugs: ["beef", "grass-fed-beef"], vendors: 45 },
  { term: "Pork", slug: "pork-toronto", category: "meat-and-turkey", matchSlugs: ["pork"], vendors: 37 },
  { term: "Chicken", slug: "chicken-toronto", category: "meat-and-turkey", matchSlugs: ["chicken", "free-range-chicken"], vendors: 44 },
  { term: "Sausages", slug: "sausages-toronto", category: "meat-and-turkey", matchSlugs: ["sausages", "breakfast-sausage", "summer-sausage"], vendors: 51 },
  { term: "Lamb", slug: "lamb-toronto", category: "meat-and-turkey", matchSlugs: ["lamb"], vendors: 26 },
  { term: "Bacon", slug: "bacon-toronto", category: "meat-and-turkey", matchSlugs: ["bacon"], vendors: 20 },
  { term: "Peameal bacon", slug: "peameal-bacon-toronto", category: "meat-and-turkey", matchSlugs: ["peameal-bacon"], vendors: 17 },
  { term: "Turkey", slug: "turkey-toronto", category: "meat-and-turkey", matchSlugs: ["turkey"], vendors: 16 },
  { term: "Pepperettes", slug: "pepperettes-toronto", category: "meat-and-turkey", matchSlugs: ["pepperettes"], vendors: 14 },
  { term: "Seafood", slug: "seafood-toronto", category: "seafood", matchSlugs: ["seafood"], vendors: 49 },
  { term: "Eggs", slug: "eggs-toronto", category: "eggs", matchSlugs: ["eggs"], vendors: 47 },
  { term: "Cheese", slug: "cheese-toronto", category: "cheese-and-dairy", matchSlugs: ["cheese"], vendors: 41 },
  { term: "Milk", slug: "milk-toronto", category: "cheese-and-dairy", matchSlugs: ["milk"], vendors: 14 },
  { term: "Honey", slug: "honey-toronto", category: "honey", matchSlugs: ["honey", "comb-honey", "honeycomb"], vendors: 78 },
  { term: "Creamed honey", slug: "creamed-honey-toronto", category: "honey", matchSlugs: ["creamed-honey"], vendors: 8 },
  { term: "Bee pollen", slug: "bee-pollen-toronto", category: "honey", matchSlugs: ["bee-pollen"], vendors: 8 },
  { term: "Maple syrup", slug: "maple-syrup-toronto", category: "maple", matchSlugs: ["maple-syrup"], vendors: 43 },
  { term: "Maple butter", slug: "maple-butter-toronto", category: "maple", matchSlugs: ["maple-butter"], vendors: 9 },
  { term: "Jams", slug: "jams-toronto", category: "preserves-and-sauces", matchSlugs: ["jams", "jellies"], vendors: 44 },
  { term: "Pickles", slug: "pickles-toronto", category: "preserves-and-sauces", matchSlugs: ["pickles"], vendors: 32 },
  { term: "Preserves", slug: "preserves-toronto", category: "preserves-and-sauces", matchSlugs: ["preserves"], vendors: 14 },
  { term: "Apple butter", slug: "apple-butter-toronto", category: "preserves-and-sauces", matchSlugs: ["apple-butter"], vendors: 8 },
  { term: "Hot sauce", slug: "hot-sauce-toronto", category: "preserves-and-sauces", matchSlugs: ["hot-sauce"], vendors: 24 },
  { term: "Chutneys", slug: "chutneys-toronto", category: "preserves-and-sauces", matchSlugs: ["chutneys"], vendors: 14 },
  { term: "Olive oil", slug: "olive-oil-toronto", category: "preserves-and-sauces", matchSlugs: ["olive-oil"], vendors: 15 },
  { term: "Dried fruits", slug: "dried-fruits-toronto", category: "nuts-and-snacks", matchSlugs: ["dried-fruits"], vendors: 8 },
  { term: "Coffee", slug: "coffee-toronto", category: "coffee-and-tea", matchSlugs: ["coffee"], vendors: 37 },
  { term: "Tea", slug: "tea-toronto", category: "coffee-and-tea", matchSlugs: ["tea", "matcha"], vendors: 45 },
  { term: "Apple cider", slug: "apple-cider-toronto", category: "beverages", matchSlugs: ["apple-cider"], vendors: 9 },
  { term: "Lemonade", slug: "lemonade-toronto", category: "beverages", matchSlugs: ["lemonade"], vendors: 16 },
  { term: "Smoothies", slug: "smoothies-toronto", category: "beverages", matchSlugs: ["smoothies"], vendors: 14 },
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
