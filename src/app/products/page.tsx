import type { Metadata } from "next";
import Link from "next/link";
import { ProductAisles } from "@/components/product-aisles";
import { ProductCatalogue, type CatalogueCard } from "@/components/product-catalogue";
import { ProductDirectory } from "@/components/product-directory";
import { ProductPhotoFrame } from "@/components/product-photo-frame";
import { ProductSearchForm } from "@/components/product-search-form";
import { SortableProductHits } from "@/components/product-sort-list";
import { VendorHitList } from "@/components/product-results";
import { listMarkets } from "@/lib/data/catalog";
import {
  EMPTY_PRODUCT_PHOTOS,
  listProductPhotos,
  productPhoto,
} from "@/lib/data/product-photos";
import { searchProducts, searchVendorsByName } from "@/lib/data/product-search";
import { LAUNCH_CITY } from "@/lib/launch";
import { parseCatalogueSort } from "@/lib/product-browse-href";
import {
  BREAKFAST_ID,
  catalogueAisles,
  catalogueHeading,
  filterCatalogue,
  liveFindPages,
  parseAisle,
  sortCatalogue,
} from "@/lib/product-catalogue";
import { torontoWeekday } from "@/lib/product-sort";
import { pageMeta } from "@/lib/seo";

function dayParam(value: string | undefined) {
  if (value == null || value === "") return null;
  const day = Number(value);
  if (!Number.isInteger(day) || day < 0 || day > 6) return null;
  return day;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    open?: string;
    market?: string;
    day?: string;
    aisle?: string;
    sort?: string;
  }>;
}): Promise<Metadata> {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const filtered = Boolean(
    query || params.open === "1" || params.market?.trim() || params.day || params.aisle?.trim() || params.sort?.trim(),
  );
  return pageMeta({
    title: query ? `${query} at ${LAUNCH_CITY} farmers' markets` : "Products",
    description: `Search products and the vendors who sell them at ${LAUNCH_CITY} farmers' markets.`,
    path: "/products",
    index: !filtered,
  });
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    open?: string;
    market?: string;
    day?: string;
    aisle?: string;
    sort?: string;
  }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const openToday = params.open === "1";
  const marketSlug = params.market?.trim() || null;
  const day = dayParam(params.day);
  const aisle = parseAisle(params.aisle);
  const sort = parseCatalogueSort(params.sort);
  const filtersNeedQuery = !q && (openToday || Boolean(marketSlug) || day != null);
  const [markets, products, vendors, photos] = await Promise.all([
    listMarkets(),
    q ? searchProducts({ q, openToday, marketSlug, day }) : Promise.resolve([]),
    q ? searchVendorsByName(q) : Promise.resolve([]),
    q ? Promise.resolve(EMPTY_PRODUCT_PHOTOS) : listProductPhotos(),
  ]);
  const seen = new Set(products.map((hit) => hit.vendorSlug));
  const shops = vendors.filter((vendor) => !seen.has(vendor.slug));
  const halls = [...markets]
    .sort((a, b) => a.name.localeCompare(b.name, "en-CA"))
    .map((market) => ({ slug: market.slug, name: market.name }));
  const today = torontoWeekday();
  const live = liveFindPages();
  const aisles = catalogueAisles(live);
  const heading = catalogueHeading(aisle);
  const cards: CatalogueCard[] = sortCatalogue(filterCatalogue(live, aisle), sort).map((page) => {
    const photo = productPhoto(photos, page.slug, page.category);
    return {
      term: page.term,
      slug: page.slug,
      categoryLabel: page.categoryLabel,
      imageUrl: photo?.url ?? null,
      imageAlt: photo?.alt ?? null,
    };
  });
  const choices = [
    { id: null, label: "All products" },
    { id: BREAKFAST_ID, label: "Breakfast" },
    ...aisles.map((item) => ({ id: item.id, label: item.label })),
  ];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 lg:px-6">
      <div className={photos.hero && !q && !aisle ? "lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)] lg:items-end lg:gap-8" : undefined}>
        <div>
          <h1>{q ? `${q} at ${LAUNCH_CITY} farmers' markets` : "Products"}</h1>
          <p className="type-lede mt-3 max-w-2xl">
            Search what the stalls sell, or start from an aisle. Each product opens the vendors who
            list it and the markets where they set up.
          </p>
        </div>
        {photos.hero && !q && !aisle ? (
          <ProductPhotoFrame
            name="Products"
            photo={photos.hero}
            className="mt-6 hidden lg:mt-0 lg:flex"
          />
        ) : null}
      </div>
      <ProductSearchForm
        q={q}
        openToday={openToday}
        marketSlug={marketSlug}
        day={day}
        markets={halls}
      />
      {filtersNeedQuery ? (
        <p className="mt-3 text-base text-muted-foreground">
          Add a product name to use selling today, a market, or a day.
        </p>
      ) : null}
      {q ? (
        <div className="mt-8 grid gap-8">
          <p>
            <Link href="/products" className="text-base font-medium hover:underline">
              Browse aisles
            </Link>
          </p>
          <section>
            <h2>Products</h2>
            {products.length ? (
              <div className="mt-4">
                <SortableProductHits
                  hits={products}
                  today={today}
                  page={{ q, openToday, marketSlug, day }}
                />
              </div>
            ) : (
              <p className="mt-3 text-base text-muted-foreground">No products match that search.</p>
            )}
          </section>
          <section>
            <h2>Vendors</h2>
            {shops.length ? (
              <div className="mt-4">
                <VendorHitList vendors={shops} />
              </div>
            ) : (
              <p className="mt-3 text-base text-muted-foreground">No other vendors match that name.</p>
            )}
          </section>
        </div>
      ) : (
        <>
          <ProductAisles aisles={aisles} aisle={aisle} sort={sort} photos={photos.aisle} />
          <ProductCatalogue
            key={`${aisle ?? "all"}-${sort}`}
            pages={cards}
            choices={choices}
            aisle={aisle}
            sort={sort}
            title={heading.title}
            blurb={heading.blurb}
          />
          <ProductDirectory aisles={aisles} />
          <p className="mt-10 text-base">
            <Link href="/markets" className="font-medium hover:underline">
              See this week&apos;s markets
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
