"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { mergeSaves } from "@/app/actions/saves";
import { flushPendingSave } from "@/lib/pending-save";
import { EMPTY_SAVES, bootSaves, clearTombstones, getSaves, replaceSaves, sameSaves } from "@/lib/saves";
import { documentHasAuthCookie } from "@/lib/supabase/auth-cookie";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { bootAuthCookie } from "@/lib/supabase/use-auth-cookie";

export function SavesHydrator() {
  const pathname = usePathname();
  const router = useRouter();
  const merged = useRef(false);

  useEffect(() => {
    bootAuthCookie();
    bootSaves();

    if (pathname.startsWith("/auth/")) return;

    let cancelled = false;
    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;

    void (async () => {
      if (!documentHasAuthCookie()) {
        clearTombstones();
        replaceSaves(EMPTY_SAVES);
        merged.current = false;
        return;
      }
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!session) {
        // Cookie is present; the session payload can lag. Do not wipe.
        return;
      }
      if (merged.current) {
        await flushPendingSave();
        return;
      }

      try {
        let before = getSaves();
        let canonical = await mergeSaves(before);
        for (let attempt = 0; attempt < 3; attempt += 1) {
          if (cancelled) return;
          if (!canonical) return;
          const after = getSaves();
          if (sameSaves(after, before)) {
            replaceSaves(canonical);
            merged.current = true;
            await flushPendingSave();
            if (!cancelled) router.refresh();
            return;
          }
          before = after;
          canonical = await mergeSaves(before);
        }
        if (cancelled || !canonical) return;
        replaceSaves(canonical);
        merged.current = true;
        await flushPendingSave();
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
