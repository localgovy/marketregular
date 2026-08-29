import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BackButton } from "@/components/back-button";
import { BrowseLinks } from "@/components/browse-links";
import { JsonLd } from "@/components/json-ld";
import { ListingScore } from "@/components/listing-score";
import { listMarkets, listStalls, listVendors } from "@/lib/data/catalog";
import { CATEGORIES } from "@/lib/landing";
import { LAUNCH_CITY, LAUNCH_REGION } from "@/lib/launch";
import { vendorHasSubstance } from "@/lib/listing-substance";
import { breadcrumbJsonLd, itemListJsonLd, MARKETS_CRUMB, pageMeta } from "@/lib/seo";
import { tagLabel } from "@/lib/tag-label";
import { groupVendorHalls } from "@/lib/vendor-halls";

export const revalidate = 3600;

const PER_PAGE = 60;

const VENDORS_CRUMB = { name: `${LAUNCH_CITY} market stalls`, path: "/vendors" };

function pageNumber(value: string | undefined) {
  const parsed = Number(value ?? 1);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : 1;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}): Promise<Metadata> {
  const { page: raw } = await searchParams;
  const page = pageNumber(raw);
  const vendors = await listVendors();
  const listed = vendors.filter(vendorHasSubstance);
  const pages = Math.max(1, Math.ceil(listed.length / PER_PAGE));

  return pageMeta({
    title:
      page > 1
        ? `${LAUNCH_CITY} farmers' market stalls, page ${page}`
        : `${LAUNCH_CITY} farmers' market vendors and stalls`,
    description: `Every stall in the ${LAUNCH_REGION} directory: ${listed.length.toLocaleString("en-CA")} growers, bakers, butchers and makers, and which markets each one works.`,
    // Page 2+ points at itself so deep pages stay crawlable without competing with page 1.
    path: page > 1 ? `/vendors?page=${Math.min(page, pages)}` : "/vendors",
  });
}

export default async function VendorsIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: raw } = await searchParams;
  const page = pageNumber(raw);

  const [vendors, markets, stalls] = await Promise.all([
    listVendors(),
    listMarkets(),
    listStalls(),
  ]);

  // A stall with nothing but a name belongs on its market's roster, not in a directory.
  const listed = vendors
    .filter(vendorHasSubstance)
    .sort((a, b) => a.name.localeCompare(b.name));
  const pages = Math.max(1, Math.ceil(listed.length / PER_PAGE));
  if (page > pages) notFound();

  const halls = groupVendorHalls(stalls, markets);
  const slice = listed.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10">
      <JsonLd data={breadcrumbJsonLd([MARKETS_CRUMB, VENDORS_CRUMB])} />
      <JsonLd
        data={itemListJsonLd({
          name: `${LAUNCH_CITY} farmers' market stalls`,
          path: page > 1 ? `/vendors?page=${page}` : "/vendors",
          items: slice.map((vendor) => ({
            name: vendor.name,
            path: `/vendors/${vendor.slug}`,
          })),
        })}
      />
      <BackButton href="/markets" />
      <h1>{LAUNCH_CITY} farmers&apos; market vendors</h1>
      <p className="type-lede mt-2 max-w-2xl text-muted-foreground">
        {listed.length.toLocaleString("en-CA")} stalls across the {LAUNCH_REGION} — growers,
        bakers, butchers, cheesemongers and makers. Open one to see its markets, days and menu.
      </p>

      <div className="mt-6 flex flex-wrap gap-1.5">
        {CATEGORIES.filter((category) => category.scope === "both").map((category) => (
          <Link
            key={category.tag}
            href={`/markets/tag/${category.tag}`}
            className="stall-chip-sm inline-flex h-8 items-center bg-secondary px-2.5 text-sm font-medium text-foreground hover:bg-foreground/10"
          >
            {tagLabel(category.tag)}
          </Link>
        ))}
      </div>

      <ul className="mt-8 grid gap-3 sm:grid-cols-2">
        {slice.map((vendor) => {
          const at = halls.get(vendor.id) ?? [];
          return (
            <li key={vendor.id} className="rounded-md bg-card p-3 ring-1 ring-border">
              <Link
                href={`/vendors/${vendor.slug}`}
                className="text-base font-medium hover:underline"
              >
                {vendor.name}
              </Link>
              <ListingScore
                ratingAvg={vendor.rating_avg}
                reviewCount={vendor.review_count}
                compact
                className="ml-2 align-middle"
              />
              {at.length ? (
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {at[0]?.name}
                  {at.length > 1 ? ` and ${at.length - 1} more` : ""}
                </p>
              ) : null}
              {vendor.about ? (
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{vendor.about}</p>
              ) : null}
            </li>
          );
        })}
      </ul>

      {pages > 1 ? (
        <nav
          aria-label="Vendor pages"
          className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-4"
        >
          {page > 1 ? (
            <Link
              href={page === 2 ? "/vendors" : `/vendors?page=${page - 1}`}
              className="text-base font-medium hover:underline"
            >
              Previous
            </Link>
          ) : null}
          <p className="text-sm text-muted-foreground">
            Page <span className="type-nums text-foreground">{page}</span> of{" "}
            <span className="type-nums text-foreground">{pages}</span>
          </p>
          {page < pages ? (
            <Link href={`/vendors?page=${page + 1}`} className="text-base font-medium hover:underline">
              Next
            </Link>
          ) : null}
        </nav>
      ) : null}

      <BrowseLinks className="mt-10" />
    </div>
  );
}
