import { unstable_cache } from "next/cache";
import { getBareMarketsDirectory, searchDirectory } from "@/lib/data/catalog";
import { DIRECTORY_REVALIDATE_SECONDS, DIRECTORY_TAG } from "@/lib/directory-cache";
import { directoryInitialProps, filtersFromSearch, type DirectoryView } from "@/lib/directory-page";
import {
  FIND_ORIGINS,
  FIND_PRODUCTS,
  boundedDirectoryKey,
  type DirectorySort,
  type MarketsSearch,
} from "@/lib/find-paths";
import { createServiceClient } from "@/lib/supabase/admin";

const DIRECTORY_VIEW_CACHE = {
  revalidate: DIRECTORY_REVALIDATE_SECONDS,
  tags: [DIRECTORY_TAG],
};

const BARE_DIRECTORY_KEY = boundedDirectoryKey({});
const CHIP_TAGS = [...FIND_PRODUCTS, ...FIND_ORIGINS];
const WARM_MS = DIRECTORY_REVALIDATE_SECONDS * 1000;

type BoundedDirectory = {
  tags: string[];
  weekdays: number[];
  areas: string[];
  setup: string;
  openNow: boolean;
  sort: DirectorySort;
};

function searchFromBoundedKey(key: string): MarketsSearch {
  const parsed = JSON.parse(key) as BoundedDirectory;
  return {
    tags: parsed.tags,
    weekdays: parsed.weekdays,
    areas: parsed.areas,
    setup: parsed.setup || undefined,
    openNow: parsed.openNow,
    sort: parsed.sort,
  };
}

async function buildDirectoryView(search: MarketsSearch, now: Date): Promise<DirectoryView> {
  const page = await searchDirectory(filtersFromSearch(search), now);
  return {
    sortedAt: now.toISOString(),
    ...directoryInitialProps(page.markets, page.vendors, page.schedulesByMarket, page.halls),
  };
}

const loadCachedDirectoryView = unstable_cache(
  async (key: string) => buildDirectoryView(searchFromBoundedKey(key), new Date()),
  ["markets-directory-view-v1"],
  DIRECTORY_VIEW_CACHE,
);

/**
 * First page of a directory search.
 * Bounded filters (no free text, no coordinates) reuse the directory data cache.
 * The unfiltered page stays on `getBareMarketsDirectory`.
 */
export async function getDirectoryView(search: MarketsSearch, now = new Date()): Promise<DirectoryView> {
  const key = boundedDirectoryKey(search);
  if (!key) return buildDirectoryView(search, now);
  if (key === BARE_DIRECTORY_KEY) {
    const bare = await getBareMarketsDirectory();
    return { sortedAt: bare.sortedAt, ...bare.directory };
  }
  if (!createServiceClient()) return buildDirectoryView(searchFromBoundedKey(key), now);
  return loadCachedDirectoryView(key);
}

let warmedAt = 0;
let warming: Promise<void> | null = null;

/**
 * Fill the single-chip caches after a bare /markets response.
 * One pass per instance per cache window, never on the response path.
 */
export function warmChipDirectoryViews(): Promise<void> {
  if (Date.now() - warmedAt < WARM_MS) return Promise.resolve();
  if (warming) return warming;
  if (!createServiceClient()) return Promise.resolve();
  warming = (async () => {
    try {
      for (const tag of CHIP_TAGS) {
        const key = boundedDirectoryKey({ tags: [tag] });
        if (key) await loadCachedDirectoryView(key);
      }
      warmedAt = Date.now();
    } catch (error) {
      console.error("directory view warm", error instanceof Error ? error.message : "failed");
    } finally {
      warming = null;
    }
  })();
  return warming;
}
