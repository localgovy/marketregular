/**
 * Some halls exist twice on purpose: one operator, two floors or two seasons. They are
 * not duplicates, but with near-identical names they compete for the same query and
 * neither wins. A qualifier makes the SERP entries tell themselves apart, and the sibling
 * link tells Google (and a shopper) how the two relate.
 */
type Sibling = {
  slug: string;
  /** Appended to the page title when the listing name does not already say which floor. */
  qualifier?: string;
  /** What makes this one different, in a shopper's words. */
  note: string;
  /**
   * How this listing relates to its sibling, written per pair. Some pairs are two
   * seasons, others are two buildings open at the same time — one generic phrase would
   * be wrong for half of them.
   */
  siblingLead: string;
  siblings: string[];
};

const SIBLINGS: Sibling[] = [
  {
    slug: "the-leslieville-farmers-market",
    qualifier: "Greenwood Park",
    note: "The outdoor Greenwood Park season, plus indoor Sundays either side of it.",
    siblingLead: "The indoor season runs at",
    siblings: ["leslieville-farmers-market-east-end-food-hub"],
  },
  {
    slug: "leslieville-farmers-market-east-end-food-hub",
    note: "The indoor season, before and after the Greenwood Park summer.",
    siblingLead: "The outdoor summer season is",
    siblings: ["the-leslieville-farmers-market"],
  },
  {
    slug: "sorauren-farmers-market",
    qualifier: "Sorauren Park",
    note: "The park floor, in Sorauren Avenue Park.",
    siblingLead: "From November to May it moves indoors to",
    siblings: ["sorauren-farmers-market-henderson-brewery"],
  },
  {
    slug: "sorauren-farmers-market-henderson-brewery",
    note: "The indoor winter season, November to May, at Henderson Brewing.",
    siblingLead: "The rest of the year it runs in the park as",
    siblings: ["sorauren-farmers-market"],
  },
  {
    slug: "uxbridge-farmers-market",
    qualifier: "summer season",
    note: "The Sunday summer season on the Second Wedge Brewing grounds.",
    siblingLead: "In November and December the operator also runs",
    siblings: ["uxbridge-farmers-market-holiday"],
  },
  {
    slug: "uxbridge-farmers-market-holiday",
    note: "The indoor holiday markets at Uxbridge Arena, November and December.",
    siblingLead: "The main summer season is",
    siblings: ["uxbridge-farmers-market"],
  },
  {
    slug: "whitby-farmers-market",
    qualifier: "Celebration Square",
    note: "The Wednesday market at Celebration Square in downtown Whitby.",
    siblingLead: "The same market also runs Saturdays as",
    siblings: ["brooklin-farmers-market"],
  },
  {
    slug: "brooklin-farmers-market",
    note: "The Saturday location of the same market, up in Brooklin.",
    siblingLead: "The Wednesday location downtown is",
    siblings: ["whitby-farmers-market"],
  },
  {
    slug: "st-lawrence-market",
    qualifier: "South Market",
    note: "The year-round South Market merchants, open most of the week.",
    siblingLead: "The Saturday farmers' market next door is",
    siblings: ["st-lawrence-farmers-market"],
  },
  {
    slug: "st-lawrence-farmers-market",
    qualifier: "Saturdays, North Market",
    note: "The Saturday farmers' market in the North Market building.",
    siblingLead: "The year-round South Market merchants are",
    siblings: ["st-lawrence-market"],
  },
];

const BY_SLUG = new Map(SIBLINGS.map((entry) => [entry.slug, entry]));

export function listingQualifier(slug: string) {
  return BY_SLUG.get(slug)?.qualifier ?? null;
}

export function listingNote(slug: string) {
  return BY_SLUG.get(slug)?.note ?? null;
}

export function siblingSlugs(slug: string) {
  return BY_SLUG.get(slug)?.siblings ?? [];
}

export function siblingLead(slug: string) {
  return BY_SLUG.get(slug)?.siblingLead ?? null;
}
