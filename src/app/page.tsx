import { CheckInIsland } from "@/components/check-in-island";
import { LiveFeed } from "@/components/live-feed";
import { MarketCard } from "@/components/market-card";
import { SearchForm } from "@/components/search-form";
import {
  getCities,
  getCurrentProfile,
  getFeaturedMarkets,
  getLivePosts,
  listMarkets,
} from "@/lib/data/catalog";
import { SITE_TAGLINE } from "@/lib/constants";

export default async function HomePage() {
  const [posts, featured, cities, markets, profile] = await Promise.all([
    getLivePosts(),
    getFeaturedMarkets(),
    getCities(),
    listMarkets(),
    getCurrentProfile(),
  ]);

  return (
    <div>
      <section className="border-b border-border/70 bg-[radial-gradient(circle_at_top_left,oklch(0.93_0.04_90),transparent_55%)]">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-14 sm:py-20">
          <div className="max-w-2xl">
            <p className="text-sm tracking-[0.2em] text-primary uppercase">In season, on the floor</p>
            <h1 className="mt-3 font-heading text-4xl leading-[1.1] tracking-tight sm:text-6xl">
              {SITE_TAGLINE}
            </h1>
            <p className="mt-4 max-w-xl text-lg text-muted-foreground">
              Search markets and vendors coast to coast. When you&apos;re actually there, post
              what&apos;s on the tables — peaches, parking, the last loaf.
            </p>
          </div>
          <SearchForm cities={cities} />
        </div>
      </section>

      <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 py-12 lg:grid-cols-[1.1fr_0.9fr]">
        <section>
          <div className="mb-4 flex items-end justify-between">
            <h2 className="font-heading text-3xl">Live from the markets</h2>
          </div>
          <LiveFeed initialPosts={posts} />
        </section>
        <aside className="flex flex-col gap-8">
          <CheckInIsland markets={markets} signedIn={Boolean(profile)} />
          <div>
            <h2 className="mb-4 font-heading text-3xl">Start here</h2>
            <div className="grid gap-4">
              {featured.slice(0, 4).map((market) => (
                <MarketCard key={market.id} market={market} />
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
