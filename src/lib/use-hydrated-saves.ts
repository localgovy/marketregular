"use client";

import { useEffect, useState } from "react";
import { useSaves } from "@/components/save-button";
import { getSaves, replaceSaves, unionSaves, type Saves } from "@/lib/saves";

/** Server saves plus whatever this browser already had, after hydration. */
export function useHydratedSaves(initial: Saves) {
  const live = useSaves();
  const [hydrated, setHydrated] = useState(false);
  const marketKey = initial.markets.join("\0");
  const vendorKey = initial.vendors.join("\0");

  useEffect(() => {
    replaceSaves(unionSaves(initial, getSaves()));
    setHydrated(true);
    // `initial` is a new object each server render; the joined keys are the lists.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- marketKey / vendorKey
  }, [marketKey, vendorKey]);

  return hydrated ? live : initial;
}
