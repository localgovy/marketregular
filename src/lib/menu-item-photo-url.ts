const MENU_ITEM_PHOTO_URL =
  /^https:\/\/[a-z0-9-]+\.supabase\.(co|in)\/storage\/v1\/object\/public\/menu-photos\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[a-z0-9][a-z0-9-]{0,80}\.(jpe?g|png|webp)$/;

/** Public menu-photos object, or null. A transform URL and any other host are rejected. */
export function menuItemPhotoUrl(value: unknown, menuId?: string | null): string | null {
  if (typeof value !== "string") return null;
  const url = value.trim();
  if (!url || url.length > 500 || url.includes("..") || /[\\#\s]/.test(url)) return null;
  if (!MENU_ITEM_PHOTO_URL.test(url)) return null;
  if (menuId && !url.includes(`/menu-photos/${menuId.toLowerCase()}/`)) return null;
  return url;
}

/** PostgREST/Postgres errors when published_menus does not yet have image_url. */
export function publishedMenuSelectMissingPhoto(
  error: { message?: string; code?: string } | null | undefined,
) {
  if (!error) return false;
  const message = (error.message ?? "").toLowerCase();
  if (!message.includes("image_url")) return false;
  const code = (error.code ?? "").toUpperCase();
  return (
    code === "42703" ||
    code === "PGRST204" ||
    message.includes("does not exist") ||
    message.includes("schema cache") ||
    message.includes("could not find")
  );
}
