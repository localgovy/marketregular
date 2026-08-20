"use client";

import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import type { Market } from "@/types/database";

const Inner = dynamic(
  () => import("@/components/market-map").then((m) => m.MarketMap),
  { ssr: false, loading: () => <div className="h-full w-full bg-muted" /> },
);

export const MARKET_PROFILE_MAP =
  "h-36 w-full overflow-hidden rounded-xl ring-1 ring-foreground/10";

const MARKET_MAP_DEFAULT =
  "h-80 w-full overflow-hidden rounded-xl ring-1 ring-foreground/10";

export function MarketMapLazy({
  markets,
  className,
}: {
  markets: Array<Pick<Market, "id" | "name" | "slug" | "lat" | "lng" | "city" | "address">>;
  className?: string;
}) {
  return (
    <div className={cn(className ?? MARKET_MAP_DEFAULT)}>
      <Inner markets={markets} className="h-full w-full" />
    </div>
  );
}
