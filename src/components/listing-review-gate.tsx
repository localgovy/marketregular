"use client";

import { EmptyReviews } from "@/components/empty-reviews";
import { ListingComposer } from "@/components/listing-composer";
import type { GeoMarket } from "@/lib/geo";
import { useAuthCookie } from "@/lib/supabase/use-auth-cookie";
import type { StallRef } from "@/types/database";

export function ListingReviewGate({
  hasFeed,
  next,
  markets,
  stalls,
  initialMarketId,
  initialVendorId,
  canCompose = true,
}: {
  hasFeed: boolean;
  next: string;
  markets: GeoMarket[];
  stalls: Array<Pick<StallRef, "id" | "name" | "slug" | "market_id" | "stall">>;
  initialMarketId?: string;
  initialVendorId?: string;
  canCompose?: boolean;
}) {
  const signedIn = useAuthCookie(false);
  if (!signedIn) {
    if (hasFeed) return null;
    return <EmptyReviews signedIn={false} next={next} />;
  }
  return (
    <>
      {hasFeed ? null : <EmptyReviews signedIn next={next} />}
      {canCompose ? (
        <ListingComposer
          signedIn
          markets={markets}
          stalls={stalls}
          initialMarketId={initialMarketId}
          initialVendorId={initialVendorId}
        />
      ) : null}
    </>
  );
}
