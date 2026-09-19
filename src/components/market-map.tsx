"use client";

import { useEffect, useRef } from "react";
import {
  LngLatBounds,
  Map,
  NavigationControl,
  Popup,
  setWorkerUrl,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { LAUNCH_CENTER, LAUNCH_ZOOM } from "@/lib/launch";
import { marketPlaceLine } from "@/lib/listing-copy";
import type { Market } from "@/types/database";
import type { GeoJSONSource, MapGeoJSONFeature } from "maplibre-gl";

setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

type MapPoint = Pick<Market, "id" | "name" | "slug" | "lat" | "lng" | "city" | "address">;

function featureCollection(markets: MapPoint[]) {
  return {
    type: "FeatureCollection" as const,
    features: markets.map((market) => ({
      type: "Feature" as const,
      geometry: {
        type: "Point" as const,
        coordinates: [market.lng, market.lat] as [number, number],
      },
      properties: {
        id: market.id,
        name: market.name,
        slug: market.slug,
        place: marketPlaceLine(market.address, market.city),
      },
    })),
  };
}

export function MarketMap({
  markets,
  className,
}: {
  markets: MapPoint[];
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || markets.length === 0) return;
    const solo = markets.length === 1 ? markets[0] : null;
    const map = new Map({
      container: ref.current,
      style: "https://tiles.openfreemap.org/styles/positron",
      center: solo ? [solo.lng, solo.lat] : [LAUNCH_CENTER.lng, LAUNCH_CENTER.lat],
      zoom: solo ? 14 : Math.max(LAUNCH_ZOOM, 10),
    });
    map.addControl(new NavigationControl({ showCompass: false }), "top-right");

    map.on("load", () => {
      map.addSource("markets", {
        type: "geojson",
        data: featureCollection(markets),
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 46,
      });

      map.addLayer({
        id: "clusters",
        type: "circle",
        source: "markets",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#2c4a40",
          "circle-radius": ["step", ["get", "point_count"], 16, 8, 20, 25, 26],
          "circle-stroke-width": 2,
          "circle-stroke-color": "#f3eee4",
        },
      });
      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "markets",
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-size": 13,
        },
        paint: {
          "text-color": "#f3eee4",
        },
      });
      map.addLayer({
        id: "unclustered",
        type: "circle",
        source: "markets",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": "#9e4a3e",
          "circle-radius": 7,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#f3eee4",
        },
      });

      map.on("click", "clusters", (event) => {
        const feature = event.features?.[0];
        if (!feature || feature.geometry.type !== "Point") return;
        const clusterId = feature.properties?.cluster_id as number | undefined;
        const source = map.getSource("markets") as GeoJSONSource;
        if (clusterId == null) return;
        const [lng, lat] = feature.geometry.coordinates as [number, number];
        void source.getClusterExpansionZoom(clusterId).then((zoom) => {
          map.easeTo({ center: [lng, lat], zoom });
        });
      });

      map.on("click", "unclustered", (event) => {
        const feature = event.features?.[0] as MapGeoJSONFeature | undefined;
        if (!feature || feature.geometry.type !== "Point") return;
        const slug = String(feature.properties?.slug ?? "");
        const name = String(feature.properties?.name ?? "");
        const place = String(feature.properties?.place ?? "");
        const [lng, lat] = feature.geometry.coordinates;
        const href = `/markets/${encodeURIComponent(slug)}`;
        new Popup({ offset: 12 })
          .setLngLat([lng, lat])
          .setHTML(
            `<a href="${escapeHtml(href)}" style="font-weight:600;color:#1a1714">${escapeHtml(name)}</a><div style="color:#5e5a53">${escapeHtml(place)}</div>`,
          )
          .addTo(map);
      });

      map.on("mouseenter", "clusters", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "clusters", () => {
        map.getCanvas().style.cursor = "";
      });
      map.on("mouseenter", "unclustered", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "unclustered", () => {
        map.getCanvas().style.cursor = "";
      });
    });

    if (solo) {
      // already centered
    } else if (markets.length > 1 && markets.length <= 12) {
      const bounds = new LngLatBounds();
      for (const market of markets) bounds.extend([market.lng, market.lat]);
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
