export type SavedListingVendor = {
  slug: string;
  name: string;
};

export type SavedListing = {
  slug: string;
  blog: string;
  heading: string;
  hours: string;
  marketSlug: string;
  marketName: string;
  ratingAvg: number | null;
  reviewCount: number;
  vendors: SavedListingVendor[];
  order: number;
};

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MAX_HEADING = 80;
const MAX_HOURS = 40;
const MAX_NAME = 120;
const MAX_VENDORS = 5;

export function validSaveSlug(slug: string) {
  return slug.length >= 1 && slug.length <= 160 && SLUG.test(slug);
}

export function headingKey(heading: string) {
  return heading
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function shortKey(value: string) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function listingSaveSlug(blog: string, heading: string, market: string) {
  const slug = `${blog}-on-${headingKey(heading)}-at-${market}`;
  if (slug.length <= 160 && SLUG.test(slug)) return slug;
  return `listing-${shortKey(slug)}`;
}

function looksLikeHours(value: string) {
  return /\d/.test(value) && /AM|PM/.test(value);
}

function vendorRow(value: unknown): SavedListingVendor | null {
  if (!value || typeof value !== "object") return null;
  const row = value as { slug?: unknown; name?: unknown };
  if (typeof row.slug !== "string" || !validSaveSlug(row.slug)) return null;
  if (typeof row.name !== "string") return null;
  const name = row.name.trim().slice(0, MAX_NAME);
  if (!name) return null;
  return { slug: row.slug, name };
}

export function parseListingDetail(
  slug: string,
  detail: unknown,
): SavedListing | null {
  if (!detail || typeof detail !== "object") return null;
  const row = detail as Record<string, unknown>;
  if (typeof row.blog !== "string" || !validSaveSlug(row.blog)) {
    return null;
  }
  if (typeof row.heading !== "string") return null;
  const heading = row.heading.trim().slice(0, MAX_HEADING);
  if (!heading) return null;
  if (typeof row.hours !== "string") return null;
  const hours = row.hours.trim().slice(0, MAX_HOURS);
  if (!hours || !looksLikeHours(hours)) return null;
  if (typeof row.marketSlug !== "string" || !validSaveSlug(row.marketSlug)) return null;
  if (typeof row.marketName !== "string") return null;
  const marketName = row.marketName.trim().slice(0, MAX_NAME);
  if (!marketName) return null;
  const expected = listingSaveSlug(row.blog, heading, row.marketSlug);
  if (slug !== expected) return null;
  const vendors = Array.isArray(row.vendors)
    ? row.vendors.slice(0, MAX_VENDORS).flatMap((item) => {
        const vendor = vendorRow(item);
        return vendor ? [vendor] : [];
      })
    : [];
  const reviewCount = Number(row.reviewCount ?? 0);
  const ratingRaw = row.ratingAvg;
  const ratingAvg =
    ratingRaw == null || ratingRaw === ""
      ? null
      : Number(ratingRaw);
  const order = Number(row.order ?? 0);
  return {
    slug,
    blog: row.blog,
    heading,
    hours,
    marketSlug: row.marketSlug,
    marketName,
    ratingAvg: Number.isFinite(ratingAvg) ? ratingAvg : null,
    reviewCount: Number.isFinite(reviewCount) && reviewCount >= 0 ? reviewCount : 0,
    vendors,
    order: Number.isFinite(order) ? order : 0,
  };
}

export function listingDetailJson(listing: SavedListing) {
  return {
    blog: listing.blog,
    heading: listing.heading,
    hours: listing.hours,
    marketSlug: listing.marketSlug,
    marketName: listing.marketName,
    ratingAvg: listing.ratingAvg,
    reviewCount: listing.reviewCount,
    vendors: listing.vendors,
    order: listing.order,
  };
}

export function listingFromInput(input: {
  blog: string;
  heading: string;
  hours: string;
  marketSlug: string;
  marketName: string;
  ratingAvg?: number | null;
  reviewCount?: number | null;
  vendors?: SavedListingVendor[];
  order?: number;
}): SavedListing | null {
  const slug = listingSaveSlug(input.blog, input.heading, input.marketSlug);
  return parseListingDetail(slug, {
    blog: input.blog,
    heading: input.heading,
    hours: input.hours,
    marketSlug: input.marketSlug,
    marketName: input.marketName,
    ratingAvg: input.ratingAvg ?? null,
    reviewCount: input.reviewCount ?? 0,
    vendors: input.vendors ?? [],
    order: input.order ?? 0,
  });
}
