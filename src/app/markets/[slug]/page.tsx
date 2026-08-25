import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BackButton } from "@/components/back-button";
import { ClaimForm } from "@/components/claim-form";
import { JsonLd } from "@/components/json-ld";
import { ListingScore } from "@/components/listing-score";
import { SaveButton } from "@/components/save-button";
import { ListingComposer } from "@/components/listing-composer";
import { LiveFeed } from "@/components/live-feed";
import { MARKET_PROFILE_MAP, MarketMapLazy } from "@/components/market-map-lazy";
import { CaretDownMark } from "@/components/marks";
import { MarketVendors } from "@/components/market-vendors";
import { NowLabel } from "@/components/now-label";
import { ScheduleList } from "@/components/schedule-list";
import { ListingPhone, ListingWebsite, ListingInstagram, ListingTiktok } from "@/components/listing-contact";
import { TagList } from "@/components/tag-list";
import { getCurrentProfile, getMarketBySlug } from "@/lib/data/catalog";
import { toGeoMarket } from "@/lib/geo";
import { sortTagsForDisplay } from "@/lib/find-paths";
import { marketPageDescription, marketPageTitle } from "@/lib/listing-copy";
import { nextOpenLabel } from "@/lib/schedule";
import { marketJsonLd, pageMeta } from "@/lib/seo";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const market = await getMarketBySlug(slug);
  if (!market) return { title: "Market" };
  return pageMeta({
    title: marketPageTitle(market.name, market.city),
    description: marketPageDescription({
      name: market.name,
      about: market.about,
      city: market.city,
      province: market.province,
      schedules: market.schedules,
    }),
    path: `/markets/${market.slug}`,
  });
}

export default async function MarketPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [market, profile] = await Promise.all([
    getMarketBySlug(slug),
    getCurrentProfile(),
  ]);
  if (!market) notFound();

  const when = market.schedules.length
    ? nextOpenLabel(market.schedules, market.province)
    : null;
  const avgRated = market.feed.filter((item) => item.rating != null);
  const avg =
    avgRated.length > 0
      ? avgRated.reduce((sum, item) => sum + (item.rating ?? 0), 0) / avgRated.length
      : null;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <JsonLd data={marketJsonLd(market)} />
      <div className="flex items-center gap-1">
        <BackButton href="/markets" />
        <p className="type-kicker text-muted-foreground">{market.address}</p>
      </div>
      <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
        <h1>{market.name}</h1>
        <SaveButton kind="market" slug={market.slug} name={market.name} size="lg" />
      </div>
      {when === "Open now" ? (
        <NowLabel className="mt-2">{when}</NowLabel>
      ) : when ? (
        <p className="mt-2 text-base font-medium text-primary">{when}</p>
      ) : null}
      <ListingScore
        className="mt-3 text-base"
        ratingAvg={market.rating_avg}
        reviewCount={market.review_count}
      />
      <TagList className="mt-4" tags={sortTagsForDisplay(market.tags)} />

      <div className="mt-8 grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="flex flex-col gap-8">
          <MarketMapLazy markets={[market]} load="visible" className={MARKET_PROFILE_MAP} />
          {market.about || market.vendors.length ? (
            <section>
              {market.about ? (
                <>
                  <h2>About</h2>
                  <p className="mt-2 leading-relaxed text-muted-foreground">{market.about}</p>
                </>
              ) : null}
              {market.vendors.length ? (
                <a
                  href="#vendors"
                  className="stall-chip mt-4 inline-flex h-11 items-center gap-2 bg-primary px-5 text-base font-medium text-primary-foreground outline-none hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-foreground"
                >
                  Scroll down to see vendors
                  <CaretDownMark className="size-4" />
                </a>
              ) : null}
            </section>
          ) : null}
        </div>
        <aside className="flex flex-col gap-6">
          <div className="rounded-xl bg-card p-5 ring-1 ring-foreground/10">
            <h3>Hours</h3>
            <ScheduleList schedules={market.schedules} />
            <address className="mt-4 not-italic text-sm leading-6">
              {market.address}
              <br />
              {market.city}, {market.province} {market.postal_code}
            </address>
            <ListingPhone phone={market.phone} />
            <ListingWebsite href={market.website} />
            <ListingInstagram href={market.instagram} />
            <ListingTiktok href={market.tiktok} />
          </div>
          <ClaimForm targetType="market" targetId={market.id} />
        </aside>
        <div className="lg:col-span-2">
          <MarketVendors vendors={market.vendors} />
        </div>
        <section className="lg:col-span-2">
          <h2>Reviews</h2>
          {avg ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Floor posts average {avg.toFixed(1)} / 5 from {avgRated.length} rated
              {market.feed.length
                ? ` · ${market.feed.length} ${market.feed.length === 1 ? "post" : "posts"}`
                : ""}
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              Same posts as the live list. A score is optional. Sign in to write one.
            </p>
          )}
          <div className="mt-4">
            <ListingComposer
              signedIn={Boolean(profile)}
              markets={[toGeoMarket(market)]}
              stalls={market.vendors.map((vendor) => ({
                id: vendor.id,
                name: vendor.name,
                slug: vendor.slug,
                market_id: market.id,
                stall: vendor.stall,
              }))}
              initialMarketId={market.id}
            />
            <LiveFeed initialItems={market.feed} marketId={market.id} />
          </div>
        </section>
      </div>
    </div>
  );
}
