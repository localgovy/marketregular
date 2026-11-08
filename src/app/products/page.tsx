import { ProductsScreen, productsMetadata } from "@/app/products/screen";

/** Cold directory reads can be slow. Past this, kill the function instead of holding it. */
export const maxDuration = 60;

/**
 * The unfiltered catalogue. A number literal equal to DIRECTORY_REVALIDATE_SECONDS.
 * Query strings are rewritten to the search route or a browse page.
 */
export const revalidate = 3600;

export function generateMetadata() {
  return productsMetadata({ filtered: false, path: "/products" });
}

export default function ProductsPage() {
  return <ProductsScreen aisle={null} sort="featured" />;
}
