import { DIRECTORY_TAG } from "@/lib/directory-cache";
import { revalidatePath, updateTag } from "next/cache";

/** Drop the published snapshot and the public pages that render it. */
export function revalidatePublishedDirectory(extra: string[] = []) {
  updateTag(DIRECTORY_TAG);
  revalidatePath("/");
  revalidatePath("/markets", "layout");
  revalidatePath("/sitemap.xml");
  for (const path of extra) {
    if (path) revalidatePath(path);
  }
}
