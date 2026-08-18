"use client";

import { GeoProvider } from "@/components/geo-provider";
import type { Market } from "@/types/database";

export function HomeGeo({
  markets,
  children,
}: {
  markets: Market[];
  children: React.ReactNode;
}) {
  return <GeoProvider markets={markets}>{children}</GeoProvider>;
}
