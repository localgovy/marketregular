const LISTING_PATH = /^\/(vendors|markets)\/([a-z0-9]+(?:-[a-z0-9]+)*)$/;
const RESERVED_MARKET_SLUGS = new Set(["day", "open-today", "tag"]);

export type ListingPath = { kind: "vendor" | "market"; slug: string };

export function parseListingPath(pathname: string): ListingPath | null {
  const match = LISTING_PATH.exec(pathname);
  if (!match) return null;
  const kind = match[1] === "vendors" ? "vendor" : "market";
  const slug = match[2] ?? "";
  if (!slug) return null;
  if (kind === "market" && RESERVED_MARKET_SLUGS.has(slug)) return null;
  return { kind, slug };
}

export function aliasHref(kind: "vendor" | "market", slug: string) {
  return kind === "vendor" ? `/vendors/${slug}` : `/markets/${slug}`;
}
