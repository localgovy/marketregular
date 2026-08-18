"use client";

import { GeoProvider } from "@/components/geo-provider";
import { CheckInPanel } from "@/components/check-in-panel";
import type { Market } from "@/types/database";

export function CheckInIsland({
  markets,
  signedIn,
}: {
  markets: Market[];
  signedIn: boolean;
}) {
  return (
    <GeoProvider markets={markets}>
      <CheckInPanel signedIn={signedIn} />
    </GeoProvider>
  );
}
