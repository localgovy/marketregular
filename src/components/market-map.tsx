"use client";

import { useEffect, useRef } from "react";
import {
  LngLatBounds,
  Map,
  Marker,
  NavigationControl,
  Popup,
  setWorkerUrl,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { LAUNCH_CENTER, LAUNCH_ZOOM } from "@/lib/launch";
import type { Market } from "@/types/database";

// Bundled MapLibre points the worker at this origin's HTML. Host the ESM worker
// next to its shared chunk so the map does not load index.html as a module.
setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

function pinElement() {
  const el = document.createElement("div");
  el.className = "market-map-pin";
  el.setAttribute("aria-hidden", "true");
  return el;
}

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
        `<a href="/markets/${market.slug}" style="font-weight:600;color:#1a1714">${market.name}</a><div style="color:#5e5a53">${market.address ?? market.city}</div>`,
      );
      const marker = new Marker({ element: pinElement(), anchor: "center" })
        .setLngLat([market.lng, market.lat])
        .setPopup(popup)
        .addTo(map);
      const node = marker.getElement();
      node.removeAttribute("tabindex");
      node.removeAttribute("role");
      node.removeAttribute("aria-label");
      node.setAttribute("aria-hidden", "true");
    }
    if (markets.length > 1) {
      map.fitBounds(bounds, { padding: 48, maxZoom: 13, duration: 0 });
    }

    const resize = () => map.resize();
    map.on("load", resize);
    const observer = new ResizeObserver(resize);
    observer.observe(ref.current);

    return () => {
      observer.disconnect();
      map.remove();
    };
  }, [markets]);

  return <div ref={ref} className={className} />;
}
