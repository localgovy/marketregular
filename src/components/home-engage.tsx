"use client";

import { CheckInPanel } from "@/components/check-in-panel";
import { GeoProvider } from "@/components/geo-provider";
import { NearMarkets } from "@/components/near-markets";
import type { Market } from "@/types/database";

export function HomeEngage({
  markets,
  signedIn,
}: {
  markets: Market[];
  signedIn: boolean;
}) {
  return (
    <GeoProvider markets={markets}>
      <div className="grid gap-3">
        <CheckInPanel signedIn={signedIn} compact />
        <NearMarkets markets={markets} />
      </div>
    </GeoProvider>
  );
}
