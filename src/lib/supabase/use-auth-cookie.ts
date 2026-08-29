"use client";

import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { documentHasAuthCookie } from "@/lib/supabase/auth-cookie";

function subscribe(onStoreChange: () => void) {
  window.addEventListener("focus", onStoreChange);
  document.addEventListener("visibilitychange", onStoreChange);
  return () => {
    window.removeEventListener("focus", onStoreChange);
    document.removeEventListener("visibilitychange", onStoreChange);
  };
}

/**
 * Session cookie on the client. `assumeSignedIn` is the SSR snapshot:
 * false hides private UI until the cookie is read; true skips guest CTAs
 * until we know they are actually signed out.
 */
export function useAuthCookie(assumeSignedIn = false) {
  usePathname();
  return useSyncExternalStore(subscribe, documentHasAuthCookie, () => assumeSignedIn);
}
