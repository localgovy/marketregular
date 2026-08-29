import { PRODUCT_TAGS } from "@/lib/constants";
import { storedCountryTags } from "@/lib/country-tags";

const PRODUCT_SET = new Set<string>(PRODUCT_TAGS);

/** Name hints → product tags. Specific needles first so "fish market" is seafood, not a market. */
const HINTS: Array<{ tag: (typeof PRODUCT_TAGS)[number]; needles: string[] }> = [
  {
    tag: "seafood",
    needles: ["seafood", "sea cove", "fish", "caviar", "prawn", "lobster", "oyster", "salmon", "trout"],
  },
  {
    tag: "jewelry",
    needles: ["jewellery", "jewelry", "beads"],
  },
  {
    tag: "meat",
    needles: ["meats", "meat", "butcher", "boucherie", "carnicero", "sausage", "steak", "uppercut"],
  },
  {
    tag: "cheese",
    needles: ["cheesemonger", "cheese", "cheddar"],
  },
  {
    tag: "dairy",
    needles: ["dairy", "creamery", "gelato", "ice cream", "butter"],
  },
  {
    tag: "bakery",
    needles: [
      "bakery",
      "baker",
      "bagel",
      "bread",
      "pastry",
      "cake",
      "cookie",
      "chocolate",
      "sweet",
      "pie",
      "donut",
      "croissant",
    ],
  },
  {
    tag: "coffee",
    needles: ["coffee", "cafe", "café", "espresso"],
  },
  {
    tag: "beer",
    needles: ["brewery", "brewing", "beer"],
  },
  {
    tag: "cider",
    needles: ["cider", "cidery"],
  },
  {
    tag: "wine",
    needles: ["wine", "winery", "vineyard"],
  },
  {
    tag: "honey",
    needles: ["honey", "apiary"],
  },
  {
    tag: "maple",
    needles: ["maple", "sugarshack"],
  },
  {
    tag: "flowers",
    needles: ["flower", "bloom", "bouquet", "florist"],
  },
  {
    tag: "plants",
    needles: ["plant", "nursery", "lavender"],
  },
  {
    tag: "mushrooms",
    needles: ["mushroom"],
  },
  {
    tag: "eggs",
    needles: ["egg"],
  },
  {
    tag: "preserves",
    needles: ["preserve", "jam", "mustard", "pickle", "chutney", "kimchi"],
  },
  {
    tag: "gluten-free",
    needles: ["gluten-free", "gluten free", "g-free"],
  },
  {
    tag: "vegan",
    needles: ["vegan"],
  },
  {
    tag: "crafts",
    needles: [
      "accessor",
      "craft",
      "pottery",
      "ceramic",
      "leather",
      "knit",
      "textile",
      "gift",
      "wares",
      "candle",
    ],
  },
  {
    tag: "prepared-food",
    needles: [
      "prepared",
      "restaurant",
      "kitchen",
      "deli",
      "delicatessen",
      "sushi",
      "pizza",
      "pasta",
      "crepe",
      "churrasco",
      "juice",
      "gourmet",
      "eatery",
    ],
  },
  {
    tag: "organic",
    needles: ["organic"],
  },
  {
    tag: "produce",
    needles: ["produce", "vegetable", "fruit", "orchard", "greengrocer", "farm", "microgreen"],
  },
];

function fold(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Both ends are anchored. Without a trailing boundary "butter" matched Butterfly,
 * "fish" matched Fisher and "plant" matched Plantation, so a name-only stall picked up
 * Dairy, Seafood or Plants it had nothing to do with.
 */
function mentions(hay: string, needle: string) {
  if (needle.includes(" ")) return hay.includes(needle);
  const inflected = `${needle}(?:s|es|ed|ing|ery|ies)?`;
  return new RegExp(`(?:^|[^a-z])${inflected}(?:[^a-z]|$)`).test(hay);
}

export function guessVendorTags(name: string) {
  const hay = fold(name);
  const tags: string[] = [];
  for (const hint of HINTS) {
    if (tags.includes(hint.tag)) continue;
    if (hint.needles.some((needle) => mentions(hay, needle))) tags.push(hint.tag);
  }
  return tags;
}

/**
 * Roster-only shops arrive with no tags, and a name guess keeps them reachable through
 * the filters. The guess goes to `searchTags`, never to `tags`: a guess is not a fact and
 * must not render on the page as though the shop told us.
 */
export function withVendorProductTags<T extends { name: string; tags: string[] }>(
  vendor: T,
): T & { searchTags?: string[] } {
  if (vendor.tags.some((tag) => PRODUCT_SET.has(tag))) return vendor;
  const extra = guessVendorTags(vendor.name);
  if (!extra.length) return vendor;
  return { ...vendor, searchTags: [...new Set([...(vendor as { searchTags?: string[] }).searchTags ?? [], ...extra])] };
}

/** Everything a stall can be matched on: what it told us, plus what we inferred. */
export function vendorFilterTags(vendor: { tags: string[]; searchTags?: string[] }) {
  if (!vendor.searchTags?.length) return vendor.tags;
  return [...new Set([...vendor.tags, ...vendor.searchTags])];
}

/** Display only, so stored tags only. */
export function vendorProductTags(name: string, stored: string[] = []) {
  return [...stored.filter((tag) => PRODUCT_SET.has(tag)), ...storedCountryTags(stored)];
}
