import "server-only";

import { createServiceClient } from "@/lib/supabase/admin";
import { menuItemPhotoUrl, publishedMenuSelectMissingPhoto } from "@/lib/menu-item-photo-url";

export type MenuItemPhotoName = {
  vendorSlug: string;
  name: string;
  imageUrl: string;
};

const PHOTO_TTL_MS = 120_000;

let photoNames: { at: number; rows: MenuItemPhotoName[] } | null = null;

type PageResult<T> = { data: T[] | null; error: { message?: string; code?: string } | null };

/**
 * In-process copy of photo rows. Next's data cache rejects one entry over 2MB,
 * and a picture on every menu item can pass that. This refreshes every 2 minutes
 * per server process and does not fetch image bytes.
 */
export async function listMenuItemPhotoNames(): Promise<MenuItemPhotoName[]> {
  const now = Date.now();
  if (photoNames && now - photoNames.at < PHOTO_TTL_MS) return photoNames.rows;
  try {
    const rows = await readMenuItemPhotoNames();
    photoNames = { at: now, rows };
    return rows;
  } catch (error) {
    console.error("menu item photos", error instanceof Error ? error.message : "failed");
    photoNames = { at: now, rows: [] };
    return [];
  }
}

async function readMenuItemPhotoNames(): Promise<MenuItemPhotoName[]> {
  const supabase = createServiceClient();
  if (!supabase) return [];

  const photos: Array<{ id: string; imageUrl: string }> = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = (await supabase
      .from("menu_item_photos")
      .select("menu_id, image_url")
      .order("menu_id")
      .range(from, from + 999)) as PageResult<{
      menu_id: string;
      image_url: string;
    }>;
    if (error) {
      const message = error.message ?? "";
      if (publishedMenuSelectMissingPhoto(error) || /menu_item_photos|schema cache/i.test(message)) return [];
      throw new Error("Could not load menu item photos");
    }
    const chunk = data ?? [];
    for (const row of chunk) {
      const imageUrl = menuItemPhotoUrl(row.image_url, row.menu_id);
      if (!imageUrl || typeof row.menu_id !== "string") continue;
      photos.push({ id: row.menu_id, imageUrl });
    }
    if (chunk.length < 1000) break;
  }
  if (!photos.length) return [];

  const menus = new Map<string, { vendorId: string; name: string }>();
  for (let index = 0; index < photos.length; index += 80) {
    const ids = photos.slice(index, index + 80).map((photo) => photo.id);
    const { data, error } = (await supabase
      .from("published_menus")
      .select("id, vendor_id, name")
      .in("id", ids)) as PageResult<{ id: string; vendor_id: string; name: string }>;
    if (error) throw new Error("Could not load menu item photos");
    for (const row of data ?? []) {
      const name = typeof row.name === "string" ? row.name.trim() : "";
      if (!name || typeof row.id !== "string" || typeof row.vendor_id !== "string") continue;
      menus.set(row.id, { vendorId: row.vendor_id, name });
    }
  }

  const vendorIds = [...new Set([...menus.values()].map((row) => row.vendorId))];
  const slugById = new Map<string, string>();
  for (let index = 0; index < vendorIds.length; index += 80) {
    const ids = vendorIds.slice(index, index + 80);
    const { data, error } = (await supabase
      .from("published_vendors")
      .select("id, slug")
      .in("id", ids)) as PageResult<{ id: string; slug: string }>;
    if (error) throw new Error("Could not load menu item photos");
    for (const row of data ?? []) {
      if (typeof row.id === "string" && typeof row.slug === "string") slugById.set(row.id, row.slug);
    }
  }

  return photos.flatMap((photo) => {
    const menu = menus.get(photo.id);
    const vendorSlug = menu ? slugById.get(menu.vendorId) : undefined;
    if (!menu || !vendorSlug) return [];
    return [{ vendorSlug, name: menu.name, imageUrl: photo.imageUrl }];
  });
}
