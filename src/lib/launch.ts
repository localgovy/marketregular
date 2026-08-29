/** Launch covers Toronto and the Greater Toronto Area. Cities outside this list stay in seed, hidden. */
export const LAUNCH_CITY = "Toronto";
/** User-facing coverage when the rest of the GTA needs naming. */
export const LAUNCH_COVERAGE = "Toronto, including GTA";
export const LAUNCH_REGION = "GTA";
export const LAUNCH_REGION_NAME = "Greater Toronto Area";
export const LAUNCH_PROVINCE = "ON";
export const LAUNCH_TZ = "America/Toronto";
export const LAUNCH_CENTER = { lat: 43.7, lng: -79.4 };
export const LAUNCH_ZOOM = 9;

/** Census row id. Opaque — not a display name. */
export const DIRECTORY_CENSUS_ID = "toronto";

/** Official GTA municipalities plus city values used on listings. */
export const LAUNCH_CITIES = [
  "Acton",
  "Ajax",
  "Aurora",
  "Brampton",
  "Brock",
  "Burlington",
  "Caledon",
  "Clarington",
  "East Gwillimbury",
  "East York",
  "Etobicoke",
  "Georgetown",
  "Georgina",
  "Halton Hills",
  "King",
  "King City",
  "Markham",
  "Milton",
  "Mississauga",
  "Newcastle",
  "Newmarket",
  "North York",
  "Oakville",
  "Oshawa",
  "Pickering",
  "Port Perry",
  "Richmond Hill",
  "Scarborough",
  "Scugog",
  "Stouffville",
  "Toronto",
  "Uxbridge",
  "Vaughan",
  "Whitby",
  "Whitchurch-Stouffville",
  "Woodbridge",
] as const;

export const LAUNCH_CITY_FILTER: string[] = [...LAUNCH_CITIES];

const LAUNCH_CITY_SET = new Set(LAUNCH_CITIES.map((city) => city.toLowerCase()));

export function isLaunchCity(city: string) {
  return LAUNCH_CITY_SET.has(city.trim().toLowerCase());
}
