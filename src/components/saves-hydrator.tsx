"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { mergeSaves } from "@/app/actions/saves";
import { EMPTY_SAVES, getSaves, replaceSaves, unionSaves } from "@/lib/saves";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function SavesHydrator() {
  const pathname = usePathname();
  const router = useRouter();
  const merged = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;

    void (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!session) {
        if (merged.current) replaceSaves(EMPTY_SAVES);
        merged.current = false;
        return;
      }
      if (merged.current) return;
      merged.current = true;
      const before = getSaves();
      try {
        const canonical = await mergeSaves(before);
        if (cancelled) return;
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
        replaceSaves(unionSaves(before, canonical));
        router.refresh();
      } catch {
        merged.current = false;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  return null;
}
