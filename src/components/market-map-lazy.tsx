"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { getHomeMapMarkets } from "@/app/actions/home-lazy";
import { BlocksMark } from "@/components/marks";
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

export type MapMarket = Pick<
  Market,
  "id" | "name" | "slug" | "lat" | "lng" | "city" | "address"
>;

function MapPlaceholder({ onShow }: { onShow: () => void }) {
  return (
    <button
      type="button"
      onClick={onShow}
      className="flex h-full w-full flex-col items-center justify-center gap-2 bg-muted px-4 text-base font-medium text-foreground outline-none hover:bg-muted/80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
    >
      <BlocksMark className="size-6 text-muted-foreground" />
      Show map
    </button>
  );
}

export function MarketMapLazy({
  markets,
  className,
  load = "click",
}: {
  markets?: MapMarket[];
  className?: string;
  load?: "click" | "visible";
}) {
  const [ready, setReady] = useState(false);
  const [points, setPoints] = useState<MapMarket[] | null>(markets ?? null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const reveal = useCallback(() => setReady(true), []);

  useEffect(() => {
    if (!ready || points) return;
    let cancelled = false;
    void getHomeMapMarkets().then((next) => {
      if (!cancelled) setPoints(next);
    });
    return () => {
      cancelled = true;
    };
  }, [ready, points]);

  useEffect(() => {
    if (load !== "visible" || ready) return;
    const node = wrapRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setReady(true);
          io.disconnect();
        }
      },
      { rootMargin: "80px" },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [load, ready]);

  return (
    <div ref={wrapRef} className={cn(className ?? MARKET_MAP_DEFAULT)}>
      {ready && points ? (
        <Inner markets={points} className="h-full w-full" />
      ) : (
        <MapPlaceholder onShow={reveal} />
      )}
    </div>
  );
}
