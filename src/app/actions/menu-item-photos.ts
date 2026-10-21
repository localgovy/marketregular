"use server";

import { listMenuItemPhotoNames } from "@/lib/data/menu-item-photos";
import { menuItemPhotoPairKey, photoUrlsForPairs } from "@/lib/menu-item-photo-match";
import { validSaveSlug } from "@/lib/listing-saves";
import { savedItemName } from "@/lib/product-saves";

const MAX_PAIRS = 480;

function cleanPairs(value: unknown): Array<{ vendorSlug: string; name: string }> {
  if (!Array.isArray(value)) return [];
  const pairs: Array<{ vendorSlug: string; name: string }> = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = item as { vendorSlug?: unknown; name?: unknown };
    if (typeof row.vendorSlug !== "string" || !validSaveSlug(row.vendorSlug)) continue;
    const name = savedItemName(row.name);
    if (!name) continue;
    const key = menuItemPhotoPairKey(row.vendorSlug, name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    pairs.push({ vendorSlug: row.vendorSlug, name });
    if (pairs.length >= MAX_PAIRS) break;
  }
  return pairs;
}

/** Public picture URLs for saved item names. The caller does not supply the URL. */
export async function menuItemPhotoUrls(pairs: unknown): Promise<Record<string, string>> {
  const clean = cleanPairs(pairs);
  if (!clean.length) return {};
  try {
    const photos = await listMenuItemPhotoNames();
    return photoUrlsForPairs(photos, clean);
  } catch (error) {
    console.error("menu item photos", error instanceof Error ? error.message : "failed");
    return {};
  }
}
