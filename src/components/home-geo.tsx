"use client";

import { GeoProvider } from "@/components/geo-provider";
import type { GeoMarket } from "@/lib/geo";

export function HomeGeo({
  markets,
  children,
}: {
  markets: GeoMarket[];
  children: React.ReactNode;
}) {
  return <GeoProvider markets={markets}>{children}</GeoProvider>;
}
