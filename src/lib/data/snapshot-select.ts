/**
 * Pure cuts of the listing queries used while prerendering.
 * The build snapshot stores the rows these caps need, then runs the same
 * chunk-and-slice the live market query uses.
 */

export const LISTING_REVIEW_CAP = 40;
export const REVIEW_CHUNK = 100;
export const MARKET_POST_CAP = 40;
export const VENDOR_POST_CAP = 120;

/** Keep in step with the find-page menu query: slices of 40, 4 pages of 1,000. */
export const FIND_SLUG_SLICE = 40;
export const FIND_MENU_PAGE = 1000;
export const FIND_MENU_PAGE_CAP = 4;

export type NewestRow = {
  id: string;
  created_at: string;
  flagged?: boolean;
};

export type ReviewPick = NewestRow & {
  market_id: string | null;
  vendor_id: string | null;
};

export function compareNewest<T extends { created_at: string; id?: string }>(a: T, b: T) {
  const time = +new Date(b.created_at) - +new Date(a.created_at);
  if (time !== 0) return time;
  return (b.id ?? "").localeCompare(a.id ?? "");
}

function unflagged<T extends NewestRow>(rows: readonly T[]) {
  return rows.filter((row) => row.flagged !== true);
}

function topGroups<T extends NewestRow>(
  rows: readonly T[],
  key: (row: T) => string | null,
  cap: number,
) {
  const groups = new Map<string, T[]>();
  for (const row of unflagged(rows)) {
    const id = key(row);
    if (!id) continue;
    const list = groups.get(id);
    if (list) list.push(row);
    else groups.set(id, [row]);
  }
  for (const [id, list] of groups) {
    list.sort(compareNewest);
    groups.set(id, list.slice(0, cap));
  }
  return groups;
}

/** Newest reviews a market page and a stall page can both see. */
export function reviewsWithinCaps<T extends ReviewPick>(
  rows: readonly T[],
  cap = LISTING_REVIEW_CAP,
): T[] {
  const byVendor = topGroups(rows, (row) => row.vendor_id, cap);
  const byMarket = topGroups(rows, (row) => row.market_id, cap);
  const byId = new Map<string, T>();
  for (const list of byVendor.values()) {
    for (const row of list) byId.set(row.id, row);
  }
  for (const list of byMarket.values()) {
    for (const row of list) byId.set(row.id, row);
  }
  return [...byId.values()];
}

/** Newest posts kept per hall. A stall page then takes the newest across its halls. */
export function postsWithinCaps<T extends NewestRow & { market_id: string | null }>(
  rows: readonly T[],
  perMarket = VENDOR_POST_CAP,
): T[] {
  return [...topGroups(rows, (row) => row.market_id, perMarket).values()].flat();
}

/**
 * Same result as `newestListingReviews`: each id chunk contributes its newest
 * rows, then the merged list is cut to the cap. A review outside a vendor's
 * own newest cap cannot enter that result.
 */
export function selectChunkedListingReviews<T extends ReviewPick>(
  rows: readonly T[],
  marketId: string,
  vendorIds: readonly string[],
  cap = LISTING_REVIEW_CAP,
  chunkSize = REVIEW_CHUNK,
): T[] {
  const pool = unflagged(rows);
  const filters: Array<{ column: "market_id" | "vendor_id"; ids: string[] }> = [
    { column: "market_id", ids: [marketId] },
  ];
  if (vendorIds.length) filters.push({ column: "vendor_id", ids: [...vendorIds] });

  const picked: T[] = [];
  const seen = new Set<string>();
  for (const filter of filters) {
    for (let index = 0; index < filter.ids.length; index += chunkSize) {
      const ids = new Set(filter.ids.slice(index, index + chunkSize));
      const chunk = pool
        .filter((row) => {
          const value = row[filter.column];
          return value != null && ids.has(value);
        })
        .sort(compareNewest)
        .slice(0, cap);
      for (const row of chunk) {
        if (seen.has(row.id)) continue;
        seen.add(row.id);
        picked.push(row);
      }
    }
  }
  return picked.sort(compareNewest).slice(0, cap);
}

export type FindMenuPick = {
  id?: string;
  name: string;
  product_category?: string | null;
  product_slug?: string | null;
  price_cents: number | null;
  vendor_id: string;
  image_url?: string | null;
};

export type FindAssignmentPick = {
  menu_id: string;
  classifier_slug: string;
};

export type FindMenuLimits = {
  slice?: number;
  page?: number;
  pages?: number;
};

/**
 * In-memory form of the find-page menu read. Slug slices keep the first
 * `page * pages` rows ordered by id. Classifier rows are the same cap,
 * ordered by menu id, then the menus those ids point at.
 */
export function filterFindMenus<T extends FindMenuPick>(
  menus: readonly T[],
  assignments: readonly FindAssignmentPick[],
  slugs: readonly string[],
  classifiers: readonly string[],
  limits: FindMenuLimits = {},
): T[] {
  const sliceSize = limits.slice ?? FIND_SLUG_SLICE;
  const page = limits.page ?? FIND_MENU_PAGE;
  const pages = limits.pages ?? FIND_MENU_PAGE_CAP;
  const cap = page * pages;
  const rows: T[] = [];
  const bySlug = new Map<string, T[]>();
  for (const menu of menus) {
    if (!menu.product_slug) continue;
    const list = bySlug.get(menu.product_slug);
    if (list) list.push(menu);
    else bySlug.set(menu.product_slug, [menu]);
  }
  for (const list of bySlug.values()) {
    list.sort((a, b) => (a.id ?? "").localeCompare(b.id ?? ""));
  }

  for (let index = 0; index < slugs.length; index += sliceSize) {
    const slice = slugs.slice(index, index + sliceSize);
    const matched: T[] = [];
    for (const slug of slice) {
      const list = bySlug.get(slug);
      if (list) matched.push(...list);
    }
    matched.sort((a, b) => (a.id ?? "").localeCompare(b.id ?? ""));
    for (const row of matched.slice(0, cap)) {
      if (row.product_slug) rows.push(row);
    }
  }

  if (!classifiers.length) return rows;
  const wanted = new Set(classifiers);
  const matchedAssignments = assignments
    .filter((row) => wanted.has(row.classifier_slug))
    .sort(
      (a, b) =>
        a.menu_id.localeCompare(b.menu_id) || a.classifier_slug.localeCompare(b.classifier_slug),
    )
    .slice(0, cap);
  const byId = new Map<string, T>();
  for (const menu of menus) {
    if (menu.id) byId.set(menu.id, menu);
  }
  const seen = new Set<string>();
  for (const row of matchedAssignments) {
    if (!row.menu_id || seen.has(row.menu_id)) continue;
    seen.add(row.menu_id);
    const menu = byId.get(row.menu_id);
    if (menu) rows.push(menu);
  }
  return rows;
}
