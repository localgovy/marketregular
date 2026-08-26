import { isTrustedSiteHost } from "@/lib/site-host";

/** One word. Never “Market Regular”. */
export const SITE_NAME = "MarketRegular";
export const SITE_TAGLINE = "Toronto farmers' markets, this week.";

/** User-facing name of the day planner. Never “slip” or “planner”. */
export const DAY_PLAN_NAME = "ticket";
export const DAY_PLAN_TODAY = `Today’s ${DAY_PLAN_NAME}`;
export const DAY_PLAN_HASH = "ticket";
export const DAY_PLAN_SAVED_HREF = `/saved#${DAY_PLAN_HASH}`;

function canonicalSiteUrl() {
  const raw = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.marketregular.com").replace(
    /\/$/,
    "",
  );
  try {
    const url = new URL(raw);
    // Live Vercel sends apex → www. Sitemap and canonicals must match the final host.
    if (url.hostname === "marketregular.com") url.hostname = "www.marketregular.com";
    if (isTrustedSiteHost(url.hostname) && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
      url.protocol = "https:";
    }
    return url.origin;
  } catch {
    return "https://www.marketregular.com";
  }
}

export const SITE_URL = canonicalSiteUrl();
export const SITE_WORDMARK = "/brand/marketregular-wordmark.png";
export const SITE_LOGO = "/brand/marketregular-logo.png";
export const SITE_OG = "/brand/marketregular-og.png";

/** Studio that builds MarketRegular. Wordmark is lowercase. */
export const STUDIO_NAME = "localgovy";
export const STUDIO_URL = "https://localgovy.com";
export const STUDIO_LOGO = "/brand/localgovy-mark.png";
export const STUDIO_WORDMARK = "/brand/localgovy-wordmark.png";

/** Inbox for stall and market claim requests. */
export const CLAIM_INBOX = "noah@localgovy.com";

export const CONTACT_NAME = "Noah Khan";
export const CONTACT_EMAIL = CLAIM_INBOX;

export const PROVINCES = [
  { code: "AB", name: "Alberta", tz: "America/Edmonton" },
  { code: "BC", name: "British Columbia", tz: "America/Vancouver" },
  { code: "MB", name: "Manitoba", tz: "America/Winnipeg" },
  { code: "NB", name: "New Brunswick", tz: "America/Moncton" },
  { code: "NL", name: "Newfoundland and Labrador", tz: "America/St_Johns" },
  { code: "NS", name: "Nova Scotia", tz: "America/Halifax" },
  { code: "NT", name: "Northwest Territories", tz: "America/Yellowknife" },
  { code: "NU", name: "Nunavut", tz: "America/Iqaluit" },
  { code: "ON", name: "Ontario", tz: "America/Toronto" },
  { code: "PE", name: "Prince Edward Island", tz: "America/Halifax" },
  { code: "QC", name: "Quebec", tz: "America/Toronto" },
  { code: "SK", name: "Saskatchewan", tz: "America/Regina" },
  { code: "YT", name: "Yukon", tz: "America/Whitehorse" },
] as const;

export type ProvinceCode = (typeof PROVINCES)[number]["code"];

export const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export const PRODUCT_TAGS = [
  "produce",
  "organic",
  "bakery",
  "cheese",
  "meat",
  "seafood",
  "eggs",
  "dairy",
  "mushrooms",
  "maple",
  "flowers",
  "plants",
  "honey",
  "preserves",
  "prepared-food",
  "coffee",
  "beer",
  "cider",
  "wine",
  "vegan",
  "gluten-free",
  "crafts",
  "jewelry",
] as const;

export const AMENITY_TAGS = [
  "indoor",
  "outdoor",
  "year-round",
  "seasonal",
  "parking",
  "transit",
  "accessible",
  "card-accepted",
  "atm",
] as const;

export const RECORD_TAGS = ["black-owned", "indigenous", "campus"] as const;

/** Cuisine / origin people search by. Adjectives, not country names. */
export const COUNTRY_TAGS = [
  "afghan",
  "argentinian",
  "belgian",
  "bolivian",
  "brazilian",
  "british",
  "cambodian",
  "caribbean",
  "chinese",
  "colombian",
  "dutch",
  "egyptian",
  "eritrean",
  "ethiopian",
  "filipino",
  "french",
  "german",
  "ghanaian",
  "greek",
  "guatemalan",
  "haitian",
  "hungarian",
  "indian",
  "italian",
  "jamaican",
  "japanese",
  "korean",
  "lebanese",
  "malaysian",
  "mediterranean",
  "mexican",
  "middle-eastern",
  "moroccan",
  "nepali",
  "nigerian",
  "pakistani",
  "persian",
  "peruvian",
  "polish",
  "portuguese",
  "salvadoran",
  "somali",
  "spanish",
  "sri-lankan",
  "syrian",
  "taiwanese",
  "thai",
  "tibetan",
  "trinidadian",
  "turkish",
  "ukrainian",
  "venezuelan",
  "vietnamese",
  "west-african",
] as const;

export const FLOOR_TAGS = [
  "peaches",
  "tomatoes",
  "strawberries",
  "bread",
  "flowers",
  "prawns",
  "honey",
  "cheese",
  "cider",
  "coffee",
  "pie",
  "corn",
] as const;

export const DEFAULT_GEOFENCE_M = 250;

export function provinceName(code: string) {
  return PROVINCES.find((p) => p.code === code)?.name ?? code;
}

export function provinceTz(code: string) {
  return PROVINCES.find((p) => p.code === code)?.tz ?? "America/Toronto";
}

export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
