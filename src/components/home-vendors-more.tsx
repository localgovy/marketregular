"use client";

import { useState } from "react";
import { getVendorsTodayRest } from "@/app/actions/home-lazy";
import { VendorTodayItem } from "@/components/home-vendors-item";
import type { VendorTodayRow } from "@/lib/vendor-week";

export function VendorsTodayMore({ total }: { total: number }) {
  const [extra, setExtra] = useState<VendorTodayRow[] | null>(null);
  const [pending, setPending] = useState(false);

  if (extra) {
    return extra.map((row) => (
      <VendorTodayItem key={`${row.vendorSlug}-${row.marketSlug}`} row={row} />
    ));
  }

  return (
    <li className="border-border">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setPending(true);
          void getVendorsTodayRest()
            .then(setExtra)
            .finally(() => setPending(false));
        }}
        className="w-full px-3 py-3 text-left text-base font-medium text-primary hover:bg-muted disabled:opacity-70"
      >
        {pending ? "Loading…" : `See all ${total}`}
      </button>
    </li>
  );
}
