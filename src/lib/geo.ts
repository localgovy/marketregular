export type LatLng = { lat: number; lng: number };

const EARTH_M = 6_371_000;

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

export function distanceMeters(a: LatLng, b: LatLng) {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return 2 * EARTH_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function isWithinGeofence(
  user: LatLng,
  market: LatLng,
  radiusM: number,
) {
  return distanceMeters(user, market) <= radiusM;
}

export function formatDistance(meters: number) {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export type GeoMarket = {
  id: string;
  name: string;
  slug: string;
  lat: number;
  lng: number;
  geofence_radius_m: number;
  address: string;
  city: string;
};

export function toGeoMarket(market: GeoMarket): GeoMarket {
  return {
    id: market.id,
    name: market.name,
    slug: market.slug,
    lat: market.lat,
    lng: market.lng,
    geofence_radius_m: market.geofence_radius_m,
    address: market.address,
    city: market.city,
  };
}
