import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { AddressLink } from "@/components/address-link";
import { BackButton } from "@/components/back-button";
import { ClaimForm } from "@/components/claim-form";
import { JsonLd } from "@/components/json-ld";
import { ListingScore } from "@/components/listing-score";
import { SaveButton } from "@/components/save-button";
import { ListingAlsoLinks } from "@/components/listing-also-links";
import { ListingReviewGate } from "@/components/listing-review-gate";
import { LiveFeed } from "@/components/live-feed";
import { MARKET_PROFILE_MAP, MarketMapLazy } from "@/components/market-map-lazy";
import { MarketVendors } from "@/components/market-vendors";
import { LiveOpenState } from "@/components/live-open";
import { MarketSeasons, type SeasonPlace } from "@/components/market-seasons";
import { ScheduleList } from "@/components/schedule-list";
import { ListingContact, ListingWebsite, ListingInstagram, ListingTiktok, ListingFacebook } from "@/components/listing-contact";
import { TagList } from "@/components/tag-list";
import { VerifiedName } from "@/components/verified-stamp";
import { getListingContact, getMarketBySlug } from "@/lib/data/catalog";
import { retiredMarketTarget } from "@/lib/data/retired-listings";
import { listingScore } from "@/lib/listing-score";
import { listingNote, listingQualifier, seasonAliasTarget, seasonPlace, siblingLead, siblingSlugs } from "@/lib/listing-siblings";
import { toGeoMarket } from "@/lib/geo";
import { sortTagsForDisplay, weekdayInToronto } from "@/lib/find-paths";
import { marketPageDescription, marketPageTitle, directionsHref } from "@/lib/listing-copy";
import { publishesVendorRoster } from "@/lib/vendor-roster";
import { serverNowMs } from "@/lib/clock";
import { breadcrumbJsonLd, marketJsonLd, MARKETS_CRUMB, pageMeta } from "@/lib/seo";
import { countLabel } from "@/lib/format";

export const revalidate = 3600;
// A dynamic segment stays uncached until this is set. The hour window is revalidate.
export const dynamic = "force-static";

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
  const alias = seasonAliasTarget(slug);
  if (alias) permanentRedirect(`/markets/${alias}`);
  const market = await getMarketBySlug(slug);
  if (!market) {
    const retired = await retiredMarketTarget(slug);
    if (retired) permanentRedirect(retired);
    notFound();
  }

  const nowMs = serverNowMs();
  const now = new Date(nowMs);
  const contact = await getListingContact("market", market.slug);
  const directions = directionsHref(market.lat, market.lng);
  const avgRated = market.feed.filter((item) => item.rating != null);
  const avg =
    avgRated.length > 0
      ? avgRated.reduce((sum, item) => sum + (item.rating ?? 0), 0) / avgRated.length
      : null;

  const siblingMarkets = (
    await Promise.all(siblingSlugs(market.slug).map((item) => getMarketBySlug(item)))
  ).filter((item) => item != null);
  const seasonSources: SeasonPlace[] = [market, ...siblingMarkets].flatMap((item) => {
    const place = seasonPlace(item.slug);
    if (!place) return [];
    return [
      {
        label: place.label,
        place: place.place,
        name: item.name,
        address: item.address,
        city: item.city,
        province: item.province,
        postalCode: item.postal_code,
        lat: item.lat,
        lng: item.lng,
        schedules: item.schedules,
      },
    ];
  });
  const showSeasons = seasonSources.length > 1;
  const openSchedules = showSeasons
    ? seasonSources.flatMap((place) => place.schedules)
    : market.schedules;
  const otherFloors = siblingMarkets
    .filter((item) => !seasonPlace(item.slug))
    .map((item) => ({ slug: item.slug, name: item.name }));
  const lead = siblingLead(market.slug);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <JsonLd data={marketJsonLd({ ...market, schedules: openSchedules }, now, contact)} />
      <JsonLd
        data={breadcrumbJsonLd([
          MARKETS_CRUMB,
          { name: market.name, path: `/markets/${market.slug}` },
        ])}
      />
      <div className="flex items-center gap-1">
        <BackButton href="/markets" />
        <p className="type-kicker text-muted-foreground">
          {showSeasons ? (
            "Greenwood Park and the East End Food Hub"
          ) : (
            <AddressLink
              address={market.address}
              city={market.city}
              province={market.province}
              name={market.name}
              lat={market.lat}
              lng={market.lng}
            />
          )}
        </p>
      </div>
      <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
        <h1>
          <VerifiedName slug={market.slug} name={market.name} />
        </h1>
        <div className="flex items-center gap-1">
          <SaveButton kind="market" slug={market.slug} name={market.name} size="lg" />
        </div>
      </div>
      {market.schedules.length || listingScore(market.rating_avg, market.review_count) ? (
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
          {market.schedules.length ? (
            <LiveOpenState
              schedules={openSchedules}
              province={market.province}
              nowMs={nowMs}
            />
          ) : null}
          <ListingScore
            className="text-base"
            ratingAvg={market.rating_avg}
            reviewCount={market.review_count}
          />
        </div>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(16rem,20rem)]">
        <div className="rounded-xl bg-card p-5 ring-1 ring-foreground/10">
          <h2>Hours</h2>
          {showSeasons ? (
            <div className="mt-4">
              <MarketSeasons places={seasonSources} now={now} />
            </div>
          ) : (
            <>
              <ScheduleList schedules={market.schedules} />
              <address className="mt-4 not-italic text-sm leading-6">
                <AddressLink
                  className="block"
                  address={market.address}
                  city={market.city}
                  province={market.province}
                  name={market.name}
                  lat={market.lat}
                  lng={market.lng}
                >
                  {market.address}
                  <br />
                  {market.city}, {market.province} {market.postal_code}
                </AddressLink>
              </address>
              {directions ? (
                <a
                  href={directions}
                  rel="noreferrer"
                  className="mt-3 inline-flex text-sm font-medium text-primary hover:underline"
                >
                  Directions
                </a>
              ) : null}
            </>
          )}
        </div>
        {publishesVendorRoster(market.slug) && market.vendors.length ? (
          <div>
            <h2>Vendors</h2>
            <ul className="mt-3 divide-y divide-border border-y border-border">
              {market.vendors.slice(0, 3).map((vendor) => (
                <li key={vendor.id}>
                  <Link
                    href={`/vendors/${vendor.slug}`}
                    className="flex items-baseline justify-between gap-3 py-2 hover:underline"
                  >
                    <span className="min-w-0 font-medium">{vendor.name}</span>
                    {vendor.stall ? (
                      <span className="type-nums shrink-0 text-sm text-muted-foreground">
                        {vendor.stall}
                      </span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
            {market.vendors.length > 3 ? (
              <a
                href="#vendors"
                className="stall-chip mt-3 flex min-h-11 w-full items-center justify-center bg-primary px-4 py-3 text-center text-sm font-medium text-primary-foreground outline-none hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-foreground"
              >
                See all {countLabel(market.vendors.length, "vendor", "vendors")} for this market
              </a>
            ) : null}
          </div>
        ) : null}
      </div>
      {listingNote(market.slug) && !showSeasons ? (
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
      <TagList className="mt-4" tags={sortTagsForDisplay(market.tags)} />

      <div className="mt-8 grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="flex flex-col gap-8">
          <MarketMapLazy
            markets={showSeasons ? [market, ...siblingMarkets] : [market]}
            load="visible"
            className={MARKET_PROFILE_MAP}
          />
          {market.about ? (
            <section>
              <h2>About</h2>
              <p className="mt-2 leading-relaxed text-muted-foreground">{market.about}</p>
            </section>
          ) : null}
        </div>
        <aside className="flex flex-col gap-6">
          <div className="rounded-xl bg-card p-5 ring-1 ring-foreground/10">
            <h3>Find them</h3>
            <ListingContact phone={contact.phone} email={contact.email} heading={false} />
            <ListingWebsite href={market.website} />
            <ListingInstagram href={market.instagram} />
            <ListingTiktok href={market.tiktok} />
            <ListingFacebook href={market.facebook} />
          </div>
          <ClaimForm targetType="market" targetId={market.id} />
        </aside>
        {publishesVendorRoster(market.slug) ? (
          <div className="lg:col-span-2">
            <MarketVendors
              vendors={market.vendors}
              todayWeekday={weekdayInToronto(now)}
            />
          </div>
        ) : null}
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
              Reviews average {avg.toFixed(1)} / 5 from {avgRated.length} rated
              {market.feed.length
                ? ` · ${market.feed.length} ${market.feed.length === 1 ? "post" : "posts"}`
                : ""}
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              Same posts as the live list. A score is optional.
            </p>
          )}
          <div className="mt-4">
            <ListingReviewGate
              hasFeed={market.feed.length > 0}
              next={`/markets/${market.slug}`}
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
            {market.feed.length ? (
              <LiveFeed initialItems={market.feed} marketId={market.id} />
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
