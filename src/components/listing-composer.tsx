"use client";

import { useRouter } from "next/navigation";
import { FloorComposer } from "@/components/floor-composer";
import { GeoProvider } from "@/components/geo-provider";
import type { GeoMarket } from "@/lib/geo";
import type { StallRef } from "@/types/database";

export function ListingComposer({
  signedIn,
  markets,
  stalls,
  initialMarketId,
  initialVendorId,
  className = "mt-4 mb-6 rounded-md border-b-0 ring-1 ring-border",
}: {
  signedIn: boolean;
  markets: GeoMarket[];
  stalls: Array<Pick<StallRef, "id" | "name" | "slug" | "market_id" | "stall">>;
  initialMarketId?: string;
  initialVendorId?: string;
  className?: string;
}) {
  const router = useRouter();
  if (!markets.length) return null;

  return (
    <GeoProvider markets={markets}>
      <FloorComposer
        signedIn={signedIn}
        markets={markets}
        stalls={stalls}
        initialMarketId={initialMarketId ?? markets[0]?.id}
        initialVendorId={initialVendorId}
        className={className}
        onPosted={() => router.refresh()}
      />
    </GeoProvider>
  );
}
