"use client";

import { createContext, useCallback, useContext, useState } from "react";

type GeoState = {
  coords: { lat: number; lng: number } | null;
  error: string | null;
  request: () => void;
  requestAsync: () => Promise<{ lat: number; lng: number } | null>;
};

const GeoContext = createContext<GeoState | null>(null);

export function GeoProvider({ children }: { children: React.ReactNode }) {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const requestAsync = useCallback(() => {
    if (coords) return Promise.resolve(coords);
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("Location is not available in this browser.");
      return Promise.resolve(null);
    }
    return new Promise<{ lat: number; lng: number } | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setCoords(next);
          setError(null);
          resolve(next);
        },
        (err) => {
          setError(err.message);
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 8_000, maximumAge: 30_000 },
      );
    });
  }, [coords]);

  const request = useCallback(() => {
    void requestAsync();
  }, [requestAsync]);

  return (
    <GeoContext.Provider value={{ coords, error, request, requestAsync }}>{children}</GeoContext.Provider>
  );
}

export function useGeo() {
  const ctx = useContext(GeoContext);
  if (!ctx) {
    return {
      coords: null,
      error: null,
      request: () => undefined,
      requestAsync: async () => null,
    };
  }
  return ctx;
}
