import type { Metadata } from "next";
import { BrowseLinks } from "@/components/browse-links";
import { DirectoryResults } from "@/components/directory-results";
import { DirectorySort } from "@/components/directory-sort";
import { JsonLd } from "@/components/json-ld";
import { MarketMapLazy } from "@/components/market-map-lazy";
import { SearchForm } from "@/components/search-form";
import { getDirectoryCensus, listMarkets, searchDirectory } from "@/lib/data/catalog";
import {
  marketsCrumbs,
  parseDirectorySort,
  placeAreasForMarkets,
  queryList,
  type MarketsSearch,
} from "@/lib/find-paths";
import { LAUNCH_CITY, LAUNCH_REGION } from "@/lib/launch";
import { breadcrumbJsonLd, itemListJsonLd, MARKETS_CRUMB, pageMeta } from "@/lib/seo";

/**
 * Canonical is always bare `/markets`, so every filter combination consolidates here
 * instead of competing. Day and category intent gets its own indexable pages.
 */
export async function generateMetadata(): Promise<Metadata> {
  const census = await getDirectoryCensus();
  return pageMeta({
    title: `${LAUNCH_CITY} farmers' markets: hours and vendors`,
    path: "/markets",
    description: `All ${census.markets} farmers' markets across ${LAUNCH_CITY} and the ${LAUNCH_REGION}, with this week's hours, addresses, maps and the ${census.vendors.toLocaleString("en-CA")} stalls that work them.`,
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
  const weekdays = queryList(params.weekday)
    .map(Number)
    .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6);
  const lat = params.lat === undefined || params.lat === "" ? Number.NaN : Number(params.lat);
  const lng = params.lng === undefined || params.lng === "" ? Number.NaN : Number(params.lng);
  const near = Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : undefined;
  const tags = queryList(params.tag);
  const areas = queryList(params.area);
  const sort = parseDirectorySort(params.sort, Boolean(near));
  const { markets, vendors, schedulesByMarket } = await searchDirectory({
    q: params.q,
    weekdays: weekdays.length ? weekdays : undefined,
    tags: tags.length ? tags : undefined,
    areas: areas.length ? areas : undefined,
    setup: params.setup || undefined,
    openNow: params.openNow === "1",
    near,
    sort,
  });
  // Filter options come from the whole directory, not the narrowed result set.
  const places = placeAreasForMarkets(await listMarkets());
  const crumbs = marketsCrumbs({
    weekdays,
    setup: params.setup,
    areas,
    tags,
    openNow: params.openNow === "1",
    near: Boolean(near),
    sort,
  });
  const search: MarketsSearch = {
    q: params.q,
    weekdays,
    tags,
    areas,
    setup: params.setup,
    openNow: params.openNow === "1",
    lat: params.lat,
    lng: params.lng,
    sort,
  };
  const status = [LAUNCH_CITY, ...crumbs, `${markets.length} markets`].join(" · ");
  const summary = [
    `${markets.length} markets`,
    `${vendors.length} vendors`,
    crumbs.join(", "),
  ]
    .filter(Boolean)
    .join(" · ");
  const formKey = [
    params.q,
    weekdays.join(","),
    tags.join(","),
    areas.join(","),
    params.setup,
    params.openNow,
    params.lat,
    params.lng,
    sort,
  ].join("|");

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <JsonLd data={breadcrumbJsonLd([MARKETS_CRUMB])} />
      <JsonLd
        data={itemListJsonLd({
          name: `${LAUNCH_CITY} farmers' markets`,
          path: "/markets",
          items: markets.map((market) => ({
            name: market.name,
            path: `/markets/${market.slug}`,
          })),
        })}
      />
      <h1>{LAUNCH_CITY} farmers&apos; markets</h1>
      <p className="type-kicker mt-2 mb-6 text-muted-foreground">{status}</p>
      <SearchForm
        resultCount={markets.length}
        places={places}
        defaults={{
          q: params.q,
          weekdays,
          tags,
          areas,
          setup: params.setup,
          openNow: params.openNow === "1",
          lat: params.lat,
          lng: params.lng,
          sort,
        }}
      />
      <div className="mt-8">
        <MarketMapLazy markets={markets} load="visible" />
      </div>
      <div className="mt-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b border-border pb-2">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <a
            href="#directory-markets"
            className="text-base font-medium underline decoration-primary decoration-2 underline-offset-8"
          >
            Search Results
          </a>
          <DirectorySort search={search} />
        </div>
        <p className="text-sm text-muted-foreground">{summary}</p>
      </div>
      <DirectoryResults
        key={formKey}
        markets={markets}
        vendors={vendors}
        schedulesByMarket={schedulesByMarket}
        weekdays={weekdays}
      />
      <BrowseLinks className="mt-12" />
    </div>
  );
}
