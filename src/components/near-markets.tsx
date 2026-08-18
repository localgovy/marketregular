"use client";

import Link from "next/link";
import { useGeo } from "@/components/geo-provider";
import { distanceMeters, formatDistance } from "@/lib/geo";
import { provinceName } from "@/lib/constants";
import type { Market } from "@/types/database";

export function NearMarkets({ markets }: { markets: Market[] }) {
  const { coords, error } = useGeo();

  if (!coords) {
    return (
      <p className="text-xs text-muted-foreground">
        Nearby markets show up here after you share location.
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
    <ul className="grid gap-1 sm:grid-cols-2">
      {nearest.map((m) => (
        <li key={m.id}>
          <Link
            href={`/markets/${m.slug}`}
            className="flex items-baseline justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-secondary"
          >
            <span className="min-w-0 truncate text-sm font-medium">
              {m.name}
              <span className="ml-1 font-normal text-muted-foreground">
                {m.city}, {provinceName(m.province)}
              </span>
            </span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {formatDistance(m.distance)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
