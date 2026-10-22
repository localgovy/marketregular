import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FindProductAtlas } from "@/components/find-product-atlas";
import { JsonLd } from "@/components/json-ld";
import { findPageBySlug, listedFindPages } from "@/data/find-pages";
import { findSlugRedirectsToProducts } from "@/data/find-redirects";
import { findTitle, listFindVendors } from "@/lib/data/product-search";
import { LAUNCH_CITY } from "@/lib/launch";
import { loadFindProductAtlasData } from "@/lib/products-atlas-data";
import { itemListJsonLd, pageMeta } from "@/lib/seo";

export const revalidate = 3600;
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return listedFindPages()
    .filter((page) => !findSlugRedirectsToProducts(page.slug))
    .map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = findPageBySlug(slug);
  if (!page) return { title: "Product" };
  const title = findTitle(page.term, LAUNCH_CITY);
  const vendors = await listFindVendors(page);
  return pageMeta({
    title,
    description: `${title}. Stalls that list it, the markets they sell at, and the days they are there.`,
    path: `/find/${page.slug}`,
    index: vendors.length >= 5,
  });
}

export default async function FindProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = findPageBySlug(slug);
  if (!page) notFound();

  const now = new Date();
  const data = await loadFindProductAtlasData(page, now);

  return (
    <>
      <JsonLd
        data={itemListJsonLd({
          name: data.title,
          path: `/find/${page.slug}`,
          items: data.vendors.map((vendor) => ({
            name: vendor.name,
            path: `/vendors/${vendor.slug}`,
          })),
        })}
      />
      <FindProductAtlas data={data} />
    </>
  );
}
