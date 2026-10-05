"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listingPortalOwned } from "@/app/actions/portal-application";
import { documentHasAuthCookie } from "@/lib/supabase/auth-cookie";
import type { ClaimTarget } from "@/types/database";

export function ListingPortalCta({
  kind,
  listingId,
}: {
  kind: ClaimTarget;
  listingId: string;
}) {
  const [owned, setOwned] = useState(false);
  const stall = kind === "vendor";

  useEffect(() => {
    if (!documentHasAuthCookie()) return;
    let cancelled = false;
    listingPortalOwned(kind, listingId).then((yes) => {
      if (!cancelled && yes) setOwned(true);
    });
    return () => {
      cancelled = true;
    };
  }, [kind, listingId]);

  if (owned) {
    return (
      <div className="rounded-xl bg-secondary/50 p-5">
        <p className="font-medium">{stall ? "This is your stall" : "This is your market"}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {stall
            ? "Update the name, menu, and the markets you sell at."
            : "Update the hours, contact details, and the stalls."}
        </p>
        <p className="mt-4 text-base">
          <Link
            href={stall ? `/vendor/${listingId}` : `/market/${listingId}`}
            className="font-medium hover:underline"
          >
            {stall ? "Edit this stall" : "Edit this market"}
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-secondary/50 p-5">
      <p className="font-medium">{stall ? "Run this stall?" : "Run this market?"}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {stall
          ? "Create a vendor account. After we assign this stall, you can edit it there."
          : "Create a market account. After we assign this market, you can edit it there."}
      </p>
      <p className="mt-4 text-base">
        <Link
          href={stall ? `/vendor?request=${listingId}` : `/market?request=${listingId}`}
          className="font-medium hover:underline"
        >
          {stall ? "Create a vendor account" : "Create a market account"}
        </Link>
      </p>
    </div>
  );
}
