export const SITE_NAME = "Market Regular";
export const SITE_TAGLINE = "Toronto farmers' markets, this week.";
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://marketregular.com";

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
  "flowers",
  "honey",
  "preserves",
  "prepared-food",
  "coffee",
  "crafts",
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
  "family-friendly",
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
