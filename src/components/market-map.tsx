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
import type { Market } from "@/types/database";

export function MarketMap({
  markets,
  className,
}: {
  markets: Array<Pick<Market, "id" | "name" | "slug" | "lat" | "lng" | "city">>;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || markets.length === 0) return;
    const map = new Map({
      container: ref.current,
      style: "https://tiles.openfreemap.org/styles/positron",
      center: [markets[0].lng, markets[0].lat],
      zoom: markets.length === 1 ? 14 : 3.4,
    });
    map.addControl(new NavigationControl({ showCompass: false }), "top-right");

    const bounds = new LngLatBounds();
    for (const market of markets) {
      bounds.extend([market.lng, market.lat]);
      const popup = new Popup({ offset: 16 }).setHTML(
        `<a href="/markets/${market.slug}" style="font-weight:600;color:#171614">${market.name}</a><div style="color:#5e5b54">${market.city}</div>`,
      );
      new Marker({ color: "#3a555c" })
        .setLngLat([market.lng, market.lat])
        .setPopup(popup)
        .addTo(map);
    }
    if (markets.length > 1) {
      map.fitBounds(bounds, { padding: 48, maxZoom: 10, duration: 0 });
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
