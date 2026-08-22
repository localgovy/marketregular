import type { Metadata } from "next";
import { DirectoryResults } from "@/components/directory-results";
import { MarketMapLazy } from "@/components/market-map-lazy";
import { SearchForm } from "@/components/search-form";
import { searchDirectory } from "@/lib/data/catalog";
import { filterMarketsByAreas, queryList } from "@/lib/find-paths";
import { LAUNCH_CITY } from "@/lib/launch";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: `${LAUNCH_CITY} markets`,
  path: "/markets",
  description: `${LAUNCH_CITY} farmers' markets with this week's hours, maps, and who's on the floor.`,
});

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
  const { markets: foundMarkets, vendors } = await searchDirectory({
    q: params.q,
    weekdays: weekdays.length ? weekdays : undefined,
    tags: tags.length ? tags : undefined,
    setup: params.setup || undefined,
    openNow: params.openNow === "1",
    near,
  });
  const markets = filterMarketsByAreas(foundMarkets, areas);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <h1>Markets</h1>
      <p className="type-lede mt-2 mb-6 text-muted-foreground">
        {near
          ? "Closest to you first. You can still filter by day or what they sell."
          : "Filter by day, what they sell, or whether the doors are open right now."}
      </p>
      <SearchForm
        resultCount={markets.length}
        defaults={{
          q: params.q,
          weekdays,
          tags,
          areas,
          setup: params.setup,
          openNow: params.openNow === "1",
          lat: params.lat,
          lng: params.lng,
        }}
      />
      <div className="mt-8">
        <MarketMapLazy markets={markets} />
      </div>
      <p className="mt-6 text-sm text-muted-foreground">
        {markets.length} markets · {vendors.length} vendors
      </p>
      <DirectoryResults
        key={[
          params.q,
          weekdays.join(","),
          tags.join(","),
          areas.join(","),
          params.setup,
          params.openNow,
          params.lat,
          params.lng,
        ].join("|")}
        markets={markets}
        vendors={vendors}
      />
    </div>
  );
}
