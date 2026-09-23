export type MapsPlace = {
  name?: string;
  address: string;
  city?: string;
  province?: string;
  lat?: number | null;
  lng?: number | null;
};

function hasPin(place: MapsPlace) {
  return Number.isFinite(place.lat) && Number.isFinite(place.lng);
}

export function mapsQuery(place: MapsPlace) {
  const street = place.address.trim();
  const city = place.city?.trim() ?? "";
  const province = place.province?.trim() ?? "";
  const name = place.name?.trim() ?? "";
  const locality = [city, province].filter(Boolean).join(" ");
  const where =
    street && city && street.toLowerCase().includes(city.toLowerCase())
      ? street
      : [street, locality].filter(Boolean).join(", ");
  return [name, where].filter(Boolean).join(", ");
}

export function googleMapsHref(place: MapsPlace) {
  const query = hasPin(place) ? `${place.lat},${place.lng}` : mapsQuery(place);
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function appleMapsHref(place: MapsPlace) {
  const q = encodeURIComponent(mapsQuery(place) || "Market");
  if (hasPin(place)) return `https://maps.apple.com/?ll=${place.lat},${place.lng}&q=${q}`;
  return `https://maps.apple.com/?q=${q}`;
}

export function androidMapsHref(place: MapsPlace) {
  const q = encodeURIComponent(mapsQuery(place) || "Market");
  if (hasPin(place)) return `geo:${place.lat},${place.lng}?q=${q}`;
  return `geo:0,0?q=${q}`;
}

export function mapsPlatform(ua = typeof navigator === "undefined" ? "" : navigator.userAgent) {
  if (/Android/i.test(ua)) return "android" as const;
  if (/iPhone|iPod/i.test(ua)) return "apple" as const;
  if (/iPad/i.test(ua)) return "apple" as const;
  if (typeof navigator !== "undefined" && navigator.maxTouchPoints > 1 && /Mac/i.test(ua)) {
    return "apple" as const;
  }
  return "desktop" as const;
}

export function mapsHref(place: MapsPlace, platform = mapsPlatform()) {
  if (platform === "apple") return appleMapsHref(place);
  if (platform === "android") return androidMapsHref(place);
  return googleMapsHref(place);
}

export function openMaps(place: MapsPlace) {
  const platform = mapsPlatform();
  const href = mapsHref(place, platform);
  if (platform === "desktop") {
    const link = document.createElement("a");
    link.href = href;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.click();
    return;
  }
  window.location.assign(href);
}
