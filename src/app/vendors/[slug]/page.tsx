import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BackButton } from "@/components/back-button";
import { ClaimForm } from "@/components/claim-form";
import { JsonLd } from "@/components/json-ld";
import { ListingScore } from "@/components/listing-score";
import { SaveButton } from "@/components/save-button";
import { ReviewCard } from "@/components/review-card";
import { StallMenu } from "@/components/stall-menu";
import { ListingPhone, ListingWebsite, ListingInstagram, ListingTiktok } from "@/components/listing-contact";
import { TagList } from "@/components/tag-list";
import { getCurrentProfile, getVendorBySlug } from "@/lib/data/catalog";
import { WEEKDAYS } from "@/lib/constants";
import { sortTagsForDisplay } from "@/lib/find-paths";
import { vendorPageDescription, vendorPageTitle } from "@/lib/listing-copy";
import { pageMeta, vendorJsonLd } from "@/lib/seo";

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
    }),
    path: `/vendors/${vendor.slug}`,
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

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <JsonLd data={vendorJsonLd(vendor)} />
      <BackButton href="/markets" />
      <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
        <h1>{vendor.name}</h1>
        <SaveButton kind="vendor" slug={vendor.slug} name={vendor.name} size="lg" />
      </div>
      {vendor.markets.length ? (
        <p className="type-lede mt-2 text-muted-foreground">
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
          {vendor.feed.length ? (
            <section>
              <h2>Reviews</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Anything written about this stall on the live list. The public score above is separate.
              </p>
              <ol className="mt-4">
                {vendor.feed.map((item) => (
                  <ReviewCard key={item.id} item={item} />
                ))}
              </ol>
            </section>
          ) : null}
        </div>
        <aside className="flex flex-col gap-6">
          <div className="rounded-xl bg-card p-5 ring-1 ring-foreground/10">
            <h3>Find them</h3>
            <ListingPhone phone={vendor.phone} />
            <ListingWebsite href={vendor.website} />
            <ListingInstagram href={vendor.instagram} />
            <ListingTiktok href={vendor.tiktok} />
            <ul
              className={
                vendor.phone || vendor.website || vendor.instagram || vendor.tiktok
                  ? "mt-4 grid gap-3 border-t border-border pt-4"
                  : "mt-3 grid gap-3"
              }
            >
              {vendor.markets.map((market) => (
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
                  <SaveButton kind="market" slug={market.slug} name={market.name} />
                </li>
              ))}
            </ul>
          </div>
          {profile ? (
            <div className="rounded-xl bg-secondary/50 p-5">
              <p className="font-medium">Is this your stall?</p>
              <ClaimForm targetType="vendor" targetId={vendor.id} signedIn />
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
