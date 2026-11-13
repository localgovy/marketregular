import { permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import type { CatalogueCard } from "@/components/product-catalogue";
import { ProductsAtlas } from "@/components/products-atlas";
import { productPhoto } from "@/lib/data/product-photos";
import { listMarkets } from "@/lib/data/catalog";
import {
  MIN_PRODUCT_SEARCH_CHARS,
  normalizeSearchQuery,
  searchProducts,
  searchVendorsByName,
} from "@/lib/data/product-search";
import { copyText, siteCopy } from "@/content/site-copy";
import { takeCatalogSlot } from "@/lib/mail-limit";
import { parseCatalogueSort, type CatalogueSort } from "@/lib/product-browse-href";
import {
  BREAKFAST_ID,
  BREAKFAST_SLUGS,
  canonicalProductPath,
  catalogueAisles,
  catalogueHeading,
  filterCatalogue,
  liveFindPages,
  parseAisle,
  sortCatalogue,
} from "@/lib/product-catalogue";
import { torontoWeekday } from "@/lib/product-sort";
import { loadProductsHubContext } from "@/lib/products-atlas-data";
import { tryAcquireSearchSlot } from "@/lib/search-concurrency";
import { foldSearchText } from "@/lib/search-text";
import { pageMeta } from "@/lib/seo";

export type ProductQuery = {
  q?: string | string[];
  open?: string | string[];
  market?: string | string[];
  day?: string | string[];
  aisle?: string | string[];
  sort?: string | string[];
};

function textParam(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw?.trim() ?? "";
}

function dayParam(value: string) {
  if (!value) return null;
  const day = Number(value);
  if (!Number.isInteger(day) || day < 0 || day > 6) return null;
  return day;
}

export function readProductQuery(params: ProductQuery) {
  const q = textParam(params.q);
  const open = textParam(params.open);
  const market = textParam(params.market);
  const dayRaw = textParam(params.day);
  const aisle = textParam(params.aisle);
  const sort = textParam(params.sort);
  return {
    q,
    openRaw: open,
    openToday: open === "1",
    market,
    dayRaw,
    day: dayParam(dayRaw),
    aisle,
    sort,
  };
}

export async function productsMetadata(input: {
  q?: string;
  filtered: boolean;
  path: string;
}): Promise<Metadata> {
  return pageMeta({
    title: input.q
      ? copyText(siteCopy["/products"].searchTitle, { query: input.q })
      : siteCopy["/products"].title,
    description: copyText(siteCopy["/products"].description),
    path: input.path,
    index: !input.filtered,
  });
}

/**
 * Browse is a cached page. Search is the only path that reads a query.
 * A bad URL redirects before either one loads the directory.
 */
export async function ProductsScreen({
  query,
  aisle,
  sort,
}: {
  query?: ProductQuery;
  aisle: string | null;
  sort: CatalogueSort;
}) {
  const parsed = query ? readProductQuery(query) : null;
  const q = parsed?.q ?? "";
  const openRaw = parsed?.openRaw ?? "";
  const openToday = parsed?.openToday ?? false;
  const market = parsed?.market ?? "";
  const dayRaw = parsed?.dayRaw ?? "";
  const day = parsed?.day ?? null;
  const aisleRaw = parsed?.aisle ?? (aisle ?? "");
  const sortRaw = parsed?.sort ?? (sort === "name" ? "name" : "");

  const knownMarkets = market ? await listMarkets() : [];
  const marketKnown = !market || knownMarkets.some((item) => item.slug === market);
  const canonical = canonicalProductPath({
    q,
    openRaw,
    openToday,
    market: marketKnown ? market : "",
    marketRaw: market,
    dayRaw,
    day,
    aisleRaw,
    sortRaw,
  });
  if (canonical) permanentRedirect(canonical);

  const aisleId = parsed ? parseAisle(aisleRaw) : aisle;
  const catalogueSort = parsed ? parseCatalogueSort(sortRaw) : sort;
  const marketSlug = marketKnown ? market || null : null;

  const canSearch = foldSearchText(normalizeSearchQuery(q)).length >= MIN_PRODUCT_SEARCH_CHARS;
  const releaseConcurrency = canSearch ? tryAcquireSearchSlot() : null;
  let rateLimited = false;
  let products: Awaited<ReturnType<typeof searchProducts>> = [];
  let vendors: Awaited<ReturnType<typeof searchVendorsByName>> = [];
  let hubContext: Awaited<ReturnType<typeof loadProductsHubContext>>;

  try {
    const searchAllowed = canSearch
      ? releaseConcurrency !== null && (await takeCatalogSlot())
      : true;
    rateLimited = canSearch && !searchAllowed;

    [products, vendors, hubContext] = await Promise.all([
      canSearch && searchAllowed
        ? searchProducts({ q, openToday, marketSlug, day })
        : Promise.resolve([]),
      canSearch && searchAllowed ? searchVendorsByName(q) : Promise.resolve([]),
      loadProductsHubContext(aisleId),
    ]);
  } finally {
    releaseConcurrency?.();
  }

  const {
    markets,
    photos,
    census,
    renderedAt,
    marketClocks,
    spotlight,
    stallsByAisle,
    featuredStalls,
  } = hubContext;

  const filtersNeedQuery = !q && (openToday || Boolean(marketSlug) || day != null);
  const seen = new Set(products.map((hit) => hit.vendorSlug));
  const shops = vendors.filter((vendor) => !seen.has(vendor.slug));
  const halls = [...markets]
    .sort((a, b) => a.name.localeCompare(b.name, "en-CA"))
    .map((item) => ({ slug: item.slug, name: item.name }));

  const today = torontoWeekday();
  const live = liveFindPages();
  const aisles = catalogueAisles(live);
  const heading = catalogueHeading(aisleId);

  const cards: CatalogueCard[] = sortCatalogue(filterCatalogue(live, aisleId), catalogueSort, aisleId).map(
    (page) => {
      const photo = productPhoto(photos, page.slug, page.category);
      return {
        term: page.term,
        slug: page.slug,
        categoryLabel: page.categoryLabel,
        imageUrl: photo?.url ?? null,
        imageAlt: photo?.alt ?? null,
        vendors: page.vendors,
      };
    },
  );

  const choices = [
    { id: null, label: "All products", count: live.length },
    { id: BREAKFAST_ID, label: "Breakfast", count: BREAKFAST_SLUGS.length },
    ...aisles.map((item) => ({ id: item.id, label: item.label, count: item.pages.length })),
  ];

  return (
    <ProductsAtlas
      q={q}
      openToday={openToday}
      marketSlug={marketSlug}
      day={day}
      aisle={aisleId}
      sort={catalogueSort}
      filtersNeedQuery={filtersNeedQuery}
      today={today}
      halls={halls}
      products={products}
      shops={shops}
      aisles={aisles}
      cards={cards}
      choices={choices}
      heading={heading}
      aislePhotos={photos.aisle}
      census={census}
      renderedAt={renderedAt}
      marketClocks={marketClocks}
      spotlight={spotlight}
      stallsByAisle={stallsByAisle}
      featuredStalls={featuredStalls}
      rateLimited={rateLimited}
    />
  );
}
