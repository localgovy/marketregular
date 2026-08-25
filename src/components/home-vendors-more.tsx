"use client";

import { useState } from "react";
import { VendorTodayItem } from "@/components/home-vendors-item";
import { TODAY_STALL_CAP, type VendorTodayRow } from "@/lib/vendor-week";

export function VendorsTodayMore({ rest }: { rest: VendorTodayRow[] }) {
  const [shown, setShown] = useState(0);
  const visible = rest.slice(0, shown);
  const remaining = rest.length - shown;
  const next = Math.min(TODAY_STALL_CAP, remaining);

  return (
    <>
      {visible.map((row) => (
        <VendorTodayItem key={`${row.vendorSlug}-${row.marketSlug}`} row={row} />
      ))}
      {next > 0 ? (
        <li className="border-border">
          <button
            type="button"
            onClick={() => setShown((count) => count + TODAY_STALL_CAP)}
            className="w-full px-3 py-3 text-left text-base font-medium text-primary hover:bg-muted"
          >
            {next === 1 ? "See 1 more" : `See ${next} more`}
          </button>
        </li>
      ) : null}
    </>
  );
}
