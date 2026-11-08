import { notFound } from "next/navigation";
import { FIND_CATEGORIES } from "@/data/find-pages";
import { ProductsScreen, productsMetadata } from "@/app/products/screen";
import { productsBrowsePath, type CatalogueSort } from "@/lib/product-browse-href";
import { BREAKFAST_ID, parseAisle } from "@/lib/product-catalogue";

/** Same hourly catalogue as /products. Next.js requires the number to be a literal. */
export const revalidate = 3600;
export const dynamicParams = false;

export function generateStaticParams() {
  const aisles = ["all", BREAKFAST_ID, ...FIND_CATEGORIES.map((category) => category.id)];
  const sorts = ["featured", "name"];
  return aisles.flatMap((aisle) => sorts.map((sort) => ({ aisle, sort })));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ aisle: string; sort: string }>;
}) {
  const { aisle, sort } = await params;
  const aisleId = aisle === "all" ? null : parseAisle(aisle);
  const catalogueSort: CatalogueSort = sort === "name" ? "name" : "featured";
  return productsMetadata({
    filtered: true,
    path: productsBrowsePath(aisleId, catalogueSort),
  });
}

export default async function ProductsBrowsePage({
  params,
}: {
  params: Promise<{ aisle: string; sort: string }>;
}) {
  const { aisle, sort } = await params;
  const aisleId = aisle === "all" ? null : parseAisle(aisle);
  if (aisle !== "all" && !aisleId) notFound();
  if (sort !== "featured" && sort !== "name") notFound();
  return <ProductsScreen aisle={aisleId} sort={sort} />;
}
