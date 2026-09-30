import { findPageForProductSlug } from "@/data/find-pages";

export type ProductMarketHit = {
  name: string;
  slug: string;
  days: number[];
  hours: Array<{ day: string; hours: string }>;
  ratingAvg: number | null;
  reviewCount: number;
};

export type ProductHit = {
  itemName: string;
  category: string | null;
  productSlug: string | null;
  priceCents: number | null;
  vendorName: string;
  vendorSlug: string;
  ratingAvg: number | null;
  reviewCount: number;
  markets: ProductMarketHit[];
  openToday: boolean;
  href: string;
};

export type VendorHit = {
  name: string;
  slug: string;
  href: string;
  ratingAvg: number | null;
  reviewCount: number;
};

const BANNED_KEYS = new Set([
  "email",
  "phone",
  "claim_note",
  "claim_source",
  "claimed_by",
  "product_category_source",
]);

export function assertPublicSearchPayload(value: unknown): void {
  if (Array.isArray(value)) {
    for (const item of value) assertPublicSearchPayload(item);
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (BANNED_KEYS.has(key.toLowerCase())) {
      throw new Error("Search returned a private field");
    }
    assertPublicSearchPayload(child);
  }
}

export function isAlcoholCategory(category: string | null | undefined) {
  return category === "alcohol";
}

export function visiblePriceCents(category: string | null | undefined, cents: number | null) {
  if (isAlcoholCategory(category)) return null;
  return cents;
}

export function productHref(productSlug: string | null, itemName: string) {
  const page = findPageForProductSlug(productSlug);
  if (page) return `/find/${page.slug}`;
  return `/products?q=${encodeURIComponent(itemName)}`;
}
