import { documentHasAuthCookie } from "@/lib/supabase/auth-cookie";
import {
  parseListingDetail,
  type SavedListing,
} from "@/lib/listing-saves";

export type { SavedListing, SavedListingVendor } from "@/lib/listing-saves";

export type SaveKind = "market" | "vendor" | "blog" | "listing";

export type Saves = {
  markets: string[];
  vendors: string[];
  blogs: string[];
  listings: SavedListing[];
};

export const EMPTY_SAVES: Saves = { markets: [], vendors: [], blogs: [], listings: [] };

const SAVE_LIST: Record<Exclude<SaveKind, "listing">, keyof Omit<Saves, "listings">> = {
  market: "markets",
  vendor: "vendors",
  blog: "blogs",
};

const KEY = "mr-saves";
const LEGACY_KEY = "mr-keeps";
const TOMB_KEY = "mr-saves-dropped";
const listeners = new Set<() => void>();
let snapshot: Saves = cloneEmpty();
let booted = false;
let tombstones = new Set<string>();

function cloneEmpty(): Saves {
  return { markets: [], vendors: [], blogs: [], listings: [] };
}

function clone(saves: Saves): Saves {
  return {
    markets: [...saves.markets],
    vendors: [...saves.vendors],
    blogs: [...saves.blogs],
    listings: saves.listings.map((row) => ({ ...row, vendors: [...row.vendors] })),
  };
}

function slugs(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function listings(value: unknown): SavedListing[] {
  if (!Array.isArray(value)) return [];
  const out: SavedListing[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = item as { slug?: unknown };
    if (typeof row.slug !== "string") continue;
    const parsed = parseListingDetail(row.slug, item);
    if (!parsed || seen.has(parsed.slug)) continue;
    seen.add(parsed.slug);
    out.push(parsed);
  }
  return out;
}

function parse(raw: string | null): Saves {
  if (!raw) return clone(EMPTY_SAVES);
  try {
    const parsed = JSON.parse(raw) as Partial<Saves>;
    return {
      markets: slugs(parsed.markets),
      vendors: slugs(parsed.vendors),
      blogs: slugs(parsed.blogs),
      listings: listings(parsed.listings),
    };
  } catch {
    return clone(EMPTY_SAVES);
  }
}

function tombKey(kind: SaveKind, slug: string) {
  return `${kind}:${slug}`;
}

function readTombstones(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.sessionStorage.getItem(TOMB_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((item): item is string => typeof item === "string"));
  } catch {
    return new Set();
  }
}

function writeTombstones() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(TOMB_KEY, JSON.stringify([...tombstones]));
  } catch {
    /* private mode / quota */
  }
}

export function clearTombstones() {
  tombstones = new Set();
  writeTombstones();
}

function dropKey(kind: SaveKind, slug: string) {
  tombstones.add(tombKey(kind, slug));
  writeTombstones();
}

function undropKey(kind: SaveKind, slug: string) {
  tombstones.delete(tombKey(kind, slug));
  writeTombstones();
}

function withoutTombstones(saves: Saves): Saves {
  const blogs = saves.blogs.filter((slug) => !tombstones.has(tombKey("blog", slug)));
  const droppedBlogs = new Set(
    saves.blogs.filter((slug) => tombstones.has(tombKey("blog", slug))),
  );
  return {
    markets: saves.markets.filter((slug) => !tombstones.has(tombKey("market", slug))),
    vendors: saves.vendors.filter((slug) => !tombstones.has(tombKey("vendor", slug))),
    blogs,
    listings: saves.listings.filter(
      (row) => !tombstones.has(tombKey("listing", row.slug)) && !droppedBlogs.has(row.blog),
    ),
  };
}

export function pruneTombstonesNotIn(server: Saves) {
  const have = new Set([
    ...server.markets.map((slug) => tombKey("market", slug)),
    ...server.vendors.map((slug) => tombKey("vendor", slug)),
    ...server.blogs.map((slug) => tombKey("blog", slug)),
    ...server.listings.map((row) => tombKey("listing", row.slug)),
  ]);
  let changed = false;
  for (const key of [...tombstones]) {
    if (!have.has(key)) {
      tombstones.delete(key);
      changed = true;
    }
  }
  if (changed) writeTombstones();
}

function emit(next: Saves, applyTombs = true) {
  snapshot = applyTombs ? withoutTombstones(next) : clone(next);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(snapshot));
  } catch {
    /* private mode / quota */
  }
  listeners.forEach((fn) => fn());
}

function onStorage(event: StorageEvent) {
  if (event.key !== KEY && event.key !== LEGACY_KEY) return;
  snapshot = documentHasAuthCookie()
    ? withoutTombstones(parse(event.newValue))
    : clone(EMPTY_SAVES);
  listeners.forEach((fn) => fn());
}

/** After mount, so the first client paint still matches the empty server snapshot. */
export function bootSaves() {
  if (booted || typeof window === "undefined") return;
  booted = true;
  tombstones = readTombstones();
  const stored = window.localStorage.getItem(KEY) ?? window.localStorage.getItem(LEGACY_KEY);
  snapshot = documentHasAuthCookie() ? withoutTombstones(parse(stored)) : clone(EMPTY_SAVES);
  if (!documentHasAuthCookie()) {
    tombstones = new Set();
    writeTombstones();
    try {
      window.localStorage.setItem(KEY, JSON.stringify(EMPTY_SAVES));
      window.localStorage.removeItem(LEGACY_KEY);
    } catch {
      /* private mode / quota */
    }
  }
  window.addEventListener("storage", onStorage);
  listeners.forEach((fn) => fn());
}

export function getSaves() {
  return snapshot;
}

export function subscribeSaves(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function isSaved(kind: SaveKind, slug: string, saves: Saves = snapshot) {
  if (kind === "listing") return saves.listings.some((row) => row.slug === slug);
  return saves[SAVE_LIST[kind]].includes(slug);
}

export function toggleSave(kind: Exclude<SaveKind, "listing">, slug: string) {
  const key = SAVE_LIST[kind];
  const current = snapshot[key];
  const exists = current.includes(slug);
  const nextList = exists ? current.filter((item) => item !== slug) : [...current, slug];
  if (exists) dropKey(kind, slug);
  else undropKey(kind, slug);
  if (kind === "blog" && exists) {
    for (const row of snapshot.listings) {
      if (row.blog === slug) dropKey("listing", row.slug);
    }
    emit({
      ...snapshot,
      blogs: nextList,
      listings: snapshot.listings.filter((row) => row.blog !== slug),
    });
    return;
  }
  emit({ ...snapshot, [key]: nextList });
}

export function toggleListing(listing: SavedListing) {
  const exists = snapshot.listings.some((row) => row.slug === listing.slug);
  if (exists) {
    dropKey("listing", listing.slug);
    emit({
      ...snapshot,
      listings: snapshot.listings.filter((row) => row.slug !== listing.slug),
    });
    return;
  }
  undropKey("listing", listing.slug);
  undropKey("blog", listing.blog);
  const blogs = snapshot.blogs.includes(listing.blog)
    ? snapshot.blogs
    : [...snapshot.blogs, listing.blog];
  emit({
    ...snapshot,
    blogs,
    listings: [...snapshot.listings, listing],
  });
}

export function replaceSaves(next: Saves) {
  emit({
    markets: [...new Set(next.markets.filter((item) => typeof item === "string" && item))],
    vendors: [...new Set(next.vendors.filter((item) => typeof item === "string" && item))],
    blogs: [...new Set((next.blogs ?? []).filter((item) => typeof item === "string" && item))],
    listings: listings(next.listings ?? []),
  });
}

/** Roll back an optimistic toggle. Clears tombstones for keys present in `before`. */
export function restoreSaves(before: Saves) {
  for (const slug of before.markets) tombstones.delete(tombKey("market", slug));
  for (const slug of before.vendors) tombstones.delete(tombKey("vendor", slug));
  for (const slug of before.blogs) tombstones.delete(tombKey("blog", slug));
  for (const row of before.listings) tombstones.delete(tombKey("listing", row.slug));
  writeTombstones();
  emit(
    {
      markets: [...new Set(before.markets.filter((item) => typeof item === "string" && item))],
      vendors: [...new Set(before.vendors.filter((item) => typeof item === "string" && item))],
      blogs: [...new Set((before.blogs ?? []).filter((item) => typeof item === "string" && item))],
      listings: listings(before.listings ?? []),
    },
    false,
  );
}

export function sameSaves(left: Saves, right: Saves) {
  return (
    left.markets.join("\0") === right.markets.join("\0") &&
    left.vendors.join("\0") === right.vendors.join("\0") &&
    left.blogs.join("\0") === right.blogs.join("\0") &&
    left.listings.map((row) => row.slug).join("\0") ===
      right.listings.map((row) => row.slug).join("\0")
  );
}

export function unionSaves(left: Saves, right: Saves): Saves {
  const listingMap = new Map(left.listings.map((row) => [row.slug, row]));
  for (const row of right.listings) {
    if (!listingMap.has(row.slug)) listingMap.set(row.slug, row);
  }
  return withoutTombstones({
    markets: [...new Set([...left.markets, ...right.markets])],
    vendors: [...new Set([...left.vendors, ...right.vendors])],
    blogs: [...new Set([...left.blogs, ...right.blogs])],
    listings: [...listingMap.values()],
  });
}

/** First paint and later RSC payloads: never re-add keys this tab already dropped. */
export function adoptServerSaves(server: Saves) {
  replaceSaves(unionSaves(server, getSaves()));
  pruneTombstonesNotIn(server);
}

export function savesFromRows(
  rows: Array<{ kind: string; slug: string; detail?: unknown }> | null,
): Saves {
  const markets: string[] = [];
  const vendors: string[] = [];
  const blogs: string[] = [];
  const listingsRows: SavedListing[] = [];
  const listingSeen = new Set<string>();
  for (const row of rows ?? []) {
    if (row.kind === "market") markets.push(row.slug);
    else if (row.kind === "vendor") vendors.push(row.slug);
    else if (row.kind === "blog") blogs.push(row.slug);
    else if (row.kind === "listing") {
      const parsed = parseListingDetail(row.slug, row.detail);
      if (!parsed || listingSeen.has(parsed.slug)) continue;
      listingSeen.add(parsed.slug);
      listingsRows.push(parsed);
    }
  }
  return { markets, vendors, blogs, listings: listingsRows };
}
