"use client";

import { useState } from "react";
import { getVendorsTodaySlice } from "@/app/actions/home-lazy";
import { VendorTodayItem } from "@/components/home-vendors-item";
import { TODAY_STALL_CAP, type VendorTodayRow } from "@/lib/vendor-week";

export function VendorsTodayMore({
  remaining,
  nowIso,
  offset = TODAY_STALL_CAP,
}: {
  remaining: number;
  nowIso: string;
  offset?: number;
}) {
  const [extra, setExtra] = useState<VendorTodayRow[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const left = remaining - extra.length;
  const next = Math.min(TODAY_STALL_CAP, left);

  return (
    <>
      {extra.map((row) => (
        <VendorTodayItem key={`${row.vendorSlug}-${row.marketSlug}`} row={row} />
      ))}
      {error ? <li className="px-3 py-2 text-sm text-destructive">{error}</li> : null}
      {next > 0 ? (
        <li className="border-border">
          <button
            type="button"
            onClick={() => {
              if (pending || next <= 0) return;
              setPending(true);
              void getVendorsTodaySlice(offset + extra.length, TODAY_STALL_CAP, nowIso)
                .then((rows) => {
                  setExtra((current) => [...current, ...rows]);
                  setError(null);
                })
                .catch(() => setError("Couldn't load more vendors."))
                .finally(() => setPending(false));
            }}
            className="w-full px-3 py-3 text-left text-base font-medium text-primary hover:bg-muted"
          >
            {next === 1 ? "See 1 more" : `See ${next} more`}
          </button>
        </li>
      ) : null}
    </>
  );
}
