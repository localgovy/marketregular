import { permanentRedirect } from "next/navigation";
import {
  ProductsScreen,
  productsMetadata,
  readProductQuery,
  type ProductQuery,
} from "@/app/products/screen";

/** A search that cannot finish quickly is aborted. It must not hold a function for a minute. */
export const maxDuration = 20;
export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<ProductQuery>;
}) {
  const parsed = readProductQuery(await searchParams);
  const filtered = Boolean(
    parsed.q || parsed.openToday || parsed.market || parsed.dayRaw || parsed.aisle || parsed.sort,
  );
  return productsMetadata({
    q: parsed.q,
    filtered,
    path: parsed.q ? `/products?q=${encodeURIComponent(parsed.q)}` : "/products",
  });
}

export default async function ProductsSearchPage({
  searchParams,
}: {
  searchParams: Promise<ProductQuery>;
}) {
  const params = await searchParams;
  const parsed = readProductQuery(params);
  if (!parsed.q && !parsed.openRaw && !parsed.market && !parsed.dayRaw) {
    permanentRedirect("/products");
  }
  return <ProductsScreen query={params} aisle={null} sort="featured" />;
}
