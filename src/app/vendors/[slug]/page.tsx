import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { BackButton } from "@/components/back-button";
import { ClaimForm } from "@/components/claim-form";
import { JsonLd } from "@/components/json-ld";
import { ListingAlsoLinks } from "@/components/listing-also-links";
import { ListingMark } from "@/components/listing-mark";
import { ListingScore } from "@/components/listing-score";
import { ListingReviewGate } from "@/components/listing-review-gate";
import { SaveButton } from "@/components/save-button";
import { ReviewCard } from "@/components/review-card";
import { StallMenu } from "@/components/stall-menu";
import { ListingContact, ListingWebsite, ListingInstagram, ListingTiktok, ListingFacebook } from "@/components/listing-contact";
import { TagList } from "@/components/tag-list";
import { getListingContact, getVendorBySlug, listVendors } from "@/lib/data/catalog";
import { retiredVendorTarget } from "@/lib/data/retired-listings";
import { toGeoMarket } from "@/lib/geo";
import { VendorMarketList } from "@/components/vendor-market-list";
import { VendorNextLine } from "@/components/live-open";
import { serverNowMs } from "@/lib/clock";
import { sortTagsForDisplay } from "@/lib/find-paths";
import { vendorPageDescription, vendorPageTitle } from "@/lib/listing-copy";
import { vendorHasSubstance } from "@/lib/listing-substance";
import { hallDayHours, sessionOnWeekday } from "@/lib/schedule";
import { rankVendorMarkets } from "@/lib/vendor-markets";
import { VENDOR_SALES_OPEN } from "@/lib/selling";
import { stripeChargesConfigured } from "@/lib/stripe";
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

  const nowMs = serverNowMs();
  const now = new Date(nowMs);
  const ranked = rankVendorMarkets(vendor.markets, now);
  const homeMarket = ranked[0];
  const marketRows = ranked.map((market) => ({
    id: market.id,
    slug: market.slug,
    name: market.name,
    address: market.address,
    city: market.city,
    province: market.province,
    lat: market.lat,
    lng: market.lng,
    stall: market.stall,
    hours: hallDayHours(market.days, market.schedules, market.province, now),
  }));

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
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
      <BackButton href={homeMarket ? `/markets/${homeMarket.slug}` : "/markets"} />
      <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <h1>{vendor.name}</h1>
          <ListingMark src={vendor.logo_url} />
        </div>
        <div className="flex items-center gap-1">
          <SaveButton kind="vendor" slug={vendor.slug} name={vendor.name} size="lg" />
        </div>
      </div>
      <VendorNextLine halls={vendor.markets} nowMs={nowMs} />
      <ListingScore
        className="mt-3 text-base"
        ratingAvg={vendor.rating_avg}
        reviewCount={vendor.review_count}
      />
      <TagList className="mt-4" tags={sortTagsForDisplay(vendor.tags)} />

      {marketRows.length ? (
        <section className="mt-6">
          <h2>Markets</h2>
          <VendorMarketList markets={marketRows} />
        </section>
      ) : null}

      <div className="mt-8 grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="flex flex-col gap-8">
          {vendor.about ? (
            <section>
              <h2>About</h2>
              <p className="mt-2 leading-relaxed text-muted-foreground">{vendor.about}</p>
            </section>
          ) : null}
          {vendor.menus.length ? (
            <section id="menu">
              <h2>Menu</h2>
              <StallMenu
                items={
                  VENDOR_SALES_OPEN && stripeChargesConfigured()
                    ? vendor.menus
                    : vendor.menus.map((item) => ({ ...item, can_buy: false }))
                }
                vendorSlug={vendor.slug}
              />
            </section>
          ) : null}
          <section>
            <h2>Reviews</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Anything written about this vendor on the live list.
            </p>
            <ListingReviewGate
              hasFeed={vendor.feed.length > 0}
              next={`/vendors/${vendor.slug}`}
              canCompose={vendor.markets.length > 0}
              markets={vendor.markets.map(toGeoMarket)}
              stalls={vendor.markets.map((market) => ({
                id: vendor.id,
                name: vendor.name,
                slug: vendor.slug,
                market_id: market.id,
                stall: market.stall,
              }))}
              initialMarketId={vendor.markets[0]?.id}
              initialVendorId={vendor.id}
            />
            {vendor.feed.length ? (
              <ol className={vendor.markets.length ? undefined : "mt-4"}>
                {vendor.feed.map((item) => (
                  <ReviewCard key={item.id} item={item} />
                ))}
              </ol>
            ) : null}
          </section>
        </div>
        <aside className="flex flex-col gap-6">
          <div className="rounded-xl bg-card p-5 ring-1 ring-foreground/10">
            <ListingContact phone={contact.phone} email={contact.email} />
            <ListingWebsite href={vendor.website} />
            <ListingInstagram href={vendor.instagram} />
            <ListingTiktok href={vendor.tiktok} />
            <ListingFacebook href={vendor.facebook} />
          </div>
          <div id="claim" className="scroll-mt-28">
            <ClaimForm targetType="vendor" targetId={vendor.id} />
          </div>
        </aside>
        <div className="lg:col-span-2">
          <ListingAlsoLinks
            heading="Find more like this"
            weekdays={vendor.markets.flatMap((market) =>
              market.days.filter((day) =>
                sessionOnWeekday(market.schedules, day, market.province, now),
              ),
            )}
            tags={vendor.tags}
          />
        </div>
      </div>
    </div>
  );
}
