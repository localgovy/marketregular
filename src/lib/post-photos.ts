const MAX_PHOTOS = 8;
const MAX_URL = 2048;

/** Only this project's post-photos bucket, under the caller's uid prefix. */
export function allowedPostPhotos(userId: string, photos: unknown): string[] | null {
  if (photos == null) return [];
  if (!Array.isArray(photos)) return null;
  if (photos.length > MAX_PHOTOS) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  if (!base) return photos.length === 0 ? [] : null;
  const prefix = `${base}/storage/v1/object/public/post-photos/${userId}/`;
  const out: string[] = [];
  for (const item of photos) {
    if (typeof item !== "string" || item.length === 0 || item.length > MAX_URL) return null;
    if (!item.startsWith(prefix)) return null;
    if (item.includes("..") || item.includes("\\") || item.includes("#")) return null;
    out.push(item);
  }
  return out;
}
