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
import { loadMySaves } from "@/lib/data/account";
import { toGeoMarket } from "@/lib/geo";
import { copyText, siteCopy } from "@/content/site-copy";
import { pageMeta } from "@/lib/seo";

export const metadata: Metadata = pageMeta({
  title: copyText(siteCopy["/feed"].title),
  path: "/feed",
  description: copyText(siteCopy["/feed"].description),
});

export default async function FeedPage() {
  const [tape, markets, stalls, openNow, profile, saves] = await Promise.all([
    getFloorTape(80),
    listMarkets(),
    listStalls(),
    getOpenToday(),
    getCurrentProfile(),
    loadMySaves(),
  ]);
  const savedSlug = saves.markets[0];
  const savedMarket = savedSlug
    ? markets.find((market) => market.slug === savedSlug)
    : undefined;
  const initialMarketId = savedMarket?.id ?? openNow[0]?.id;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <h1>{siteCopy["/feed"].h1}</h1>
      <p className="type-lede mt-2 max-w-2xl text-muted-foreground">
        {copyText(siteCopy["/feed"].lede)}
      </p>
      <Suspense fallback={<p className="mt-8 text-base text-muted-foreground">{siteCopy["/feed"].loading}</p>}>
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
          initialMarketId={initialMarketId}
        />
      </Suspense>
    </div>
  );
}
