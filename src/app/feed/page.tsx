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
import { LAUNCH_CITY } from "@/lib/launch";

export const metadata: Metadata = { title: `${LAUNCH_CITY} feed` };

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
        Notes from {LAUNCH_CITY} markets. Filter by hall, stall, or what&apos;s on the table. You
        do not have to share your location.
      </p>
      <Suspense fallback={<p className="mt-8 text-base text-muted-foreground">Loading notes…</p>}>
        <FeedBoard>
          initialItems={tape}
          signedIn={Boolean(profile)}
          stalls={stalls}
          markets={markets}
          openSlugs={openNow.map((market) => market.slug)}
        />
      </Suspense>
    </div>
  );
}
