"use client";

import { useEffect } from "react";
import { useSaves } from "@/components/save-button";
import { adoptServerSaves, type Saves } from "@/lib/saves";
import { useMounted } from "@/lib/use-now";

/** Server saves plus this tab’s live list, without resurrecting unsaves. */
export function useHydratedSaves(initial: Saves) {
  const live = useSaves();
  const hydrated = useMounted();
  const marketKey = initial.markets.join("\0");
  const vendorKey = initial.vendors.join("\0");
  const blogKey = initial.blogs.join("\0");
  const listingKey = (initial.listings ?? []).map((row) => row.slug).join("\0");
  const productKey = (initial.products ?? []).map((row) => row.slug).join("\0");

  useEffect(() => {
    adoptServerSaves(initial);
    // `initial` is a new object each server render; the joined keys are the lists.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- marketKey / vendorKey / blogKey / listingKey / productKey
  }, [marketKey, vendorKey, blogKey, listingKey, productKey]);

  return hydrated ? live : initial;
}
