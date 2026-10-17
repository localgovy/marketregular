import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BackButton } from "@/components/back-button";
import { JsonLd } from "@/components/json-ld";
import { ProductPhotoFrame } from "@/components/product-photo-frame";
import { SortableFindVendors } from "@/components/product-sort-list";
import { findPageBySlug, listedFindPages } from "@/data/find-pages";
import { findSlugRedirectsToProducts } from "@/data/find-redirects";
import { listProductPhotos, productPhoto } from "@/lib/data/product-photos";
import { findTitle, listFindVendors, pageIsAlcohol } from "@/lib/data/product-search";
import { LAUNCH_CITY } from "@/lib/launch";
import { sortFindVendors, torontoWeekday } from "@/lib/product-sort";
import { itemListJsonLd, pageMeta } from "@/lib/seo";
import { cn } from "@/lib/utils";

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
  const title = findTitle(page.term, LAUNCH_CITY);
  const now = new Date();
  const today = torontoWeekday(now);
  const [vendors, photos] = await Promise.all([
    listFindVendors(page),
    listProductPhotos(),
  ]);
  const ordered = sortFindVendors(vendors, "next", today);
  const photo = productPhoto(photos, page.slug, page.category);
  const alcohol = pageIsAlcohol(page.category);

  return (
    <div className={cn("mx-auto w-full px-4 py-10", photo ? "max-w-6xl" : "max-w-4xl")}>
      <JsonLd
        data={itemListJsonLd({
          name: title,
          path: `/find/${page.slug}`,
          items: ordered.map((vendor) => ({
            name: vendor.name,
            path: `/vendors/${vendor.slug}`,
          })),
        })}
      />
      <BackButton href="/products" />
      <h1 className="mt-3">{title}</h1>
      <p className="type-lede mt-3 max-w-2xl">
        {page.term} from stalls at {LAUNCH_CITY} farmers&apos; markets. These vendors list it, with
        the markets and days where they sell.
      </p>
      {alcohol ? null : (
        <p className="mt-2 max-w-2xl text-base text-muted-foreground">
          Prices show when the vendor has added them.
        </p>
      )}
      <div
        className={cn(
          photo &&
            "md:grid md:grid-cols-[minmax(0,1fr)_13rem] md:items-start md:gap-x-6 lg:grid-cols-[minmax(0,1fr)_16rem] lg:gap-x-8",
        )}
      >
        <div className="min-w-0">
          <SortableFindVendors vendors={ordered} today={today} />
        </div>
        {photo ? (
          <figure className="mt-8 max-w-sm md:mt-6 md:max-w-none">
            <ProductPhotoFrame name={page.term} photo={photo} />
          </figure>
        ) : null}
      </div>
    </div>
  );
}
