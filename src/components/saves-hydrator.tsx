"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { mergeSaves } from "@/app/actions/saves";
import { EMPTY_SAVES, getSaves, replaceSaves } from "@/lib/saves";
import { documentHasAuthCookie } from "@/lib/supabase/auth-cookie";

export function SavesHydrator() {
  const pathname = usePathname();
  const merged = useRef(false);

  useEffect(() => {
    if (!documentHasAuthCookie()) {
      if (merged.current) replaceSaves(EMPTY_SAVES);
      merged.current = false;
      return;
    }
    if (merged.current) return;
    merged.current = true;
    const before = getSaves();
    void mergeSaves(before)
      .then((canonical) => {
        if (!canonical) {
          merged.current = false;
          return;
        }
        const after = getSaves();
        if (
          after.markets.join("\0") !== before.markets.join("\0") ||
          after.vendors.join("\0") !== before.vendors.join("\0")
        ) {
          return;
        }
        replaceSaves(canonical);
      })
      .catch(() => {
        merged.current = false;
      });
  }, [pathname]);

  return null;
}
