import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BackButton } from "@/components/back-button";
import { ClaimForm } from "@/components/claim-form";
import { DayPlanPlus, DayPlanPunch } from "@/components/day-plan-plus";
import { JsonLd } from "@/components/json-ld";
import { ListingAlsoLinks } from "@/components/listing-also-links";
import { ListingScore } from "@/components/listing-score";
import { ListingComposer } from "@/components/listing-composer";
import { SaveButton } from "@/components/save-button";
import { ReviewCard } from "@/components/review-card";
import { StallMenu } from "@/components/stall-menu";
import { ListingPhone, ListingWebsite, ListingInstagram, ListingTiktok, ListingFacebook } from "@/components/listing-contact";
import { TagList } from "@/components/tag-list";
import { getCurrentProfile, getVendorBySlug } from "@/lib/data/catalog";
import { toGeoMarket } from "@/lib/geo";
import { WEEKDAYS } from "@/lib/constants";
import { hallFromStall } from "@/lib/day-plan";
import { sortTagsForDisplay } from "@/lib/find-paths";
import { vendorPageDescription, vendorPageTitle } from "@/lib/listing-copy";
import { vendorHasSubstance } from "@/lib/listing-substance";
import { breadcrumbJsonLd, MARKETS_CRUMB, pageMeta, vendorJsonLd } from "@/lib/seo";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const vendor = await getVendorBySlug(slug);
  if (!vendor) return { title: "Vendor" };
  const marketNames = vendor.markets.map((market) => market.name);
  return pageMeta({
    title: vendorPageTitle(vendor.name, marketNames),
    description: vendorPageDescription({
      name: vendor.name,
      about: vendor.about,
      marketNames,
      days: vendor.markets.flatMap((market) => market.days),
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
  const [vendor, profile] = await Promise.all([
    getVendorBySlug(slug),
    getCurrentProfile(),
  ]);
  if (!vendor) notFound();

  const homeMarket = [...vendor.markets].sort((a, b) =>
    hallFromStall(a, a.schedules, a.days).date.localeCompare(
      hallFromStall(b, b.schedules, b.days).date,
    ),
  )[0];
  const punchHall = homeMarket
    ? hallFromStall(homeMarket, homeMarket.schedules, homeMarket.days)
    : null;

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
      <BackButton href="/markets" />
      <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
        <h1>{vendor.name}</h1>
        <div className="flex items-center gap-1">
          {punchHall ? (
            <DayPlanPunch
              hall={punchHall}
              vendorSlug={vendor.slug}
              vendorName={vendor.name}
              className="size-14"
            />
          ) : null}
          <SaveButton kind="vendor" slug={vendor.slug} name={vendor.name} size="lg" />
        </div>
      </div>
      {vendor.markets.length ? (
        <p className="type-lede mt-2 max-w-3xl text-pretty text-muted-foreground">
          {vendor.markets.map((market, index) => (
            <span key={market.id}>
              {index === 0 ? "At " : index === vendor.markets.length - 1 ? " and " : ", "}
              <Link href={`/markets/${market.slug}`} className="font-medium text-foreground hover:underline">
                {market.name}
              </Link>
              {market.days.length
                ? ` (${market.days.map((day) => WEEKDAYS[day]?.slice(0, 3)).join(", ")})`
                : ""}
            </span>
          ))}
          .
        </p>
      ) : null}
      <ListingScore
        className="mt-3 text-base"
        ratingAvg={vendor.rating_avg}
        reviewCount={vendor.review_count}
      />
      <TagList className="mt-4" tags={sortTagsForDisplay(vendor.tags)} />

      <div className="mt-8 grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="flex flex-col gap-8">
          {vendor.about ? (
            <section>
              <h2>About</h2>
              <p className="mt-2 leading-relaxed text-muted-foreground">{vendor.about}</p>
            </section>
          ) : null}
          {vendor.menus.length ? (
            <section>
              <h2>Menu</h2>
              <StallMenu items={vendor.menus} />
            </section>
          ) : null}
          <section>
            <h2>Reviews</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Anything written about this stall on the live list.
              {profile ? "" : " Sign in to add one."}
            </p>
            {vendor.markets.length ? (
              <ListingComposer
                signedIn={Boolean(profile)}
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
            ) : null}
            {vendor.feed.length ? (
              <ol className={vendor.markets.length ? undefined : "mt-4"}>
                {vendor.feed.map((item) => (
                  <ReviewCard key={item.id} item={item} />
                ))}
              </ol>
            ) : (
              <p className="mt-4 text-base text-muted-foreground">No reviews yet.</p>
            )}
          </section>
        </div>
        <aside className="flex flex-col gap-6">
          <div className="rounded-xl bg-card p-5 ring-1 ring-foreground/10">
            <h3>Find them</h3>
            <ListingPhone phone={vendor.phone} />
            <ListingWebsite href={vendor.website} />
            <ListingInstagram href={vendor.instagram} />
            <ListingTiktok href={vendor.tiktok} />
            <ListingFacebook href={vendor.facebook} />
            <ul
              className={
                vendor.phone || vendor.website || vendor.instagram || vendor.tiktok || vendor.facebook
                  ? "mt-4 grid gap-3 border-t border-border pt-4"
                  : "mt-3 grid gap-3"
              }
            >
              {vendor.markets.map((market) => {
                const hall = hallFromStall(market, market.schedules, market.days);
                return (
                <li key={market.id} className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link href={`/markets/${market.slug}`} className="font-medium hover:underline">
                      {market.name}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {market.address}
                      {market.stall ? ` · ${market.stall}` : ""}
                      {market.days.length
                        ? ` · ${market.days.map((d) => WEEKDAYS[d]?.slice(0, 3)).join(", ")}`
                        : ""}
                    </p>
                  </div>
                  <span className="flex shrink-0 items-center">
                    <DayPlanPlus hall={hall} />
                    <SaveButton kind="market" slug={market.slug} name={market.name} />
                  </span>
                </li>
                );
              })}
            </ul>
          </div>
          <ClaimForm targetType="vendor" targetId={vendor.id} />
        </aside>
        <div className="lg:col-span-2">
          <ListingAlsoLinks
            heading="Find more like this"
            weekdays={vendor.markets.flatMap((market) => market.days)}
            tags={vendor.tags}
          />
        </div>
      </div>
    </div>
  );
}
