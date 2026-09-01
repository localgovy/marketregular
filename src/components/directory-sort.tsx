"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DIRECTORY_SORTS,
  marketsHref,
  parseDirectorySort,
  type MarketsSearch,
} from "@/lib/find-paths";

export function DirectorySort({ search }: { search: MarketsSearch }) {
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [geoNote, setGeoNote] = useState<string | null>(null);
  const hasNear = Boolean(search.lat && search.lng);
  const sort = parseDirectorySort(search.sort, hasNear);

  function go(next: MarketsSearch) {
    router.replace(marketsHref(next), { scroll: false });
  }

  function askForLocation() {
    if (!navigator.geolocation) {
      setGeoNote("This browser cannot share a location.");
      return;
    }
    setGeoNote(null);
    setAsking(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setAsking(false);
        go({
          ...search,
          lat: String(pos.coords.latitude),
          lng: String(pos.coords.longitude),
          sort: "near",
        });
      },
      () => {
        setAsking(false);
        setGeoNote("Allow location to sort by distance.");
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 30_000 },
    );
  }

  /**
   * Read the raw choice: `parseDirectorySort` folds "near" back to "name" until
   * coordinates exist, so normalising first would swallow the request that is
   * supposed to trigger the location prompt.
   */
  function onChange(value: string) {
    if (value === "near" && !hasNear) {
      askForLocation();
      return;
    }
    setGeoNote(null);
    go({ ...search, sort: parseDirectorySort(value, hasNear) });
  }

  return (
    <>
      <label className="inline-flex items-baseline gap-1.5 text-sm text-muted-foreground">
        <span>Sort by</span>
        <select
          aria-label="Sort by"
          aria-describedby={geoNote ? "directory-sort-note" : undefined}
          value={asking ? "near" : sort}
          disabled={asking}
          onChange={(event) => onChange(event.target.value)}
          className="bg-transparent font-medium text-foreground disabled:opacity-40"
        >
          {DIRECTORY_SORTS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      {asking || geoNote ? (
        <span id="directory-sort-note" className="text-sm text-muted-foreground">
          {asking ? "Waiting for location…" : geoNote}
        </span>
      ) : null}
    </>
  );
}
