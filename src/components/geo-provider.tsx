"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { distanceMeters } from "@/lib/geo";
import type { Market } from "@/types/database";

type GeoState = {
  coords: { lat: number; lng: number } | null;
  error: string | null;
  nearby: Array<Market & { distance: number }>;
  request: () => void;
};

const GeoContext = createContext<GeoState | null>(null);

export function GeoProvider({
  markets,
  children,
}: {
  markets: Market[];
  children: React.ReactNode;
}) {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const request = () => {
    if (!navigator.geolocation) {
      setError("Location is not available in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setError(null);
      },
      (err) => setError(err.message),
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 30_000 },
    );
  };

  useEffect(() => {
    request();
  }, []);

  const nearby = useMemo(() => {
    if (!coords) return [];
    return markets
      .map((m) => ({
        ...m,
        distance: distanceMeters(coords, { lat: m.lat, lng: m.lng }),
      }))
      .filter((m) => m.distance <= m.geofence_radius_m)
      .sort((a, b) => a.distance - b.distance);
  }, [coords, markets]);

  return (
    <GeoContext.Provider value={{ coords, error, nearby, request }}>
      {children}
    </GeoContext.Provider>
  );
}

export function useGeo() {
  const ctx = useContext(GeoContext);
  if (!ctx) {
    return {
      coords: null,
      error: null,
      nearby: [] as Array<Market & { distance: number }>,
      request: () => undefined,
    };
  }
  return ctx;
}
