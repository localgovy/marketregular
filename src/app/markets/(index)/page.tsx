import type { Metadata } from "next";
import { loadMarketsFloorView } from "@/lib/markets-floor-data";
import { BrowseLinks } from "@/components/browse-links";
import { JsonLd } from "@/components/json-ld";
import { MarketsFloor } from "@/components/markets-floor";
import { getDirectoryCensus } from "@/lib/data/catalog";
import { copyText, siteCopy } from "@/content/site-copy";
import { breadcrumbJsonLd, itemListJsonLd, MARKETS_CRUMB, pageMeta } from "@/lib/seo";

/** Cold directory reads can be slow. Past this, kill the function instead of holding it. */
export const maxDuration = 60;

/**
 * One cached directory. Search, filters, and open-now stay in the browser, so a query does not start another render.
 * This has to be a number literal equal to DIRECTORY_REVALIDATE_SECONDS. Next.js does not read an imported constant.
 */
export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const census = await getDirectoryCensus();
  return pageMeta({
    title: copyText(siteCopy["/markets"].title),
    path: "/markets",
    description: copyText(siteCopy["/markets"].description, {
      markets: census.markets,
      vendors: census.vendors.toLocaleString("en-CA"),
    }),
  });
}

const SEARCH_HIDE = `if(location.pathname==="/markets"&&location.search.length>1){var root=document.currentScript&&document.currentScript.parentElement;if(root){root.setAttribute("data-mr-search","");addEventListener("load",function(){setTimeout(function(){root.removeAttribute("data-mr-search")},4000)})}}`;

export default async function MarketsPage() {
  const data = await loadMarketsFloorView();
  const listItems = data.markets.map((market) => ({
    name: market.name,
    path: `/markets/${market.slug}`,
  }));

  return (
    <>
      <JsonLd data={breadcrumbJsonLd([MARKETS_CRUMB])} />
      <JsonLd
        data={itemListJsonLd({
          name: copyText(siteCopy["/markets"].h1),
          path: "/markets",
          items: listItems,
        })}
      />
      <div suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: SEARCH_HIDE }} />
        <MarketsFloor data={data} syncUrl />
      </div>
      <div className="mx-auto w-full max-w-7xl px-4 pb-10 sm:px-6">
        <BrowseLinks />
      </div>
    </>
  );
}
