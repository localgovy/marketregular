import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClaimForm } from "@/components/claim-form";
import { SaveButton } from "@/components/save-button";
import { ReviewCard } from "@/components/review-card";
import { StallMenu } from "@/components/stall-menu";
import { TagList } from "@/components/tag-list";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentProfile, getVendorBySlug } from "@/lib/data/catalog";
import { formatPhone } from "@/lib/format";
import { WEEKDAYS } from "@/lib/constants";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const vendor = await getVendorBySlug(slug);
  if (!vendor) return { title: "Vendor" };
  return {
    title: vendor.name,
    description: vendor.about ?? `${vendor.name} at Toronto farmers' markets`,
  };
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
      <p className="type-kicker text-muted-foreground">Stall</p>
      <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
        <h1>{vendor.name}</h1>
        <SaveButton kind="vendor" slug={vendor.slug} name={vendor.name} size="lg" />
      </div>
      <TagList className="mt-4" tags={vendor.tags} />

      <div className="mt-8 grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="flex flex-col gap-8">
          <section>
            <h2>About</h2>
            <p className="mt-2 leading-relaxed text-muted-foreground">{vendor.about}</p>
          </section>
          <section>
            <h2>Menu</h2>
            <StallMenu items={vendor.menus} />
          </section>
          <section>
            <h2>Reviews</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Anything written about this stall, including from the live tape.
            </p>
            {vendor.feed.length ? (
              <ol className="mt-4 flex flex-col gap-2">
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
            <ul className="mt-3 grid gap-3">
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
            {vendor.phone ? (
              <p className="mt-4 text-sm">
                <a href={`tel:${vendor.phone}`}>{formatPhone(vendor.phone)}</a>
              </p>
            ) : null}
            {vendor.website ? (
              <a
                className={buttonVariants({ variant: "outline", className: "mt-4 w-full" })}
                href={vendor.website}
                target="_blank"
                rel="noreferrer"
              >
                Website
              </a>
            ) : null}
          </div>
          <div className="rounded-xl bg-secondary/50 p-5">
            <p className="font-medium">Is this your stall?</p>
            {profile ? (
              <ClaimForm targetType="vendor" targetId={vendor.id} signedIn />
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
