import { PRODUCT_TAGS } from "@/lib/constants";

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

function mentions(hay: string, needle: string) {
  if (needle.includes(" ")) return hay.includes(needle);
  const stem = needle.length <= 3 ? `${needle}(?:[^a-z]|$)` : needle;
  return new RegExp(`(?:^|[^a-z])${stem}`).test(hay);
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

export function vendorProductTags(name: string, stored: string[] = []) {
  const fromRecord = stored.filter((tag) => PRODUCT_SET.has(tag));
  if (fromRecord.length) return fromRecord;
  return guessVendorTags(name);
}
