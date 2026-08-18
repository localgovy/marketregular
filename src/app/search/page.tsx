import type { Metadata } from "next";
import { MarketCard } from "@/components/market-card";
import { MarketMapLazy } from "@/components/market-map-lazy";
import { SearchForm } from "@/components/search-form";
import { VendorCard } from "@/components/vendor-card";
import { getCities, searchDirectory } from "@/lib/data/catalog";

export const metadata: Metadata = {
  title: "Search markets and vendors",
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    province?: string;
    city?: string;
    weekday?: string;
    tag?: string;
    openNow?: string;
  }>;
}) {
  const params = await searchParams;
  const weekday = params.weekday === undefined || params.weekday === "" ? undefined : Number(params.weekday);
  const [{ markets, vendors }, cities] = await Promise.all([
    searchDirectory({
      q: params.q,
      province: params.province || undefined,
      city: params.city || undefined,
      weekday: Number.isFinite(weekday) ? weekday : undefined,
      tag: params.tag || undefined,
      openNow: params.openNow === "1",
    }),
    getCities(),
  ]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <h1 className="font-heading text-4xl">Find a market</h1>
      <p className="mt-2 mb-6 text-muted-foreground">
        Filter by province, city, day, what they sell, or whether the doors are open right now.
      </p>
      <SearchForm
        cities={cities}
        defaults={{
          q: params.q,
          province: params.province,
          city: params.city,
          weekday: params.weekday,
          tag: params.tag,
          openNow: params.openNow === "1",
        }}
      />
      <div className="mt-8">
        <MarketMapLazy markets={markets} />
      </div>
      <p className="mt-6 text-sm text-muted-foreground">
        {markets.length} markets · {vendors.length} vendors
      </p>
      <h2 className="mt-8 mb-4 font-heading text-2xl">Markets</h2>
      {markets.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {markets.map((market) => (
            <MarketCard key={market.id} market={market} />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">No markets match those filters.</p>
      )}
      <h2 className="mt-12 mb-4 font-heading text-2xl">Vendors</h2>
      {vendors.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {vendors.map((vendor) => (
            <VendorCard key={vendor.id} vendor={vendor} />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">No vendors match those filters.</p>
      )}
    </div>
  );
}
