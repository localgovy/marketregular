import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import type { CatalogueCard } from "@/components/product-catalogue";
import { ProductsAtlas } from "@/components/products-atlas";
import { productPhoto } from "@/lib/data/product-photos";
import { searchProducts, searchVendorsByName } from "@/lib/data/product-search";
import { LAUNCH_CITY } from "@/lib/launch";
import { parseCatalogueSort } from "@/lib/product-browse-href";
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
import { pageMeta } from "@/lib/seo";

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

type ProductQuery = {
  q?: string | string[];
  open?: string | string[];
  market?: string | string[];
  day?: string | string[];
  aisle?: string | string[];
  sort?: string | string[];
};

function readProductQuery(params: ProductQuery) {
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

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<ProductQuery>;
}): Promise<Metadata> {
  const params = await searchParams;
  const { q, openToday, market, dayRaw, aisle, sort } = readProductQuery(params);
  const filtered = Boolean(q || openToday || market || dayRaw || aisle || sort);
  return pageMeta({
    title: q ? `${q} at ${LAUNCH_CITY} farmers' markets` : "Products",
    description: `Search products and the vendors who sell them at ${LAUNCH_CITY} farmers' markets.`,
    path: "/products",
    index: !filtered,
  });
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<ProductQuery>;
}) {
  const params = await searchParams;
  const {
    q,
    openRaw,
    openToday,
    market,
    dayRaw,
    day,
    aisle: aisleRaw,
    sort: sortRaw,
  } = readProductQuery(params);
  const aisle = parseAisle(aisleRaw);
  const sort = parseCatalogueSort(sortRaw);

  const [products, vendors, hubContext] = await Promise.all([
    q ? searchProducts({ q, openToday, marketSlug: market || null, day }) : Promise.resolve([]),
    q ? searchVendorsByName(q) : Promise.resolve([]),
    loadProductsHubContext(aisle),
  ]);

  const {
    markets,
    photos,
    census,
    openNowCount,
    sellingTodayCount,
    spotlight,
    stallsByAisle,
    featuredStalls,
  } = hubContext;

  const marketKnown = !market || markets.some((item) => item.slug === market);
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

  const marketSlug = marketKnown ? market || null : null;
  const filtersNeedQuery = !q && (openToday || Boolean(marketSlug) || day != null);
  const seen = new Set(products.map((hit) => hit.vendorSlug));
  const shops = vendors.filter((vendor) => !seen.has(vendor.slug));
  const halls = [...markets]
    .sort((a, b) => a.name.localeCompare(b.name, "en-CA"))
    .map((item) => ({ slug: item.slug, name: item.name }));

  const today = torontoWeekday();
  const live = liveFindPages();
  const aisles = catalogueAisles(live);
  const heading = catalogueHeading(aisle);

  const cards: CatalogueCard[] = sortCatalogue(filterCatalogue(live, aisle), sort, aisle).map(
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
      aisle={aisle}
      sort={sort}
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
      openNowCount={openNowCount}
      sellingTodayCount={sellingTodayCount}
      spotlight={spotlight}
      stallsByAisle={stallsByAisle}
      featuredStalls={featuredStalls}
    />
  );
}
