import type { Metadata } from "next";
import { after } from "next/server";
import Link from "next/link";
import { BrowseLinks } from "@/components/browse-links";
import { JsonLd } from "@/components/json-ld";
import { MarketsBrowser } from "@/components/markets-browser";
import { getBareMarketsDirectory, getDirectoryCensus, listMarkets, searchDirectory } from "@/lib/data/catalog";
import { directoryInitialProps, filtersFromSearch, type DirectoryView } from "@/lib/directory-page";
import { getDirectoryView, warmChipDirectoryViews } from "@/lib/directory-view";
import {
  boundedDirectoryKey,
  marketsSearchFromQuery,
  placeAreasForMarkets,
  queryList,
  weekdayInToronto,
} from "@/lib/find-paths";
import { LAUNCH_CITY, LAUNCH_REGION } from "@/lib/launch";
import { breadcrumbJsonLd, itemListJsonLd, MARKETS_CRUMB, pageMeta } from "@/lib/seo";

function isBareMarketsVisit(params: {
  q?: string;
  weekday?: string | string[];
  tag?: string | string[];
  area?: string | string[];
  setup?: string;
  openNow?: string;
  lat?: string;
  lng?: string;
  sort?: string;
}) {
  return (
    !params.q?.trim() &&
    !params.setup &&
    params.openNow !== "1" &&
    !params.sort &&
    !params.lat &&
    !params.lng &&
    queryList(params.weekday).length === 0 &&
    queryList(params.tag).length === 0 &&
    queryList(params.area).length === 0
  );
}

/**
 * Canonical is always bare `/markets`, so every filter combination consolidates here
 * instead of competing. Day and category intent gets its own indexable pages.
 */
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
  }>;
}) {
  const params = await searchParams;
  const now = new Date();
  const nowIso = now.toISOString();
  const todayWeekday = weekdayInToronto(now);
  const search = marketsSearchFromQuery(params);
  const bare = isBareMarketsVisit(params);
  let view: DirectoryView;
  let places;
  if (bare) {
    const page = await getBareMarketsDirectory();
    after(() => warmChipDirectoryViews());
    view = { sortedAt: page.sortedAt, ...page.directory };
    places = page.places;
  } else if (boundedDirectoryKey(search)) {
    view = await getDirectoryView(search, now);
    // Filter options come from the whole directory, not the narrowed result set.
    places = placeAreasForMarkets(await listMarkets());
  } else {
    const page = await searchDirectory(filtersFromSearch(search), now);
    view = {
      sortedAt: nowIso,
      ...directoryInitialProps(page.markets, page.vendors, page.schedulesByMarket, page.halls),
    };
    places = placeAreasForMarkets(await listMarkets());
  }
  const listItems = view.mapMarkets.map((market) => ({
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
    search.sort,
  ].join("|");

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <JsonLd data={breadcrumbJsonLd([MARKETS_CRUMB])} />
      <JsonLd
        data={itemListJsonLd({
          name: `${LAUNCH_CITY} farmers' markets`,
          path: "/markets",
          items: listItems,
        })}
      />
      <h1>{LAUNCH_CITY} farmers&apos; markets</h1>
      <MarketsBrowser
        key={formKey}
        initialSearch={search}
        initialNow={nowIso}
        initialView={view}
        places={places}
        todayWeekday={todayWeekday}
      />
      <BrowseLinks className="mt-12" />
      <p className="mt-6 text-base">
        <Link href="/products" className="font-medium hover:underline">
          Browse by product
        </Link>
      </p>
    </div>
  );
}
