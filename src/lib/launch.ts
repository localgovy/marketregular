/** Launch is Toronto-only. Other cities stay in seed for later, but the product ignores them. */
export const LAUNCH_CITY = "Toronto";
export const LAUNCH_PROVINCE = "ON";
export const LAUNCH_TZ = "America/Toronto";
export const LAUNCH_CENTER = { lat: 43.6532, lng: -79.3832 };
export const LAUNCH_ZOOM = 11;

export function isLaunchCity(city: string) {
  return city.trim().toLowerCase() === LAUNCH_CITY.toLowerCase();
}
