import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BackButton } from "@/components/back-button";
import { JsonLd } from "@/components/json-ld";
import { FindVendorList } from "@/components/product-results";
import { FIND_PAGES, findPageBySlug } from "@/data/find-pages";
import { findTitle, listFindVendors, pageIsAlcohol } from "@/lib/data/product-search";
import { LAUNCH_CITY } from "@/lib/launch";
import { itemListJsonLd, pageMeta } from "@/lib/seo";

export const revalidate = 3600;
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return FIND_PAGES.map((page) => ({ slug: page.slug }));
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
  return pageMeta({
    title,
    description: `${title}. Stalls that list it, the markets they sell at, and the days they are there.`,
    path: `/find/${page.slug}`,
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
  const vendors = await listFindVendors(page.matchSlugs);
  const alcohol = pageIsAlcohol(page.category);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10">
      <JsonLd
        data={itemListJsonLd({
          name: title,
          path: `/find/${page.slug}`,
          items: vendors.map((vendor) => ({
            name: vendor.name,
            path: `/vendors/${vendor.slug}`,
          })),
        })}
      />
      <BackButton href="/markets" />
      <h1 className="mt-3">{title}</h1>
      <p className="type-lede mt-3">
        {page.term} from stalls at {LAUNCH_CITY} farmers&apos; markets. These vendors list it, with
        the markets and days where they sell.
      </p>
      {alcohol ? null : (
        <p className="mt-2 text-base text-muted-foreground">
          Prices show when the vendor has added them.
        </p>
      )}
      <FindVendorList vendors={vendors} />
    </div>
  );
}
