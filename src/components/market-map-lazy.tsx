"use client";

import dynamic from "next/dynamic";
import type { Market } from "@/types/database";

const Inner = dynamic(
  () => import("@/components/market-map").then((m) => m.MarketMap),
  { ssr: false, loading: () => <div className="h-80 rounded-xl bg-muted" /> },
);

export function MarketMapLazy(
  props: {
    markets: Array<Pick<Market, "id" | "name" | "slug" | "lat" | "lng" | "city">>;
    className?: string;
  },
) {
  return <Inner {...props} />;
}
