"use server";

import { listMenuItemPhotoNames } from "@/lib/data/menu-item-photos";
import { validSaveSlug } from "@/lib/listing-saves";

const MAX_PAIRS = 480;
const MAX_NAME = 160;

function cleanPairs(value: unknown): Array<{ vendorSlug: string; name: string }> {
  if (!Array.isArray(value)) return [];
  const pairs: Array<{ vendorSlug: string; name: string }> = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = item as { vendorSlug?: unknown; name?: unknown };
    if (typeof row.vendorSlug !== "string" || !validSaveSlug(row.vendorSlug)) continue;
    if (typeof row.name !== "string") continue;
    const name = row.name.trim().slice(0, MAX_NAME);
    if (!name) continue;
    const key = `${row.vendorSlug}\n${name}`;
    if (seen.has(key)) continue;
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
  const photos = await listMenuItemPhotoNames();
  const grouped = new Map<string, Set<string>>();
  for (const photo of photos) {
    const key = `${photo.vendorSlug}\n${photo.name}`;
    const urls = grouped.get(key) ?? new Set<string>();
    urls.add(photo.imageUrl);
    grouped.set(key, urls);
  }
  const out: Record<string, string> = {};
  for (const pair of clean) {
    const key = `${pair.vendorSlug}\n${pair.name}`;
    const urls = grouped.get(key);
    if (!urls || urls.size !== 1) continue;
    const url = [...urls][0];
    if (url) out[key] = url;
  }
  return out;
}
