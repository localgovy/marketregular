"use client";

import Link from "next/link";
import { useGeo } from "@/components/geo-provider";
import { distanceMeters, formatDistance } from "@/lib/geo";
import type { Market } from "@/types/database";

export function NearMarkets({ markets }: { markets: Market[] }) {
  const { coords, error } = useGeo();

  if (!coords) {
    return (
      <p className="text-sm text-muted-foreground">
        Nearby markets will show here after you share your location.
        {error ? <span className="ml-1 text-destructive">{error}</span> : null}
      </p>
    );
  }

  const nearest = markets
    .map((m) => ({
      ...m,
      distance: distanceMeters(coords, { lat: m.lat, lng: m.lng }),
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 5);

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-muted-foreground">Closest to you</p>
      <ul className="overflow-hidden rounded-md ring-1 ring-border">
        {nearest.map((m) => (
          <li key={m.id} className="border-b border-border last:border-b-0">
            <Link
              href={`/markets/${m.slug}`}
              className="flex items-baseline justify-between gap-2 px-3 py-2 hover:bg-secondary/60"
            >
              <span className="min-w-0 truncate text-base font-medium">
                {m.name}
                <span className="ml-1 font-normal text-muted-foreground">
                  {m.address}
                </span>
              </span>
              <span className="shrink-0 text-sm font-medium text-ticket">
                {formatDistance(m.distance)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
