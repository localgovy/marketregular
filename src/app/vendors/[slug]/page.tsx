import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { JsonLd } from "@/components/json-ld";
import { VendorAtlas } from "@/components/vendor-atlas";
import { getListingContact, getVendorBySlug, listVendors } from "@/lib/data/catalog";
import { listingIsClaimed } from "@/lib/listing-claimed";
import { retiredVendorTarget } from "@/lib/data/retired-listings";
import { serverNowMs } from "@/lib/clock";
import { vendorPageDescription, vendorPageTitle } from "@/lib/listing-copy";
import { vendorHasSubstance } from "@/lib/listing-substance";
import { sessionOnWeekday } from "@/lib/schedule";
import { rankVendorMarkets } from "@/lib/vendor-markets";
import { buildVendorAtlasData } from "@/lib/vendor-atlas-data";
import { breadcrumbJsonLd, MARKETS_CRUMB, pageMeta, vendorJsonLd } from "@/lib/seo";

export const revalidate = 3600;
// A dynamic segment stays uncached until this is set. The hour window is revalidate.
export const dynamic = "force-static";
// Unknown slugs 404 in the layout, the same way a missing post does. On-demand
// rendering of a missing slug is what cached the error document that reloaded.
export const dynamicParams = false;

export async function generateStaticParams() {
  const vendors = await listVendors();
  return vendors.map((vendor) => ({ slug: vendor.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [vendor, contact] = await Promise.all([
    getVendorBySlug(slug),
    getListingContact("vendor", slug),
  ]);
  if (!vendor) {
    const retired = await retiredVendorTarget(slug);
    if (retired) permanentRedirect(retired);
    notFound();
  }
  const now = new Date();
  const marketNames = vendor.markets.map((market) => market.name);
  return pageMeta({
    title: vendorPageTitle(vendor.name, marketNames),
    description: vendorPageDescription({
      name: vendor.name,
      about: vendor.about,
      marketNames,
      days: vendor.markets.flatMap((market) =>
        market.days.filter((day) =>
          sessionOnWeekday(market.schedules, day, market.province, now),
        ),
      ),
      tags: vendor.tags,
    }),
    path: `/vendors/${vendor.slug}`,
    // Name-and-markets pages stay out of the index but keep passing equity to the halls.
    index: vendorHasSubstance(vendor, contact),
    follow: true,
  });
}

export default async function VendorPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [vendor, contact] = await Promise.all([
    getVendorBySlug(slug),
    getListingContact("vendor", slug),
  ]);
  if (!vendor) {
    const retired = await retiredVendorTarget(slug);
    if (retired) permanentRedirect(retired);
    notFound();
  }
  const taken = await listingIsClaimed("vendor", vendor.id);

  const nowMs = serverNowMs();
  const now = new Date(nowMs);
  const ranked = rankVendorMarkets(vendor.markets, now);
  const homeMarket = ranked[0];

  const atlasData = await buildVendorAtlasData({
    vendor,
    contact,
    claimed: taken,
    nowMs,
  });

  return (
    <>
      <JsonLd data={vendorJsonLd(vendor, contact)} />
      <JsonLd
        data={breadcrumbJsonLd([
          MARKETS_CRUMB,
          ...(homeMarket
            ? [{ name: homeMarket.name, path: `/markets/${homeMarket.slug}` }]
            : []),
          { name: vendor.name, path: `/vendors/${vendor.slug}` },
        ])}
      />
      <VendorAtlas key={vendor.slug} data={atlasData} />
    </>
  );
}
