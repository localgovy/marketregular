/** en-CA grouping for directory census figures. */
export function formatCensus(n: number) {
  return n.toLocaleString("en-CA");
}

/**
 * Keep a public image URL off Supabase's paid render transform and off
 * the Next image optimizer.
 */
export function directPublicImageSrc(src: string | null | undefined): string | null {
  if (!src) return null;
  if (src.includes("/storage/v1/render/image/") || src.startsWith("/_next/image")) {
    return null;
  }
  return src;
}
