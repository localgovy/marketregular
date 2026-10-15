export type CatalogueSort = "featured" | "name";

export function parseCatalogueSort(value: string | undefined): CatalogueSort {
  return value === "name" ? "name" : "featured";
}

/** Aisle and sort stay in the URL. Featured is the default and is omitted. */
export function productsBrowsePath(aisle: string | null, sort: CatalogueSort) {
  const params = new URLSearchParams();
  if (aisle) params.set("aisle", aisle);
  if (sort === "name") params.set("sort", "name");
  const query = params.toString();
  return query ? `/products?${query}` : "/products";
}

/** Same path, scrolled to the product grid. */
export function productsBrowseHref(aisle: string | null, sort: CatalogueSort) {
  return `${productsBrowsePath(aisle, sort)}#products`;
}
