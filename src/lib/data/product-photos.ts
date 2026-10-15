import "server-only";
import { unstable_cache } from "next/cache";
import { createServiceClient } from "@/lib/supabase/admin";

export type ProductPhoto = {
  url: string;
  alt: string;
};

export type ProductPhotoIndex = {
  hero: ProductPhoto | null;
  aisle: Record<string, ProductPhoto>;
  product: Record<string, ProductPhoto>;
};

export const EMPTY_PRODUCT_PHOTOS: ProductPhotoIndex = {
  hero: null,
  aisle: {},
  product: {},
};

const PHOTO_URL =
  /^https:\/\/[a-z0-9-]+\.supabase\.(co|in)\/storage\/v1\/object\/public\/product-photos\/(aisle|product|hero)\/[a-z0-9][a-z0-9-]{0,80}\.(jpe?g|png|webp)$/;

type PhotoRow = {
  subject: string;
  slug: string;
  image_url: string | null;
  alt: string | null;
};

function photoFromRow(row: PhotoRow): { subject: string; slug: string; photo: ProductPhoto } | null {
  if (row.subject !== "aisle" && row.subject !== "product" && row.subject !== "hero") return null;
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(row.slug) || row.slug.length > 80) return null;
  if (row.subject === "hero" && row.slug !== "products") return null;
  const url = row.image_url?.trim() ?? "";
  const alt = row.alt?.trim() ?? "";
  if (!url || !alt || alt.length > 160) return null;
  if (url.includes("..") || /[\\#\s]/.test(url) || !PHOTO_URL.test(url)) return null;
  const stem = url.split("/").pop()?.replace(/\.(jpe?g|png|webp)$/, "");
  if (stem !== row.slug) return null;
  if (!url.includes(`/product-photos/${row.subject}/${row.slug}.`)) return null;
  return { subject: row.subject, slug: row.slug, photo: { url, alt } };
}

function indexPhotos(rows: PhotoRow[]): ProductPhotoIndex {
  const index: ProductPhotoIndex = { hero: null, aisle: {}, product: {} };
  for (const row of rows) {
    const photo = photoFromRow(row);
    if (!photo) continue;
    if (photo.subject === "hero") index.hero = photo.photo;
    else if (photo.subject === "aisle") index.aisle[photo.slug] = photo.photo;
    else index.product[photo.slug] = photo.photo;
  }
  return index;
}

const loadCachedProductPhotos = unstable_cache(
  async () => {
    const supabase = createServiceClient();
    if (!supabase) return EMPTY_PRODUCT_PHOTOS;
    const { data, error } = await supabase.from("product_photos").select("subject, slug, image_url, alt");
    if (error) throw new Error("Could not load product photos");
    return indexPhotos((data ?? []) as PhotoRow[]);
  },
  ["product-photos-v1"],
  { revalidate: 120, tags: ["product-photos"] },
);

export async function listProductPhotos() {
  return loadCachedProductPhotos();
}

/** Product shot, otherwise the aisle shot. Null until a row is seeded. */
export function productPhoto(photos: ProductPhotoIndex, slug: string, category: string) {
  return photos.product[slug] ?? photos.aisle[category] ?? null;
}
