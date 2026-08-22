import type { Metadata } from "next";
import { MarketCard } from "@/components/market-card";
import { MarketMapLazy } from "@/components/market-map-lazy";
import { SearchForm } from "@/components/search-form";
import { VendorCard } from "@/components/vendor-card";
import { searchDirectory } from "@/lib/data/catalog";
import { queryList } from "@/lib/find-paths";
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
    weekday?: string;
    tag?: string | string[];
    setup?: string;
    openNow?: string;
    lat?: string;
    lng?: string;
  }>;
}) {
  const params = await searchParams;
  const weekday =
    params.weekday === undefined || params.weekday === "" ? undefined : Number(params.weekday);
  const lat = params.lat === undefined || params.lat === "" ? Number.NaN : Number(params.lat);
  const lng = params.lng === undefined || params.lng === "" ? Number.NaN : Number(params.lng);
  const near = Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : undefined;
  const tags = queryList(params.tag);
  const { markets, vendors } = await searchDirectory({
    q: params.q,
    weekday: Number.isFinite(weekday) ? weekday : undefined,
    tags: tags.length ? tags : undefined,
    setup: params.setup || undefined,
    openNow: params.openNow === "1",
    near,
  });

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <h1>Markets</h1>
      <p className="type-lede mt-2 mb-6 text-muted-foreground">
        {near
          ? "Closest to you first. You can still filter by day or what they sell."
          : "Filter by day, what they sell, or whether the doors are open right now."}
      </p>
      <SearchForm
        defaults={{
          q: params.q,
          weekday: params.weekday,
          tags,
          setup: params.setup,
          openNow: params.openNow === "1",
        }}
      />
      <div className="mt-8">
        <MarketMapLazy markets={markets} />
      </div>
      <p className="mt-6 text-sm text-muted-foreground">
        {markets.length} markets · {vendors.length} vendors
      </p>
      <div className="mt-8 grid items-start gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-x-8">
        <section>
          <h2 className="mb-4">Markets</h2>
          {markets.length ? (
            <div className="grid gap-4">
              {markets.map((market) => (
                <MarketCard key={market.id} market={market} />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No markets match those filters.</p>
          )}
        </section>
        <section>
          <h2 className="mb-4">Vendors</h2>
          {vendors.length ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {vendors.map((vendor) => (
                <VendorCard key={vendor.id} vendor={vendor} />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No vendors match those filters.</p>
          )}
        </section>
      </div>
    </div>
  );
}
