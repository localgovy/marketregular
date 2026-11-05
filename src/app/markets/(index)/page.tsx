import type { Metadata } from "next";
import { loadMarketsFloorData } from "@/app/preview/_lib/markets-preview-data";
import { BrowseLinks } from "@/components/browse-links";
import { JsonLd } from "@/components/json-ld";
import { MarketsFloor } from "@/components/markets-floor";
import { getDirectoryCensus } from "@/lib/data/catalog";
import { marketsSearchFromQuery, queryList } from "@/lib/find-paths";
import { LAUNCH_CITY, LAUNCH_REGION } from "@/lib/launch";
import { breadcrumbJsonLd, itemListJsonLd, MARKETS_CRUMB, pageMeta } from "@/lib/seo";

/** Cold directory reads can be slow. Past this, kill the function instead of holding it. */
export const maxDuration = 60;

export async function generateMetadata(): Promise<Metadata> {
  const census = await getDirectoryCensus();
  return pageMeta({
    title: `Find ${LAUNCH_CITY} farmers' markets`,
    path: "/markets",
    description: `All ${census.markets} farmers' markets across ${LAUNCH_CITY} and the ${LAUNCH_REGION}, with this week's hours, addresses, maps and the ${census.vendors.toLocaleString("en-CA")} vendors that work them.`,
  });
}

export default async function MarketsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    province?: string;
    city?: string;
    weekday?: string | string[];
    tag?: string | string[];
    area?: string | string[];
    setup?: string;
    openNow?: string;
    lat?: string;
    lng?: string;
    sort?: string;
    day?: string;
  }>;
}) {
  const params = await searchParams;
  const search = marketsSearchFromQuery(params);
  const day = queryList(params.day)[0];
  const data = await loadMarketsFloorData();
  const listItems = data.enrichedMarkets.map((market) => ({
    name: market.name,
    path: `/markets/${market.slug}`,
  }));
  const formKey = [
    search.q,
    (search.weekdays ?? []).join(","),
    (search.tags ?? []).join(","),
    (search.areas ?? []).join(","),
    search.setup,
    search.openNow ? "1" : "",
    search.lat,
    search.lng,
    day,
  ].join("|");

  return (
    <>
      <JsonLd data={breadcrumbJsonLd([MARKETS_CRUMB])} />
      <JsonLd
        data={itemListJsonLd({
          name: `${LAUNCH_CITY} farmers' markets`,
          path: "/markets",
          items: listItems,
        })}
      />
      <MarketsFloor key={formKey} data={data} initial={{ ...search, day }} syncUrl />
      <div className="mx-auto w-full max-w-7xl px-4 pb-10 sm:px-6">
        <BrowseLinks />
      </div>
    </>
  );
}
