import { validSaveSlug } from "@/lib/listing-saves";
import { savedItemName } from "@/lib/product-saves";

/** Same string the save stores and the picture lookup uses. */
export function menuItemPhotoPairKey(vendorSlug: string, name: string) {
  if (!validSaveSlug(vendorSlug)) return null;
  const cleaned = savedItemName(name);
  if (!cleaned) return null;
  return `${vendorSlug}\n${cleaned}`;
}

export function photoUrlsForPairs(
  photos: Array<{ vendorSlug: string; name: string; imageUrl: string }>,
  pairs: Array<{ vendorSlug: string; name: string }>,
): Record<string, string> {
  const grouped = new Map<string, Set<string>>();
  for (const photo of photos) {
    const key = menuItemPhotoPairKey(photo.vendorSlug, photo.name);
    if (!key) continue;
    const urls = grouped.get(key) ?? new Set<string>();
    urls.add(photo.imageUrl);
    grouped.set(key, urls);
  }
  const out: Record<string, string> = {};
  for (const pair of pairs) {
    const key = menuItemPhotoPairKey(pair.vendorSlug, pair.name);
    if (!key) continue;
    const urls = grouped.get(key);
    if (!urls || urls.size !== 1) continue;
    const url = [...urls][0];
    if (url) out[key] = url;
  }
  return out;
}
