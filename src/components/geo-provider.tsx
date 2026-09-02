"use client";

import { createContext, useCallback, useContext, useState } from "react";

type GeoState = {
  coords: { lat: number; lng: number } | null;
  error: string | null;
  request: () => void;
};

const GeoContext = createContext<GeoState | null>(null);

export function GeoProvider({ children }: { children: React.ReactNode }) {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const request = useCallback(() => {
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
  }, []);

  return (
    <GeoContext.Provider value={{ coords, error, request }}>{children}</GeoContext.Provider>
  );
}

export function useGeo() {
  const ctx = useContext(GeoContext);
  if (!ctx) {
    return {
      coords: null,
      error: null,
      request: () => undefined,
    };
  }
  return ctx;
}
