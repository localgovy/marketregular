import type { FloorItem } from "@/types/database";

export type FeedSort = "new" | "old" | "score";

export type FeedQuery = {
  q: string;
  market: string;
  vendor: string;
  tag: string;
  sort: FeedSort;
};

export type FeedMention = {
  slug: string;
  name: string;
  count: number;
};

function fold(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function parseFeedQuery(params: {
  q?: string;
  market?: string;
  vendor?: string;
  tag?: string;
  sort?: string;
}): FeedQuery {
  const sort = params.sort;
  return {
    q: params.q?.trim() ?? "",
    market: params.market?.trim() ?? "",
    vendor: params.vendor?.trim() ?? "",
    tag: params.tag?.trim().toLowerCase() ?? "",
    sort: sort === "old" || sort === "score" ? sort : "new",
  };
}

export function feedSearchString(query: FeedQuery): string {
  const next = new URLSearchParams();
  if (query.q) next.set("q", query.q);
  if (query.market) next.set("market", query.market);
  if (query.vendor) next.set("vendor", query.vendor);
  if (query.tag) next.set("tag", query.tag);
  if (query.sort && query.sort !== "new") next.set("sort", query.sort);
  const value = next.toString();
  return value ? `/feed?${value}` : "/feed";
}

export function feedIsFiltered(query: FeedQuery) {
  return Boolean(query.q || query.market || query.vendor || query.tag);
}

export function filterFeed(items: FloorItem[], query: FeedQuery): FloorItem[] {
  const tokens = fold(query.q).split(" ").filter(Boolean);
  const matched = items.filter((item) => {
    if (query.market && item.market_slug !== query.market) return false;
    if (query.vendor && item.vendor_slug !== query.vendor) return false;
    if (query.tag && !item.tags.includes(query.tag)) return false;
    if (!tokens.length) return true;
    const hay = fold(
      [
        item.body,
        item.author_name,
        item.market_name,
        item.vendor_name,
        item.tags.join(" "),
      ]
        .filter(Boolean)
        .join(" "),
    );
    return tokens.every((token) => hay.includes(token));
  });

  return matched.sort((a, b) => {
    if (query.sort === "score") {
      const ra = a.rating ?? 0;
      const rb = b.rating ?? 0;
      if (Boolean(ra) !== Boolean(rb)) return ra ? -1 : 1;
      if (rb !== ra) return rb - ra;
    }
    const ta = +new Date(a.created_at);
    const tb = +new Date(b.created_at);
    return query.sort === "old" ? ta - tb : tb - ta;
  });
}

export function tagsInFeed(items: FloorItem[]) {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const item of items) {
    for (const tag of item.tags) {
      if (seen.has(tag)) continue;
      seen.add(tag);
      tags.push(tag);
    }
  }
  return tags.sort((a, b) => a.localeCompare(b));
}

function countMentions(
  items: FloorItem[],
  kind: "market" | "vendor",
): FeedMention[] {
  const counts = new Map<string, FeedMention>();
  for (const item of items) {
    const slug = kind === "market" ? item.market_slug : item.vendor_slug;
    const name = kind === "market" ? item.market_name : item.vendor_name;
    if (!slug || !name) continue;
    const current = counts.get(slug);
    if (current) current.count += 1;
    else counts.set(slug, { slug, name, count: 1 });
  }
  return [...counts.values()].sort(
    (a, b) => b.count - a.count || a.name.localeCompare(b.name),
  );
}

export function mentionPlaces(items: FloorItem[]) {
  return {
    markets: countMentions(items, "market").slice(0, 8),
    vendors: countMentions(items, "vendor").slice(0, 8),
  };
}
