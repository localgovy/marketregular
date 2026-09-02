/** City used in titles and the default map. */
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

/**
 * Bundled seed and place chips. Live listings and the homepage census follow
 * `status = published`, so a new city is counted as soon as it is published.
 */
export const LAUNCH_CITIES = [
  "Acton",
  "Ajax",
  "Ancaster",
  "Aurora",
  "Barrie",
  "Bradford",
  "Brampton",
  "Brock",
  "Burlington",
  "Caledon",
  "Clarington",
  "Dundas",
  "East Gwillimbury",
  "East York",
  "Etobicoke",
  "Georgetown",
  "Georgina",
  "Halton Hills",
  "Hamilton",
  "Innisfil",
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
  "Stoney Creek",
  "Stouffville",
  "Toronto",
  "Uxbridge",
  "Vaughan",
  "Waterdown",
  "Whitby",
  "Whitchurch-Stouffville",
  "Woodbridge",
] as const;

const LAUNCH_CITY_SET = new Set(LAUNCH_CITIES.map((city) => city.toLowerCase()));

export function isLaunchCity(city: string) {
  return LAUNCH_CITY_SET.has(city.trim().toLowerCase());
}
