"use client";

import { useEffect, useState } from "react";
import { useSaves } from "@/components/save-button";
import { adoptServerSaves, type Saves } from "@/lib/saves";

/** Server saves plus this tab’s live list, without resurrecting unsaves. */
export function useHydratedSaves(initial: Saves) {
  const live = useSaves();
  const [hydrated, setHydrated] = useState(false);
  const marketKey = initial.markets.join("\0");
  const vendorKey = initial.vendors.join("\0");
  const blogKey = initial.blogs.join("\0");
  const listingKey = (initial.listings ?? []).map((row) => row.slug).join("\0");

  useEffect(() => {
    adoptServerSaves(initial);
    setHydrated(true);
    // `initial` is a new object each server render; the joined keys are the lists.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- marketKey / vendorKey / blogKey / listingKey
  }, [marketKey, vendorKey, blogKey, listingKey]);

  return hydrated ? live : initial;
}
