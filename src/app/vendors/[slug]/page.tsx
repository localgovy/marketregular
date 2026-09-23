import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { AddressLink } from "@/components/address-link";
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
import { getVendorBySlug } from "@/lib/data/catalog";
import { retiredVendorTarget } from "@/lib/data/retired-listings";
import { toGeoMarket } from "@/lib/geo";
import { Hours } from "@/components/hours";
import { NowLabel } from "@/components/now-label";
import { WEEKDAYS } from "@/lib/constants";
import { stallNextDate } from "@/lib/day-plan";
import { sortTagsForDisplay } from "@/lib/find-paths";
import { vendorPageDescription, vendorPageTitle } from "@/lib/listing-copy";
import { vendorHasSubstance } from "@/lib/listing-substance";
import { formatHours, nextOpenSlot, sessionOnWeekday } from "@/lib/schedule";
import { breadcrumbJsonLd, MARKETS_CRUMB, pageMeta, vendorJsonLd } from "@/lib/seo";
import type { MarketSchedule } from "@/types/database";

function hallDayHours(
  days: number[],
  schedules: MarketSchedule[],
  province: string,
  now: Date,
) {
  return days.flatMap((day) => {
    const session = sessionOnWeekday(schedules, day, province, now);
    if (!session) return [];
    const name = WEEKDAYS[day]?.slice(0, 3);
    if (!name) return [];
    return [{ day: name, hours: formatHours(session.opens_at, session.closes_at) }];
  });
}

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const vendor = await getVendorBySlug(slug);
  if (!vendor) return { title: "Vendor" };
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
    index: vendorHasSubstance(vendor),
    follow: true,
  });
}

export default async function VendorPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const vendor = await getVendorBySlug(slug);
  if (!vendor) {
    const retired = await retiredVendorTarget(slug);
    if (retired) permanentRedirect(retired);
    notFound();
  }

  const now = new Date();
  const ranked = [...vendor.markets].sort((a, b) =>
    stallNextDate(a, a.schedules, a.days, now).localeCompare(
      stallNextDate(b, b.schedules, b.days, now),
    ),
  );
  const nextMarket = ranked[0];
  const nextRows = nextMarket
    ? nextMarket.days.length
      ? nextMarket.schedules.filter((row) => nextMarket.days.includes(Number(row.weekday)))
      : nextMarket.schedules
    : [];
  const nextSlot = nextMarket ? nextOpenSlot(nextRows.length ? nextRows : nextMarket.schedules, nextMarket.province, now) : null;
  const nextRow = nextSlot
    ? nextRows.find((row) => Number(row.weekday) === nextSlot.weekday) ??
      nextMarket?.schedules.find((row) => Number(row.weekday) === nextSlot.weekday)
    : null;
  const nextHours = nextRow ? formatHours(nextRow.opens_at, nextRow.closes_at) : "";
  const homeMarket = nextMarket;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <JsonLd data={vendorJsonLd(vendor)} />
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
      {nextMarket && nextSlot ? (
        <p className="type-lede mt-2 max-w-3xl text-pretty text-muted-foreground">
          {nextSlot.waitMinutes === 0 ? (
            <>
              <NowLabel>Open now</NowLabel>
              {" at "}
            </>
          ) : (
            <>
              {WEEKDAYS[nextSlot.weekday]} at{" "}
            </>
          )}
          <Link href={`/markets/${nextMarket.slug}`} className="font-medium text-foreground hover:underline">
            {nextMarket.name}
          </Link>
          {nextHours ? (
            <>
              {", "}
              <Hours value={nextHours} className="text-muted-foreground" />
            </>
          ) : null}
        </p>
      ) : null}
      <ListingScore
        className="mt-3 text-base"
        ratingAvg={vendor.rating_avg}
        reviewCount={vendor.review_count}
      />
      <TagList className="mt-4" tags={sortTagsForDisplay(vendor.tags)} />

      {ranked.length ? (
        <section className="mt-6">
          <h2>Markets</h2>
          <ul className="mt-3 divide-y divide-border border-y border-border">
            {ranked.map((market) => {
              const rows = hallDayHours(market.days, market.schedules, market.province, now);
              return (
                <li key={market.id} className="flex items-start justify-between gap-2 py-2">
                  <div className="min-w-0">
                    <Link href={`/markets/${market.slug}`} className="font-medium hover:underline">
                      {market.name}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      <AddressLink
                        address={market.address}
                        city={market.city}
                        province={market.province}
                        name={market.name}
                        lat={market.lat}
                        lng={market.lng}
                      />
                      {market.stall ? ` · ${market.stall}` : ""}
                    </p>
                    {rows.length ? (
                      <p className="mt-0.5 grid grid-cols-[auto_auto] justify-start gap-x-2 gap-y-0.5">
                        {rows.map((row) => (
                          <span key={`${row.day}-${row.hours}`} className="contents">
                            <span className="text-sm text-muted-foreground">{row.day}</span>
                            <Hours value={row.hours} className="text-muted-foreground" />
                          </span>
                        ))}
                      </p>
                    ) : null}
                  </div>
                  <span className="flex shrink-0 items-center">
                    <SaveButton kind="market" slug={market.slug} name={market.name} />
                  </span>
                </li>
              );
            })}
          </ul>
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
              <StallMenu items={vendor.menus} />
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
            <ListingContact phone={vendor.phone} email={vendor.email} />
            <ListingWebsite href={vendor.website} />
            <ListingInstagram href={vendor.instagram} />
            <ListingTiktok href={vendor.tiktok} />
            <ListingFacebook href={vendor.facebook} />
          </div>
          <ClaimForm targetType="vendor" targetId={vendor.id} />
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
