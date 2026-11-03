import { DIRECTORY_TAG } from "@/lib/directory-cache";
import { clearDirectoryMemory } from "@/lib/data/catalog";
import { revalidatePath, updateTag } from "next/cache";

/**
 * Drop the published snapshot and the indexes that render it.
 * A layout scope would mark every market and stall page stale at once.
 * Callers pass the listing paths that actually changed.
 */
export function revalidatePublishedDirectory(extra: string[] = []) {
  clearDirectoryMemory();
  updateTag(DIRECTORY_TAG);
  revalidatePath("/");
  revalidatePath("/markets");
  revalidatePath("/products");
  revalidatePath("/events");
  revalidatePath("/feed");
  revalidatePath("/sitemap.xml");
  for (const path of extra) {
    if (path) revalidatePath(path);
  }
}
