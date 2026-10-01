import type { Metadata } from "next";
import { ProductBrowse } from "@/components/product-browse";
import { SortableProductHits } from "@/components/product-sort-list";
import { VendorHitList } from "@/components/product-results";
import { SearchField } from "@/components/search-field";
import { listMarkets } from "@/lib/data/catalog";
import { searchProducts, searchVendorsByName } from "@/lib/data/product-search";
import { PRODUCT_SEARCH_LABEL, PRODUCT_SEARCH_PLACEHOLDER, WEEKDAYS } from "@/lib/constants";
import { LAUNCH_CITY } from "@/lib/launch";
import { torontoWeekday } from "@/lib/product-sort";
import { pageMeta } from "@/lib/seo";

const selectClass =
  "h-9 w-full max-w-full rounded-none border border-input bg-card px-2.5 text-sm";

function dayParam(value: string | undefined) {
  if (value == null || value === "") return null;
  const day = Number(value);
  if (!Number.isInteger(day) || day < 0 || day > 6) return null;
  return day;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; open?: string; market?: string; day?: string }>;
}): Promise<Metadata> {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const filtered = Boolean(query || params.open === "1" || params.market?.trim() || params.day);
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
  }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const openToday = params.open === "1";
  const marketSlug = params.market?.trim() || null;
  const day = dayParam(params.day);
  const [markets, products, vendors] = await Promise.all([
    listMarkets(),
    q ? searchProducts({ q, openToday, marketSlug, day }) : Promise.resolve([]),
    q ? searchVendorsByName(q) : Promise.resolve([]),
  ]);
  const seen = new Set(products.map((hit) => hit.vendorSlug));
  const shops = vendors.filter((vendor) => !seen.has(vendor.slug));
  const halls = [...markets].sort((a, b) => a.name.localeCompare(b.name, "en-CA"));
  const today = torontoWeekday();

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10">
      <h1>{q ? `${q} at ${LAUNCH_CITY} farmers' markets` : "Products"}</h1>
      <p className="type-lede mt-3">
        Search what the stalls sell, then open the vendor to see where they set up.
      </p>
      <form action="/products" className="mt-6 grid gap-4">
        <SearchField
          name="q"
          key={q}
          defaultValue={q}
          aria-label={PRODUCT_SEARCH_LABEL}
          placeholder={PRODUCT_SEARCH_PLACEHOLDER}
        />
        <label className="flex items-center gap-2 text-base">
          <input
            type="checkbox"
            name="open"
            value="1"
            defaultChecked={openToday}
            className="accent-primary"
          />
          Selling today
        </label>
        <label className="grid gap-1.5 text-sm font-medium">
          Market
          <select name="market" defaultValue={marketSlug ?? ""} className={selectClass}>
            <option value="">Any market</option>
            {halls.map((market) => (
              <option key={market.slug} value={market.slug}>
                {market.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-sm font-medium">
          Day
          <select name="day" defaultValue={day == null ? "" : String(day)} className={selectClass}>
            <option value="">Any day</option>
            {WEEKDAYS.map((name, index) => (
              <option key={name} value={index}>
                {name}
              </option>
            ))}
          </select>
        </label>
        {/* TODO: Pickup available. Hide until vendors have a pickup flag. Do not invent one. */}
        <button type="submit" className="justify-self-start text-base font-medium hover:underline">
          Apply
        </button>
      </form>
      {q ? (
        <div className="mt-8 grid gap-8">
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
        <ProductBrowse />
      )}
    </div>
  );
}
