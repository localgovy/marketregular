import type { Vendor } from "@/types/database";

type SubstanceInput = Pick<
  Vendor,
  "about" | "phone" | "website" | "instagram" | "tiktok" | "facebook"
> & {
  menus?: unknown[];
  feed?: unknown[];
  hasMenu?: boolean;
};

/**
 * A stall page earns indexing when it says something a roster row does not: the shop's own
 * words, a menu, a way to reach them, or a review. Name-plus-market pages stay crawlable
 * (they still pass equity to the halls) but are kept out of the index.
 */
export function vendorHasSubstance(vendor: SubstanceInput) {
  if (vendor.about?.trim()) return true;
  if (vendor.hasMenu || (vendor.menus?.length ?? 0) > 0) return true;
  if ((vendor.feed?.length ?? 0) > 0) return true;
  return Boolean(
    vendor.phone?.trim() ||
      vendor.website?.trim() ||
      vendor.instagram?.trim() ||
      vendor.tiktok?.trim() ||
      vendor.facebook?.trim(),
  );
}
