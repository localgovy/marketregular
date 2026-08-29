import type { FloorItem, Post, Review, StallRef } from "@/types/database";

export function encodeFloorBody(
  text: string,
  tags: string[],
  vendorSlug?: string,
  rating?: number,
  priceLevel?: number,
) {
  const bits = [text.trim()];
  if (tags.length) bits.push(tags.map((t) => `#${t.replaceAll(/\s+/g, "-")}`).join(" "));
  if (vendorSlug) bits.push(`@${vendorSlug}`);
  if (rating && rating >= 1 && rating <= 5) bits.push(`★${rating}`);
  if (priceLevel && priceLevel >= 1 && priceLevel <= 3) bits.push(`$:${priceLevel}`);
  return bits.join("\n");
}

export function decodeFloorBody(raw: string) {
  const tags: string[] = [];
  let vendorSlug: string | null = null;
  let rating: number | null = null;
  let priceLevel: number | null = null;
  const kept: string[] = [];
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (/^@[\w-]+$/.test(trimmed)) {
      vendorSlug = trimmed.slice(1);
      continue;
    }
    const star = /^★([1-5])$/.exec(trimmed) ?? /^rating:([1-5])$/i.exec(trimmed);
    if (star) {
      rating = Number(star[1]);
      continue;
    }
    const bucks = /^\$:([1-3])$/.exec(trimmed);
    if (bucks) {
      priceLevel = Number(bucks[1]);
      continue;
    }
    const stripped = trimmed
      .replace(/#([a-z0-9-]+)/gi, (_, tag: string) => {
        tags.push(tag.toLowerCase());
        return "";
      })
      .replace(/\s+/g, " ")
      .trim();
    if (stripped) kept.push(stripped);
  }
  return {
    body: kept.join(" ").trim() || raw.trim(),
    tags: [...new Set(tags)],
    vendorSlug,
    rating,
    priceLevel,
  };
}

export function reviewFromPost(
  post: Post,
  stalls: Array<Pick<StallRef, "name" | "slug">> = [],
): FloorItem {
  const decoded = decodeFloorBody(post.body);
  const slug = post.vendor_slug ?? decoded.vendorSlug;
  const tagged = slug ? stalls.find((s) => s.slug === slug) : undefined;
  return {
    id: post.id,
    kind: "review",
    body: decoded.body,
    created_at: post.created_at,
    author_name: post.author_name ?? null,
    market_name: post.market_name ?? null,
    market_slug: post.market_slug ?? null,
    vendor_name: post.vendor_name ?? tagged?.name ?? null,
    vendor_slug: slug ?? tagged?.slug ?? null,
    rating: decoded.rating,
    price_level: decoded.priceLevel,
    verified_on_site: post.verified_on_site,
    tags: post.tags?.length ? post.tags : decoded.tags,
    photos: post.photos ?? [],
  };
}

export function reviewFromReview(row: Review): FloorItem {
  const decoded = decodeFloorBody(row.body);
  return {
    id: row.id,
    kind: "review",
    body: decoded.body,
    created_at: row.created_at,
    author_name: row.author_name ?? null,
    market_name: row.market_name ?? null,
    market_slug: row.market_slug ?? null,
    vendor_name: row.vendor_name ?? null,
    vendor_slug: row.vendor_slug ?? decoded.vendorSlug,
    rating: row.rating,
    price_level: decoded.priceLevel,
    verified_on_site: row.verified_on_site,
    tags: decoded.tags,
    photos: [],
  };
}

export function mergeReviews(items: FloorItem[]): FloorItem[] {
  const byKey = new Map<string, FloorItem>();
  const newest = [...items].sort(
    (a, b) => +new Date(b.created_at) - +new Date(a.created_at),
  );
  for (const item of newest) {
    const key = `${(item.author_name ?? "").toLowerCase()}|${item.body.trim().toLowerCase().slice(0, 140)}`;
    const current = byKey.get(key);
    if (!current) {
      byKey.set(key, { ...item, kind: "review" });
      continue;
    }
    if (current.rating == null && item.rating != null) {
      byKey.set(key, { ...current, rating: item.rating });
    }
    if (current.price_level == null && item.price_level != null) {
      byKey.set(key, { ...byKey.get(key)!, price_level: item.price_level });
    }
    if (!current.vendor_slug && item.vendor_slug) {
      byKey.set(key, {
        ...byKey.get(key)!,
        vendor_slug: item.vendor_slug,
        vendor_name: item.vendor_name ?? current.vendor_name,
      });
    }
  }
  return [...byKey.values()].sort(
    (a, b) => +new Date(b.created_at) - +new Date(a.created_at),
  );
}

export const NOTE_PROMPTS = ["What should the next shopper know?"];
