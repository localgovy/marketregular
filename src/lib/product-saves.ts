import { listingScore } from "@/lib/listing-score";
import { validSaveSlug } from "@/lib/listing-saves";

export type SavedProductItem = {
  name: string;
  priceCents: number | null;
  href: string | null;
};

export type SavedProductMarket = {
  slug: string;
  name: string;
  days: number[];
  hours: Array<{ day: string; hours: string }>;
  ratingAvg: number | null;
  reviewCount: number;
};

export type SavedProduct = {
  slug: string;
  vendorSlug: string;
  vendorName: string;
  ratingAvg: number | null;
  reviewCount: number;
  items: SavedProductItem[];
  markets: SavedProductMarket[];
};

const MAX_NAME = 120;
const MAX_ITEMS = 24;
const MAX_MARKETS = 12;
const MAX_HOURS = 7;
const MAX_CENTS = 1_000_000;
const MAX_DETAIL_BYTES = 15_000;
const DAY_LABELS = new Set(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);

function shortKey(value: string) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function productSaveSlug(vendorSlug: string, itemNames: string[]) {
  const items = itemNames.map((name) => name.trim().toLowerCase()).filter(Boolean).sort();
  const body = `${vendorSlug}\n${items.join("\n")}`;
  const slug = `product-${vendorSlug}-${shortKey(body)}`;
  if (validSaveSlug(slug)) return slug;
  return `product-${shortKey(body)}`;
}

function cleanName(value: unknown) {
  if (typeof value !== "string") return null;
  const name = value.trim().slice(0, MAX_NAME);
  return name || null;
}

function cleanScore(ratingAvg: unknown, reviewCount: unknown) {
  const score = listingScore(
    ratingAvg as number | string | null | undefined,
    reviewCount as number | null | undefined,
  );
  return {
    ratingAvg: score?.avg ?? null,
    reviewCount: score?.count ?? 0,
  };
}

function cleanDays(value: unknown) {
  if (!Array.isArray(value)) return [];
  const days = value.filter((day): day is number => Number.isInteger(day) && day >= 0 && day <= 6);
  return [...new Set(days)].sort((a, b) => a - b);
}

function cleanHours(value: unknown) {
  if (!Array.isArray(value)) return [];
  const rows: Array<{ day: string; hours: string }> = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = item as { day?: unknown; hours?: unknown };
    if (typeof row.day !== "string" || !DAY_LABELS.has(row.day)) continue;
    if (typeof row.hours !== "string") continue;
    const hours = row.hours.trim().slice(0, 40);
    if (!hours || !/\d/.test(hours) || !/(AM|PM)/.test(hours)) continue;
    rows.push({ day: row.day, hours });
    if (rows.length >= MAX_HOURS) break;
  }
  return rows;
}

function cleanHref(value: unknown) {
  if (typeof value !== "string") return null;
  if (value.startsWith("/find/")) {
    const slug = value.slice("/find/".length);
    if (validSaveSlug(slug)) return value;
    return null;
  }
  if (!value.startsWith("/products?q=")) return null;
  const query = value.slice("/products?q=".length);
  if (!query || query.length > 200 || query.includes("#") || !/^[A-Za-z0-9._~%-]+$/.test(query)) {
    return null;
  }
  return value;
}

function cleanPrice(value: unknown) {
  if (value == null || value === "") return null;
  const cents = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(cents) || cents < 0 || cents > MAX_CENTS) return null;
  return cents;
}

function cleanItems(value: unknown): SavedProductItem[] {
  if (!Array.isArray(value)) return [];
  const items: SavedProductItem[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = item as { name?: unknown; priceCents?: unknown; href?: unknown };
    const name = cleanName(row.name);
    if (!name) continue;
    items.push({
      name,
      priceCents: cleanPrice(row.priceCents),
      href: cleanHref(row.href),
    });
    if (items.length >= MAX_ITEMS) break;
  }
  return items;
}

function cleanMarkets(value: unknown): SavedProductMarket[] {
  if (!Array.isArray(value)) return [];
  const markets: SavedProductMarket[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = item as {
      slug?: unknown;
      name?: unknown;
      days?: unknown;
      hours?: unknown;
      ratingAvg?: unknown;
      reviewCount?: unknown;
    };
    if (typeof row.slug !== "string" || !validSaveSlug(row.slug) || seen.has(row.slug)) continue;
    const name = cleanName(row.name);
    if (!name) continue;
    seen.add(row.slug);
    markets.push({
      slug: row.slug,
      name,
      days: cleanDays(row.days),
      hours: cleanHours(row.hours),
      ...cleanScore(row.ratingAvg, row.reviewCount),
    });
    if (markets.length >= MAX_MARKETS) break;
  }
  return markets;
}

export function productFromInput(input: unknown): SavedProduct | null {
  if (!input || typeof input !== "object") return null;
  const row = input as Record<string, unknown>;
  const vendorSlug = row.vendorSlug;
  if (typeof vendorSlug !== "string" || !validSaveSlug(vendorSlug)) return null;
  const vendorName = cleanName(row.vendorName);
  if (!vendorName) return null;
  let items = cleanItems(row.items);
  if (!items.length) return null;
  let markets = cleanMarkets(row.markets);
  const score = cleanScore(row.ratingAvg, row.reviewCount);
  const draft = () => ({
    vendorSlug,
    vendorName,
    ...score,
    items,
    markets,
  });
  while (new TextEncoder().encode(JSON.stringify(draft())).length > MAX_DETAIL_BYTES) {
    const hall = markets[0];
    if (items.length > 1) items = items.slice(0, -1);
    else if (markets.length > 1) markets = markets.slice(0, -1);
    else if (hall && hall.hours.length > 2) markets = [{ ...hall, hours: hall.hours.slice(0, 2) }];
    else break;
  }
  const slug = productSaveSlug(
    vendorSlug,
    items.map((item) => item.name),
  );
  return { slug, ...draft() };
}

export function parseProductDetail(slug: string, detail: unknown): SavedProduct | null {
  const product = productFromInput(detail);
  if (!product || product.slug !== slug) return null;
  return product;
}

export function productDetailJson(product: SavedProduct) {
  return {
    vendorSlug: product.vendorSlug,
    vendorName: product.vendorName,
    ratingAvg: product.ratingAvg,
    reviewCount: product.reviewCount,
    items: product.items,
    markets: product.markets,
  };
}

export function productSaveLabel(product: SavedProduct) {
  const names = product.items.map((item) => item.name);
  const shown = names.slice(0, 2).join(", ");
  const extra = names.length > 2 ? ` +${names.length - 2}` : "";
  return `${product.vendorName}, ${shown}${extra}`;
}
