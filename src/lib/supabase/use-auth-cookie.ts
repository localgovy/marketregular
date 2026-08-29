"use client";

import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { documentHasAuthCookie } from "@/lib/supabase/auth-cookie";

const AUTH_EVENT = "mr-auth-cookie";

let clientReady = false;

/** After mount. Until then the snapshot matches the server (signed out). */
export function bootAuthCookie() {
  if (clientReady || typeof window === "undefined") return;
  clientReady = true;
  window.dispatchEvent(new Event(AUTH_EVENT));
}

function authSnapshot() {
  return clientReady ? documentHasAuthCookie() : false;
}

function subscribe(onStoreChange: () => void) {
  window.addEventListener("focus", onStoreChange);
  document.addEventListener("visibilitychange", onStoreChange);
  window.addEventListener(AUTH_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("focus", onStoreChange);
    document.removeEventListener("visibilitychange", onStoreChange);
    window.removeEventListener(AUTH_EVENT, onStoreChange);
  };
}

/**
 * Session cookie on the client. `assumeSignedIn` is the SSR snapshot:
 * false hides private UI until the cookie is read; true skips guest CTAs
 * until we know they are actually signed out.
 */
export function useAuthCookie(assumeSignedIn = false) {
  usePathname();
  return useSyncExternalStore(subscribe, authSnapshot, () => assumeSignedIn);
}
