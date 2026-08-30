import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BackButton } from "@/components/back-button";
import { BrowseLinks } from "@/components/browse-links";
import { JsonLd } from "@/components/json-ld";
import { ListingScore } from "@/components/listing-score";
import { SearchForm } from "@/components/search-form";
import { listMarkets, listMenuVendorIds, listStalls, listVendors, searchDirectory } from "@/lib/data/catalog";
import {
  marketsCrumbs,
  placeAreasForMarkets,
  queryList,
  vendorsIndexHref,
  weekdayInToronto,
  type MarketsSearch,
} from "@/lib/find-paths";
import { LAUNCH_CITY, LAUNCH_REGION } from "@/lib/launch";
import { vendorHasSubstance } from "@/lib/listing-substance";
import { breadcrumbJsonLd, itemListJsonLd, MARKETS_CRUMB, pageMeta } from "@/lib/seo";
import { groupVendorHalls } from "@/lib/vendor-halls";

export const revalidate = 3600;

const PER_PAGE = 60;

const VENDORS_CRUMB = { name: `${LAUNCH_CITY} market stalls`, path: "/vendors" };

type VendorsSearchParams = {
  page?: string;
  q?: string;
  weekday?: string | string[];
  tag?: string | string[];
  area?: string | string[];
};

function pageNumber(value: string | undefined) {
  const parsed = Number(value ?? 1);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : 1;
}

function browseFrom(params: VendorsSearchParams) {
  const q = params.q?.trim() ?? "";
  const weekdays = queryList(params.weekday)
    .map(Number)
    .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6);
  const tags = queryList(params.tag);
  const areas = queryList(params.area);
  const search: MarketsSearch = { q: q || undefined, weekdays, tags, areas };
  const on = Boolean(q) || weekdays.length > 0 || tags.length > 0 || areas.length > 0;
  return { q, weekdays, tags, areas, search, on };
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<VendorsSearchParams>;
}): Promise<Metadata> {
  const params = await searchParams;
  const page = pageNumber(params.page);
  const { on: browsing } = browseFrom(params);
  const [vendors, menuIds] = await Promise.all([listVendors(), listMenuVendorIds()]);
  const listed = vendors.filter((vendor) =>
    vendorHasSubstance({ ...vendor, hasMenu: menuIds.has(vendor.id) }),
  );
  const pages = Math.max(1, Math.ceil(listed.length / PER_PAGE));

  return pageMeta({
    title:
      !browsing && page > 1
        ? `${LAUNCH_CITY} farmers' market stalls, page ${page}`
        : `${LAUNCH_CITY} farmers' market vendors and stalls`,
    description: `Every stall in the ${LAUNCH_REGION} directory: ${listed.length.toLocaleString("en-CA")} growers, bakers, butchers and makers, and which markets each one works.`,
    // Filter URLs consolidate on `/vendors`. Page 2+ of the unfiltered index stays crawlable.
    path: browsing || page <= 1 ? "/vendors" : `/vendors?page=${Math.min(page, pages)}`,
  });
}

export default async function VendorsIndexPage({
  searchParams,
}: {
  searchParams: Promise<VendorsSearchParams>;
}) {
  const params = await searchParams;
  const page = pageNumber(params.page);
  const { q, weekdays, tags, areas, search, on: browsing } = browseFrom(params);

  const [markets, stalls, menuIds, pool] = await Promise.all([
    listMarkets(),
    listStalls(),
    browsing ? Promise.resolve(new Set<string>()) : listMenuVendorIds(),
    browsing
      ? searchDirectory({
          q: q || undefined,
          weekdays: weekdays.length ? weekdays : undefined,
          tags: tags.length ? tags : undefined,
          areas: areas.length ? areas : undefined,
          sort: "name",
        }).then((result) => result.vendors)
      : listVendors(),
  ]);

  const listed = (
    browsing
      ? pool
      : pool.filter((vendor) =>
          vendorHasSubstance({ ...vendor, hasMenu: menuIds.has(vendor.id) }),
        )
  ).sort((a, b) => a.name.localeCompare(b.name));
  const pages = Math.max(1, Math.ceil(listed.length / PER_PAGE));
  if (page > pages) notFound();

  const halls = groupVendorHalls(stalls, markets);
  const slice = listed.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const places = placeAreasForMarkets(markets);
  const crumbs = marketsCrumbs({ weekdays, areas, tags });
  const status = [
    LAUNCH_CITY,
    ...crumbs,
    `${listed.length.toLocaleString("en-CA")} ${listed.length === 1 ? "stall" : "stalls"}`,
  ].join(" · ");
  const todayWeekday = weekdayInToronto();

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10">
      <JsonLd data={breadcrumbJsonLd([MARKETS_CRUMB, VENDORS_CRUMB])} />
      {browsing ? null : (
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
      )}
      <BackButton href="/markets" />
      <h1>{LAUNCH_CITY} farmers&apos; market vendors</h1>
      {browsing ? (
        <p className="type-kicker mt-2 mb-4 text-muted-foreground">{status}</p>
      ) : (
        <p className="type-lede mt-2 max-w-2xl text-muted-foreground">
          {listed.length.toLocaleString("en-CA")} stalls across the {LAUNCH_REGION} — growers,
          bakers, butchers, cheesemongers and makers. Open one to see its markets, days and menu.
        </p>
      )}

      <div className={browsing ? undefined : "mt-6"}>
        <SearchForm
          variant="mini"
          places={places}
          todayWeekday={todayWeekday}
          defaults={{
            q: q || undefined,
            weekdays,
            tags,
            areas,
          }}
        />
      </div>

      {slice.length ? (
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
      ) : (
        <p className="mt-8 text-base text-muted-foreground">No stalls match those filters.</p>
      )}

      {pages > 1 ? (
        <nav
          aria-label="Vendor pages"
          className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-4"
        >
          {page > 1 ? (
            <Link
              href={vendorsIndexHref(search, page - 1)}
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
            <Link
              href={vendorsIndexHref(search, page + 1)}
              className="text-base font-medium hover:underline"
            >
              Next
            </Link>
          ) : null}
        </nav>
      ) : null}

      <BrowseLinks className="mt-10" />
    </div>
  );
}
