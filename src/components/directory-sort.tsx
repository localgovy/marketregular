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
  const hasNear = Boolean(search.lat && search.lng);
  const sort = parseDirectorySort(search.sort, hasNear);

  function go(next: MarketsSearch) {
    router.replace(marketsHref(next), { scroll: false });
  }

  function onChange(value: string) {
    const next = parseDirectorySort(value, hasNear);
    if (next === "near" && !hasNear) {
      if (!navigator.geolocation) return;
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
        () => setAsking(false),
        { enableHighAccuracy: true, timeout: 12_000, maximumAge: 30_000 },
      );
      return;
    }
    go({ ...search, sort: next });
  }

  return (
    <label className="inline-flex items-baseline gap-1.5 text-sm text-muted-foreground">
      <span>Sort by</span>
      <select
        aria-label="Sort by"
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
  );
}
