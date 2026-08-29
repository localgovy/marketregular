import type { Metadata } from "next";
import { Suspense } from "react";
import { FeedBoard } from "@/components/feed-board";
import {
  getCurrentProfile,
  getFloorTape,
  getOpenToday,
  listMarkets,
  listStalls,
} from "@/lib/data/catalog";
import { toGeoMarket } from "@/lib/geo";
import { LAUNCH_CITY } from "@/lib/launch";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: `${LAUNCH_CITY} feed`,
  path: "/feed",
  description: `Posts from ${LAUNCH_CITY} markets. What's on the tables this week.`,
});

export default async function FeedPage() {
  const [tape, markets, stalls, openNow, profile] = await Promise.all([
    getFloorTape(80),
    listMarkets(),
    listStalls(),
    getOpenToday(),
    getCurrentProfile(),
  ]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <h1>Feed</h1>
      <p className="type-lede mt-2 max-w-2xl text-muted-foreground">
        Posts from {LAUNCH_CITY} markets. Filter by hall, stall, or what&apos;s on the table.
      </p>
      <Suspense fallback={<p className="mt-8 text-base text-muted-foreground">Loading posts…</p>}>
        <FeedBoard
          initialItems={tape}
          signedIn={Boolean(profile)}
          stalls={stalls.map((stall) => ({
            id: stall.id,
            name: stall.name,
            slug: stall.slug,
            market_id: stall.market_id,
            stall: stall.stall,
          }))}
          markets={markets.map(toGeoMarket)}
          openSlugs={openNow.map((market) => market.slug)}
        />
      </Suspense>
    </div>
  );
}
