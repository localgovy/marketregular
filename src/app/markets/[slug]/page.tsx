import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BackButton } from "@/components/back-button";
import { ClaimForm } from "@/components/claim-form";
import { JsonLd } from "@/components/json-ld";
import { SaveButton } from "@/components/save-button";
import { LiveFeed } from "@/components/live-feed";
import { MARKET_PROFILE_MAP, MarketMapLazy } from "@/components/market-map-lazy";
import { MarketVendors } from "@/components/market-vendors";
import { ScheduleList } from "@/components/schedule-list";
import { TagList } from "@/components/tag-list";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentProfile, getMarketBySlug } from "@/lib/data/catalog";
import { formatPhone } from "@/lib/format";
import { marketJsonLd, pageMeta } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const market = await getMarketBySlug(slug);
  if (!market) return { title: "Market" };
  const description =
    market.about ?? `${market.name} in ${market.city}, ${market.province}`;
  return pageMeta({
    title: market.name,
    description,
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
      <TagList className="mt-4" tags={market.tags} />

      <div className="mt-8 grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="flex flex-col gap-8">
          <MarketMapLazy markets={[market]} className={MARKET_PROFILE_MAP} />
          <section>
            <h2>About</h2>
            <p className="mt-2 leading-relaxed text-muted-foreground">{market.about}</p>
          </section>
          <MarketVendors vendors={market.vendors} />
          <section>
            <h2>Reviews</h2>
            {avg ? (
              <p className="mt-1 text-sm text-muted-foreground">
                {avg.toFixed(1)} / 5
                {avgRated.length ? ` from ${avgRated.length} rated` : ""}
                {market.feed.length
                  ? ` · ${market.feed.length} ${market.feed.length === 1 ? "review" : "reviews"}`
                  : ""}
              </p>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">
                Same reviews as the live list. A score is optional.
              </p>
            )}
            <div className="mt-4">
              <LiveFeed initialItems={market.feed} marketId={market.id} />
            </div>
          </section>
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
            {market.phone ? (
              <p className="mt-2 text-sm">
                <a className="hover:underline" href={`tel:${market.phone}`}>
                  {formatPhone(market.phone)}
                </a>
              </p>
            ) : null}
            {market.website ? (
              <a
                className={buttonVariants({ variant: "outline", className: "mt-4 w-full" })}
                href={market.website}
                target="_blank"
                rel="noreferrer"
              >
                Website
              </a>
            ) : null}
          </div>
          {profile ? (
            <div className="rounded-xl bg-secondary/50 p-5">
              <p className="font-medium">Do you run this market?</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Claim it to update hours, vendors, and contact details.
              </p>
              <ClaimForm targetType="market" targetId={market.id} signedIn />
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
