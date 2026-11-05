import type { Metadata } from "next";
import { loadMarketsFloorView } from "@/lib/markets-floor-data";
import { BrowseLinks } from "@/components/browse-links";
import { JsonLd } from "@/components/json-ld";
import { MarketsFloor } from "@/components/markets-floor";
import { getDirectoryCensus } from "@/lib/data/catalog";
import { DIRECTORY_REVALIDATE_SECONDS } from "@/lib/directory-cache";
import { LAUNCH_CITY, LAUNCH_REGION } from "@/lib/launch";
import { breadcrumbJsonLd, itemListJsonLd, MARKETS_CRUMB, pageMeta } from "@/lib/seo";

/** Cold directory reads can be slow. Past this, kill the function instead of holding it. */
export const maxDuration = 60;

/** One cached directory. Search and filters stay in the browser, so a query does not start another render. */
export const revalidate = DIRECTORY_REVALIDATE_SECONDS;

export async function generateMetadata(): Promise<Metadata> {
  const census = await getDirectoryCensus();
  return pageMeta({
    title: `Find ${LAUNCH_CITY} farmers' markets`,
    path: "/markets",
    description: `All ${census.markets} farmers' markets across ${LAUNCH_CITY} and the ${LAUNCH_REGION}, with this week's hours, addresses, maps and the ${census.vendors.toLocaleString("en-CA")} vendors that work them.`,
  });
}

const SEARCH_HIDE = `if(location.pathname==="/markets"&&location.search.length>1)document.documentElement.setAttribute("data-mr-search","")`;

export default async function MarketsPage() {
  const data = await loadMarketsFloorView();
  const listItems = data.enrichedMarkets.map((market) => ({
    name: market.name,
    path: `/markets/${market.slug}`,
  }));

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: SEARCH_HIDE }} />
      <JsonLd data={breadcrumbJsonLd([MARKETS_CRUMB])} />
      <JsonLd
        data={itemListJsonLd({
          name: `${LAUNCH_CITY} farmers' markets`,
          path: "/markets",
          items: listItems,
        })}
      />
      <MarketsFloor data={data} syncUrl />
      <div className="mx-auto w-full max-w-7xl px-4 pb-10 sm:px-6">
        <BrowseLinks />
      </div>
    </>
  );
}
