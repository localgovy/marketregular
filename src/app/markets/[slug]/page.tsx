import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckInIsland } from "@/components/check-in-island";
import { ClaimForm } from "@/components/claim-form";
import { SaveButton } from "@/components/save-button";
import { LiveFeed } from "@/components/live-feed";
import { MarketMapLazy } from "@/components/market-map-lazy";
import { ScheduleList } from "@/components/schedule-list";
import { TagList } from "@/components/tag-list";
import { VendorCard } from "@/components/vendor-card";
import { buttonVariants } from "@/components/ui/button";
import { WEEKDAYS } from "@/lib/constants";
import { getCurrentProfile, getMarketBySlug } from "@/lib/data/catalog";
import { formatPhone } from "@/lib/format";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const market = await getMarketBySlug(slug);
  if (!market) return { title: "Market" };
  return {
    title: market.name,
    description: market.about ?? `${market.name} in ${market.city}, ${market.province}`,
  };
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

  const avg =
    market.reviews.length > 0
      ? market.reviews.reduce((sum, r) => sum + r.rating, 0) / market.reviews.length
      : null;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <p className="text-sm tracking-wide text-muted-foreground uppercase">
        {market.address}
      </p>
      <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
        <h1 className="font-heading text-4xl sm:text-5xl">{market.name}</h1>
        <SaveButton kind="market" slug={market.slug} name={market.name} size="md" />
      </div>
      <TagList className="mt-4" tags={market.tags} />

      <div className="mt-8 grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="flex flex-col gap-8">
          <MarketMapLazy markets={[market]} className="h-72 w-full overflow-hidden rounded-xl ring-1 ring-foreground/10" />
          <section>
            <h2 className="font-heading text-2xl">About</h2>
            <p className="mt-2 leading-relaxed text-muted-foreground">{market.about}</p>
          </section>
          <section>
            <h2 className="font-heading text-2xl">Vendors</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {market.vendors.map((vendor) => (
                <div key={vendor.id}>
                  <VendorCard vendor={vendor} />
                  {vendor.stall ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Stall {vendor.stall}
                      {vendor.days.length
                        ? ` · ${vendor.days.map((d) => WEEKDAYS[d]?.slice(0, 3)).join(", ")}`
                        : ""}
                    </p>
                  ) : null}
                </div>
              ))}
              {!market.vendors.length ? (
                <p className="text-sm text-muted-foreground">Vendor list is being filled in.</p>
              ) : null}
            </div>
          </section>
          <section>
            <h2 className="font-heading text-2xl">Reviews</h2>
            {avg ? (
              <p className="mt-1 text-sm text-muted-foreground">
                {avg.toFixed(1)} / 5 · {market.reviews.length} on-site reviews
              </p>
            ) : null}
            <ul className="mt-4 grid gap-3">
              {market.reviews.map((review) => (
                <li key={review.id} className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
                  <p className="text-sm font-medium">
                    {review.author_name} · {review.rating}/5
                  </p>
                  <p className="mt-1 text-sm leading-relaxed">{review.body}</p>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h2 className="mb-3 font-heading text-2xl">From the floor</h2>
            <LiveFeed initialPosts={market.posts} />
          </section>
        </div>
        <aside className="flex flex-col gap-6">
          <div className="rounded-xl bg-card p-5 ring-1 ring-foreground/10">
            <h2 className="font-heading text-xl">Hours</h2>
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
          <CheckInIsland markets={[market]} signedIn={Boolean(profile)} />
          <div className="rounded-xl bg-secondary/50 p-5">
            <p className="font-medium">Do you run this market?</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Claim it to update hours, vendors, and contact details.
            </p>
            {profile ? (
              <ClaimForm targetType="market" targetId={market.id} signedIn />
            ) : (
              <Link href="/login" className={buttonVariants({ variant: "outline", className: "mt-3" })}>
                Sign in to claim
              </Link>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
