import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { BackButton } from "@/components/back-button";
import { ClaimForm } from "@/components/claim-form";
import { JsonLd } from "@/components/json-ld";
import { ListingScore } from "@/components/listing-score";
import { SaveButton } from "@/components/save-button";
import { ListingAlsoLinks } from "@/components/listing-also-links";
import { ListingComposer } from "@/components/listing-composer";
import { LiveFeed } from "@/components/live-feed";
import { MARKET_PROFILE_MAP, MarketMapLazy } from "@/components/market-map-lazy";
import { CaretDownMark } from "@/components/marks";
import { MarketVendors } from "@/components/market-vendors";
import { NowLabel } from "@/components/now-label";
import { ScheduleList } from "@/components/schedule-list";
import { ListingPhone, ListingWebsite, ListingInstagram, ListingTiktok, ListingFacebook } from "@/components/listing-contact";
import { TagList } from "@/components/tag-list";
import { getCurrentProfile, getMarketBySlug } from "@/lib/data/catalog";
import { retiredMarketTarget } from "@/lib/data/retired-listings";
import { listingNote, listingQualifier, siblingLead, siblingSlugs } from "@/lib/listing-siblings";
import { toGeoMarket } from "@/lib/geo";
import { sortTagsForDisplay, weekdayInToronto } from "@/lib/find-paths";
import { marketPageDescription, marketPageTitle, marketPlaceLine } from "@/lib/listing-copy";
import { nextOpenLabel } from "@/lib/schedule";
import { breadcrumbJsonLd, marketJsonLd, MARKETS_CRUMB, pageMeta } from "@/lib/seo";

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
    title: marketPageTitle(market.name, market.city, listingQualifier(market.slug)),
    description: marketPageDescription({
      name: market.name,
      about: market.about,
      city: market.city,
      province: market.province,
      schedules: market.schedules,
      address: market.address,
      tags: market.tags,
      stallCount: market.vendors.length,
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
  if (!market) {
    const retired = await retiredMarketTarget(slug);
    if (retired) permanentRedirect(retired);
    notFound();
  }

  const now = new Date();
  const when = market.schedules.length
    ? nextOpenLabel(market.schedules, market.province, now)
    : null;
  const avgRated = market.feed.filter((item) => item.rating != null);
  const avg =
    avgRated.length > 0
      ? avgRated.reduce((sum, item) => sum + (item.rating ?? 0), 0) / avgRated.length
      : null;

  const siblings = await Promise.all(
    siblingSlugs(market.slug).map(async (slug) => {
      const other = await getMarketBySlug(slug);
      return other ? { slug, name: other.name } : null;
    }),
  );
  const otherFloors = siblings.filter(
    (entry): entry is { slug: string; name: string } => entry !== null,
  );
  const lead = siblingLead(market.slug);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <JsonLd data={marketJsonLd(market, now)} />
      <JsonLd
        data={breadcrumbJsonLd([
          MARKETS_CRUMB,
          { name: market.name, path: `/markets/${market.slug}` },
        ])}
      />
      <div className="flex items-center gap-1">
        <BackButton href="/markets" />
        <p className="type-kicker text-muted-foreground">
          {marketPlaceLine(market.address, market.city)}
        </p>
      </div>
      <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
        <h1>{market.name}</h1>
        <div className="flex items-center gap-1">
          <SaveButton kind="market" slug={market.slug} name={market.name} size="lg" />
        </div>
      </div>
      {when === "Open now" ? (
        <NowLabel className="mt-2">{when}</NowLabel>
      ) : when ? (
        <p className="mt-2 text-base font-medium text-primary">{when}</p>
      ) : null}
      {listingNote(market.slug) ? (
        <p className="mt-2 max-w-2xl text-base text-muted-foreground">
          {listingNote(market.slug)}
          {lead && otherFloors.length ? (
            <>
              {` ${lead} `}
              {otherFloors.map((other) => (
                <Link
                  key={other.slug}
                  href={`/markets/${other.slug}`}
                  className="font-medium text-foreground hover:underline"
                >
                  {other.name}
                </Link>
              ))}
              .
            </>
          ) : null}
        </p>
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
            <ListingFacebook href={market.facebook} />
          </div>
          <ClaimForm targetType="market" targetId={market.id} />
        </aside>
        <div className="lg:col-span-2">
          <MarketVendors
            vendors={market.vendors}
            todayWeekday={weekdayInToronto(now)}
          />
        </div>
        <div className="lg:col-span-2">
          <ListingAlsoLinks
            heading="Other markets like this one"
            weekdays={market.schedules.map((row) => Number(row.weekday))}
            tags={market.tags}
          />
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
              Same posts as the live list. A score is optional.
              {profile ? "" : " Sign in to write one."}
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
