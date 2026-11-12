import "server-only";

import { open, readFile, rename, unlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { groupVendorHalls } from "@/lib/vendor-halls";
import { publishedMenuSelectMissingPhoto } from "@/lib/menu-item-photo-url";
import { publishedMenuSelectMissingSections } from "@/lib/menu-sections";
import { createServiceClient } from "@/lib/supabase/admin";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import {
  filterFindMenus,
  LISTING_REVIEW_CAP,
  MARKET_POST_CAP,
  postsWithinCaps,
  reviewsWithinCaps,
  VENDOR_POST_CAP,
  type FindAssignmentPick,
  type FindMenuPick,
} from "@/lib/data/snapshot-select";
import {
  MENU_PUBLIC,
  MENU_PUBLIC_FLAT,
  MENU_PUBLIC_PHOTO,
  stripContainsAlcohol,
  stripMenuCategory,
} from "@/lib/data/published-menu-select";
import type {
  Market,
  MarketSchedule,
  MenuItem,
  StallRef,
  Vendor,
  VendorHall,
} from "@/types/database";

const PAGE = 1000;
const MAX_ROWS = 400_000;
const WAIT_MS = 300_000;
const POLL_MS = 200;
const VERSION = 2;

const REVIEW_SELECT =
  "id, user_id, market_id, vendor_id, rating, body, flagged, created_at, profiles(display_name)";
const POST_SELECT =
  "id, user_id, market_id, body, photos, flagged, created_at, profiles(display_name, avatar_url)";
const LISTING_SELECT = "id, slug, phone, email, claimed_by";

export type BuildDirectoryRecords = {
  markets: Market[];
  vendors: Vendor[];
  stalls: StallRef[];
  schedules: MarketSchedule[];
  /** Published vendors with a stall, including halls that are not public. */
  rosterVendorIds: string[];
  menuVendorIds: string[];
};

type ListingKind = "market" | "vendor";

type StoredListing = {
  kind: ListingKind;
  id: string;
  slug: string;
  phone: string | null;
  email: string | null;
  claimed: boolean;
};

type StoredReview = {
  id: string;
  user_id: string | null;
  market_id: string | null;
  vendor_id: string | null;
  rating: number;
  body: string;
  flagged: boolean;
  created_at: string;
  profiles: { display_name: string | null } | null;
};

type StoredPost = {
  id: string;
  user_id: string | null;
  market_id: string;
  body: string;
  photos: string[];
  flagged: boolean;
  created_at: string;
  profiles: { display_name: string | null; avatar_url: string | null } | null;
};

type SnapshotFile = {
  version: number;
  token: string;
  menus: MenuItem[];
  assignments: FindAssignmentPick[];
  listings: StoredListing[];
  reviews: StoredReview[];
  posts: StoredPost[];
  markets: Market[];
  vendors: Vendor[];
  stalls: StallRef[];
  schedules: MarketSchedule[];
  rosterVendorIds: string[];
  menuVendorIds: string[];
};

type StallLink = { vendor_id: string; market_id: string; stall: string | null; days: number[] };

export type BuildSnapshot = {
  contact(kind: ListingKind, slug: string): { phone: string | null; email: string | null };
  isClaimed(kind: ListingKind, id: string): boolean;
  marketBySlug(slug: string): Market | null;
  vendorBySlug(slug: string): Vendor | null;
  vendorById(id: string): Vendor | null;
  marketById(id: string): Market | null;
  schedulesFor(marketId: string): MarketSchedule[];
  linksForMarket(marketId: string): StallLink[];
  linksForVendor(vendorId: string): StallLink[];
  menusForVendor(vendorId: string): MenuItem[];
  postsForMarket(marketId: string, limit?: number): StoredPost[];
  postsForMarkets(marketIds: readonly string[], limit?: number): StoredPost[];
  reviewsForVendor(vendorId: string): StoredReview[];
  reviewPool(marketId: string, vendorIds: readonly string[]): StoredReview[];
  hallsFor(vendorIds: readonly string[]): Map<string, VendorHall[]>;
  findMenus(slugs: readonly string[], classifiers: readonly string[]): FindMenuPick[];
  records(): BuildDirectoryRecords;
};

type PageResult<T> = {
  data: T[] | null;
  error: { message?: string; code?: string } | null;
};

let directoryLoader: (() => Promise<BuildDirectoryRecords>) | null = null;
let ready: BuildSnapshot | null = null;
let inflight: Promise<BuildSnapshot | null> | null = null;

const snapshotPath = path.join(os.tmpdir(), "marketregular-build-snapshot-v1.json");
const lockPath = `${snapshotPath}.lock`;

export function isProductionBuild() {
  return process.env.NEXT_PHASE === "phase-production-build";
}

/** Unfolded directory rows. Registered by the catalog so this file does not import it. */
export function registerBuildDirectoryLoader(load: () => Promise<BuildDirectoryRecords>) {
  directoryLoader = load;
}

function snapshotToken() {
  return process.env.VERCEL_DEPLOYMENT_ID || `local:${process.ppid}`;
}

function existsError(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "EEXIST");
}

function asText(value: unknown) {
  return typeof value === "string" ? value : null;
}

function profileFields(value: unknown) {
  const row = Array.isArray(value) ? value[0] : value;
  if (!row || typeof row !== "object") return null;
  const record = row as { display_name?: unknown; avatar_url?: unknown };
  return {
    display_name: asText(record.display_name),
    avatar_url: asText(record.avatar_url),
  };
}

/**
 * The snapshot, or null when this is not a production build or the directory
 * database is not configured. A configured production build never continues
 * without it: that would query Supabase once per listing page.
 */
export async function requireBuildSnapshot(): Promise<BuildSnapshot | null> {
  if (!isProductionBuild()) return null;
  if (!createServiceClient()) return null;
  const snap = await ensureBuildSnapshot();
  if (!snap) {
    throw new Error(
      "Production build is missing the directory snapshot, so it would query Supabase once per listing page.",
    );
  }
  return snap;
}

export async function ensureBuildSnapshot(): Promise<BuildSnapshot | null> {
  if (!isProductionBuild()) return null;
  if (ready) return ready;
  if (!createServiceClient()) return null;
  if (!inflight) {
    inflight = loadSnapshot()
      .then((snap) => {
        ready = snap;
        return snap;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

async function loadSnapshot(): Promise<BuildSnapshot> {
  const token = snapshotToken();
  const deadline = Date.now() + WAIT_MS;
  while (Date.now() < deadline) {
    const cached = await readSnapshot(token);
    if (cached) return indexSnapshot(cached);
    const lock = await acquireLock(token);
    if (!lock) {
      await sleep(POLL_MS);
      continue;
    }
    try {
      const raced = await readSnapshot(token);
      if (raced) return indexSnapshot(raced);
      const file = await fetchSnapshot(token);
      await writeSnapshot(file);
      return indexSnapshot(file);
    } finally {
      await lock.close().catch(() => undefined);
      await unlink(lockPath).catch(() => undefined);
    }
  }
  throw new Error("Build snapshot lock timed out");
}

async function acquireLock(token: string) {
  try {
    const handle = await open(lockPath, "wx");
    await handle.writeFile(token);
    return handle;
  } catch (error) {
    if (!existsError(error)) throw error;
    const current = await readFile(lockPath, "utf8").catch(() => "");
    if (current && current !== token) {
      await unlink(lockPath).catch(() => undefined);
      try {
        const handle = await open(lockPath, "wx");
        await handle.writeFile(token);
        return handle;
      } catch (retry) {
        if (!existsError(retry)) throw retry;
      }
    }
    return null;
  }
}

async function readSnapshot(token: string): Promise<SnapshotFile | null> {
  let raw: string;
  try {
    raw = await readFile(snapshotPath, "utf8");
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return null;
    throw error;
  }
  let parsed: SnapshotFile;
  try {
    parsed = JSON.parse(raw) as SnapshotFile;
  } catch {
    await unlink(snapshotPath).catch(() => undefined);
    return null;
  }
  if (!usableSnapshot(parsed) || parsed.token !== token) return null;
  return parsed;
}

function usableSnapshot(file: SnapshotFile) {
  return (
    file.version === VERSION &&
    Array.isArray(file.menus) &&
    Array.isArray(file.assignments) &&
    Array.isArray(file.listings) &&
    Array.isArray(file.reviews) &&
    Array.isArray(file.posts) &&
    Array.isArray(file.markets) &&
    Array.isArray(file.vendors) &&
    Array.isArray(file.stalls) &&
    Array.isArray(file.schedules) &&
    Array.isArray(file.rosterVendorIds) &&
    Array.isArray(file.menuVendorIds)
  );
}

async function writeSnapshot(file: SnapshotFile) {
  const tmp = `${snapshotPath}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(file));
  await rename(tmp, snapshotPath);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchSnapshot(token: string): Promise<SnapshotFile> {
  const service = createServiceClient();
  if (!service) throw new Error("Build snapshot needs the directory database");
  if (!directoryLoader) throw new Error("Build snapshot directory loader was not registered");
  const visitor = createPublicSupabaseClient();
  const [directory, menus, assignments, marketListings, vendorListings, reviews, posts] =
    await Promise.all([
      directoryLoader(),
      readMenus(service),
      readCounted(
        "classifier assignments",
        () =>
          service
            .from("vendor_menu_classifier_assignments")
            .select("menu_id", { count: "exact", head: true }),
        (expected) =>
          readPages<FindAssignmentPick>(
            "classifier assignments",
            expected,
            (row) => `${row.menu_id}\0${row.classifier_slug}`,
            (from, to) =>
              service
                .from("vendor_menu_classifier_assignments")
                .select("menu_id, classifier_slug")
                .order("menu_id")
                .order("classifier_slug")
                .range(from, to),
          ),
      ),
      readListings(service, "market", "markets"),
      readListings(service, "vendor", "vendors"),
      visitor
        ? readCounted(
            "reviews",
            () => visitor.from("reviews").select("id", { count: "exact", head: true }).eq("flagged", false),
            (expected) =>
              readPages<Record<string, unknown>>(
                "reviews",
                expected,
                (row) => String(row.id ?? ""),
                (from, to) =>
                  visitor
                    .from("reviews")
                    .select(REVIEW_SELECT)
                    .eq("flagged", false)
                    .order("id")
                    .range(from, to),
              ),
          )
        : Promise.resolve([]),
      visitor
        ? readCounted(
            "posts",
            () => visitor.from("posts").select("id", { count: "exact", head: true }).eq("flagged", false),
            (expected) =>
              readPages<Record<string, unknown>>(
                "posts",
                expected,
                (row) => String(row.id ?? ""),
                (from, to) =>
                  visitor
                    .from("posts")
                    .select(POST_SELECT)
                    .eq("flagged", false)
                    .order("id")
                    .range(from, to),
              ),
          )
        : Promise.resolve([]),
    ]);

  return {
    version: VERSION,
    token,
    menus,
    assignments: assignments.filter((row) => row.menu_id && row.classifier_slug),
    listings: [...marketListings, ...vendorListings],
    reviews: reviewsWithinCaps(reviews.map(storedReview)),
    posts: postsWithinCaps(posts.map(storedPost)),
    markets: directory.markets,
    vendors: directory.vendors,
    stalls: directory.stalls,
    schedules: directory.schedules,
    rosterVendorIds: directory.rosterVendorIds,
    menuVendorIds: directory.menuVendorIds,
  };
}

function storedReview(row: Record<string, unknown>): StoredReview {
  const profile = profileFields(row.profiles);
  return {
    id: String(row.id ?? ""),
    user_id: asText(row.user_id),
    market_id: asText(row.market_id),
    vendor_id: asText(row.vendor_id),
    rating: typeof row.rating === "number" ? row.rating : 0,
    body: typeof row.body === "string" ? row.body : "",
    flagged: row.flagged === true,
    created_at: typeof row.created_at === "string" ? row.created_at : "",
    profiles: profile ? { display_name: profile.display_name } : null,
  };
}

function storedPost(row: Record<string, unknown>): StoredPost {
  const profile = profileFields(row.profiles);
  return {
    id: String(row.id ?? ""),
    user_id: asText(row.user_id),
    market_id: asText(row.market_id) ?? "",
    body: typeof row.body === "string" ? row.body : "",
    photos: Array.isArray(row.photos)
      ? row.photos.filter((item): item is string => typeof item === "string")
      : [],
    flagged: row.flagged === true,
    created_at: typeof row.created_at === "string" ? row.created_at : "",
    profiles: profile,
  };
}

async function readListings(
  service: NonNullable<ReturnType<typeof createServiceClient>>,
  kind: ListingKind,
  table: "markets" | "vendors",
) {
  const rows = await readCounted(
    `${kind} contact`,
    () => service.from(table).select("id", { count: "exact", head: true }).eq("status", "published"),
    (expected) =>
      readPages<Record<string, unknown>>(
        `${kind} contact`,
        expected,
        (row) => String(row.id ?? ""),
        (from, to) =>
          service.from(table).select(LISTING_SELECT).eq("status", "published").order("id").range(from, to),
      ),
  );
  const listings: StoredListing[] = [];
  for (const row of rows) {
    const id = asText(row.id);
    const slug = asText(row.slug);
    if (!id || !slug) continue;
    listings.push({
      kind,
      id,
      slug,
      phone: asText(row.phone),
      email: asText(row.email),
      claimed: Boolean(row.claimed_by),
    });
  }
  return listings;
}

function menuSelectMissingCategory(error: { message?: string; code?: string } | null | undefined) {
  if (!error) return false;
  const message = (error.message ?? "").toLowerCase();
  if (!message.includes("product_category") && !message.includes("product_slug")) return false;
  const code = (error.code ?? "").toUpperCase();
  return (
    code === "42703" ||
    code === "PGRST204" ||
    message.includes("does not exist") ||
    message.includes("schema cache") ||
    message.includes("could not find")
  );
}

async function menuColumns(service: NonNullable<ReturnType<typeof createServiceClient>>) {
  const photo = await service.from("published_menus").select("image_url").limit(1);
  if (!photo.error) return MENU_PUBLIC_PHOTO;
  if (!publishedMenuSelectMissingPhoto(photo.error)) {
    throw new Error(photo.error.message || "Build snapshot menus failed");
  }
  const sections = await service.from("published_menus").select("menu_section").limit(1);
  if (sections.error && !publishedMenuSelectMissingSections(sections.error)) {
    throw new Error(sections.error.message || "Build snapshot menus failed");
  }
  return publishedMenuSelectMissingSections(sections.error) ? MENU_PUBLIC_FLAT : MENU_PUBLIC;
}

async function readCounted<T>(
  label: string,
  count: () => PromiseLike<{ count: number | null; error: { message?: string } | null }>,
  read: (expected: number) => Promise<T>,
) {
  return read(await exactCount(label, count));
}

async function readMenus(service: NonNullable<ReturnType<typeof createServiceClient>>) {
  const expected = await exactCount("menus", () =>
    service.from("published_menus").select("id", { count: "exact", head: true }),
  );
  let columns = await menuColumns(service);
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      return await readPages<MenuItem>(
        "menus",
        expected,
        (row) => row.id,
        (from, to) =>
          service.from("published_menus").select(columns).order("id").range(from, to) as PromiseLike<
            PageResult<MenuItem>
          >,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      const probe = { message, code: "" };
      if (columns === MENU_PUBLIC_PHOTO && publishedMenuSelectMissingPhoto(probe)) {
        columns = MENU_PUBLIC;
        continue;
      }
      if (columns === MENU_PUBLIC && publishedMenuSelectMissingSections(probe)) {
        columns = MENU_PUBLIC_FLAT;
        continue;
      }
      if (message.toLowerCase().includes("contains_alcohol")) {
        columns = stripContainsAlcohol(columns);
        continue;
      }
      if (menuSelectMissingCategory(probe)) {
        columns = stripMenuCategory(columns);
        continue;
      }
      throw error;
    }
  }
  throw new Error("Build snapshot menus failed");
}

async function exactCount(
  label: string,
  run: () => PromiseLike<{ count: number | null; error: { message?: string } | null }>,
) {
  const { count, error } = await run();
  if (error || count == null) {
    throw new Error(`Build snapshot ${label} failed: ${error?.message || "count failed"}`);
  }
  if (count > MAX_ROWS) throw new Error(`Build snapshot ${label} exceeded ${MAX_ROWS} rows`);
  return count;
}

async function readPages<T>(
  label: string,
  expected: number,
  headOf: (row: T) => string,
  fetchPage: (from: number, to: number) => PromiseLike<PageResult<T>>,
) {
  if (expected === 0) return [];
  const rows: T[] = [];
  let previousHead = "";
  for (let from = 0; rows.length < expected; from += PAGE) {
    const { data, error } = await fetchPage(from, from + PAGE - 1);
    if (error) throw new Error(`Build snapshot ${label} failed: ${error.message || "read failed"}`);
    const chunk = data ?? [];
    const head = chunk.length ? headOf(chunk[0]) : "";
    if ((from > 0 && head && head === previousHead) || chunk.length === 0) {
      throw new Error(`Build snapshot ${label} stopped early`);
    }
    previousHead = head;
    rows.push(...chunk);
    if (rows.length > expected) throw new Error(`Build snapshot ${label} stopped early`);
  }
  return rows;
}

function indexSnapshot(file: SnapshotFile): BuildSnapshot {
  const marketsBySlug = new Map(file.markets.map((market) => [market.slug, market]));
  const marketsById = new Map(file.markets.map((market) => [market.id, market]));
  const vendorsBySlug = new Map(file.vendors.map((vendor) => [vendor.slug, vendor]));
  const vendorsById = new Map(file.vendors.map((vendor) => [vendor.id, vendor]));
  const schedulesByMarket = new Map<string, MarketSchedule[]>();
  for (const row of file.schedules) {
    const list = schedulesByMarket.get(row.market_id);
    if (list) list.push(row);
    else schedulesByMarket.set(row.market_id, [row]);
  }
  const linksByMarket = new Map<string, StallLink[]>();
  const linksByVendor = new Map<string, StallLink[]>();
  for (const stall of file.stalls) {
    const link: StallLink = {
      vendor_id: stall.id,
      market_id: stall.market_id,
      stall: stall.stall,
      days: stall.days,
    };
    const atMarket = linksByMarket.get(stall.market_id);
    if (atMarket) atMarket.push(link);
    else linksByMarket.set(stall.market_id, [link]);
    const forVendor = linksByVendor.get(stall.id);
    if (forVendor) forVendor.push(link);
    else linksByVendor.set(stall.id, [link]);
  }
  const menusByVendor = new Map<string, MenuItem[]>();
  for (const menu of file.menus) {
    const list = menusByVendor.get(menu.vendor_id);
    if (list) list.push(menu);
    else menusByVendor.set(menu.vendor_id, [menu]);
  }
  for (const list of menusByVendor.values()) {
    list.sort((a, b) => a.id.localeCompare(b.id));
  }
  const postsByMarket = new Map<string, StoredPost[]>();
  for (const post of file.posts) {
    if (!post.market_id) continue;
    const list = postsByMarket.get(post.market_id);
    if (list) list.push(post);
    else postsByMarket.set(post.market_id, [post]);
  }
  for (const list of postsByMarket.values()) list.sort(byCreated);
  const reviewsByVendor = new Map<string, StoredReview[]>();
  const reviewsByMarket = new Map<string, StoredReview[]>();
  for (const review of file.reviews) {
    if (review.vendor_id) {
      const list = reviewsByVendor.get(review.vendor_id);
      if (list) list.push(review);
      else reviewsByVendor.set(review.vendor_id, [review]);
    }
    if (review.market_id) {
      const list = reviewsByMarket.get(review.market_id);
      if (list) list.push(review);
      else reviewsByMarket.set(review.market_id, [review]);
    }
  }
  for (const list of reviewsByVendor.values()) {
    list.sort(byCreated);
    list.splice(LISTING_REVIEW_CAP);
  }
  for (const list of reviewsByMarket.values()) {
    list.sort(byCreated);
    list.splice(LISTING_REVIEW_CAP);
  }
  const contactBySlug = new Map<string, { phone: string | null; email: string | null }>();
  const claimedById = new Map<string, boolean>();
  for (const listing of file.listings) {
    contactBySlug.set(`${listing.kind}:${listing.slug}`, {
      phone: listing.phone,
      email: listing.email,
    });
    claimedById.set(`${listing.kind}:${listing.id}`, listing.claimed);
  }
  const emptyContact = { phone: null, email: null };

  return {
    contact(kind, slug) {
      return contactBySlug.get(`${kind}:${slug}`) ?? emptyContact;
    },
    isClaimed(kind, id) {
      return claimedById.get(`${kind}:${id}`) ?? false;
    },
    marketBySlug(slug) {
      return marketsBySlug.get(slug) ?? null;
    },
    vendorBySlug(slug) {
      return vendorsBySlug.get(slug) ?? null;
    },
    vendorById(id) {
      return vendorsById.get(id) ?? null;
    },
    marketById(id) {
      return marketsById.get(id) ?? null;
    },
    schedulesFor(marketId) {
      return schedulesByMarket.get(marketId) ?? [];
    },
    linksForMarket(marketId) {
      return linksByMarket.get(marketId) ?? [];
    },
    linksForVendor(vendorId) {
      return linksByVendor.get(vendorId) ?? [];
    },
    menusForVendor(vendorId) {
      return menusByVendor.get(vendorId) ?? [];
    },
    postsForMarket(marketId, limit = MARKET_POST_CAP) {
      return (postsByMarket.get(marketId) ?? []).slice(0, limit);
    },
    postsForMarkets(marketIds, limit = VENDOR_POST_CAP) {
      const rows: StoredPost[] = [];
      for (const id of marketIds) {
        const list = postsByMarket.get(id);
        if (list) rows.push(...list);
      }
      rows.sort(byCreated);
      return rows.slice(0, limit);
    },
    reviewsForVendor(vendorId) {
      return reviewsByVendor.get(vendorId) ?? [];
    },
    reviewPool(marketId, vendorIds) {
      const byId = new Map<string, StoredReview>();
      for (const row of reviewsByMarket.get(marketId) ?? []) byId.set(row.id, row);
      for (const id of vendorIds) {
        for (const row of reviewsByVendor.get(id) ?? []) byId.set(row.id, row);
      }
      return [...byId.values()];
    },
    hallsFor(vendorIds) {
      const wanted = new Set(vendorIds);
      return groupVendorHalls(
        file.stalls.filter((stall) => wanted.has(stall.id)),
        file.markets,
      );
    },
    findMenus(slugs, classifiers) {
      return filterFindMenus(file.menus, file.assignments, slugs, classifiers);
    },
    records() {
      return {
        markets: file.markets,
        vendors: file.vendors,
        stalls: file.stalls,
        schedules: file.schedules,
        rosterVendorIds: file.rosterVendorIds,
        menuVendorIds: file.menuVendorIds,
      };
    },
  };
}

function byCreated<T extends { created_at: string; id: string }>(a: T, b: T) {
  const time = +new Date(b.created_at) - +new Date(a.created_at);
  if (time !== 0) return time;
  return b.id.localeCompare(a.id);
}
