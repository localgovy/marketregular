"use client";

import { useEffect, useRef } from "react";
import {
  LngLatBounds,
  Map,
  Marker,
  NavigationControl,
  Popup,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { LAUNCH_CENTER, LAUNCH_ZOOM } from "@/lib/launch";
import type { Market } from "@/types/database";

export function MarketMap({
  markets,
  className,
}: {
  markets: Array<Pick<Market, "id" | "name" | "slug" | "lat" | "lng" | "city" | "address">>;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || markets.length === 0) return;
    const map = new Map({
      container: ref.current,
      style: "https://tiles.openfreemap.org/styles/positron",
      center: [LAUNCH_CENTER.lng, LAUNCH_CENTER.lat],
      zoom: markets.length === 1 ? 14 : LAUNCH_ZOOM,
    });
    map.addControl(new NavigationControl({ showCompass: false }), "top-right");

    const bounds = new LngLatBounds();
    for (const market of markets) {
      bounds.extend([market.lng, market.lat]);
      const popup = new Popup({ offset: 16 }).setHTML(
        `<a href="/markets/${market.slug}" style="font-weight:600;color:#1a1714">${market.name}</a><div style="color:#6a6358">${market.address ?? market.city}</div>`,
      );
      new Marker({ color: "#2d7a62" })
        .setLngLat([market.lng, market.lat])
        .setPopup(popup)
        .addTo(map);
    }
    if (markets.length > 1) {
      map.fitBounds(bounds, { padding: 48, maxZoom: 13, duration: 0 });
    }

    return () => map.remove();
  }, [markets]);

  return (
    <div
      ref={ref}
      className={className ?? "h-80 w-full overflow-hidden rounded-xl ring-1 ring-foreground/10"}
    />
  );
}
