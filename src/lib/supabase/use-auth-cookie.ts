"use client";

import { useLayoutEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { documentHasAuthCookie } from "@/lib/supabase/auth-cookie";

const AUTH_EVENT = "mr-auth-cookie";

let clientReady = false;

/** Tell mounted cookie hooks to re-read (sign in / sign out). */
export function notifyAuthCookie() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(AUTH_EVENT));
}

/** After mount. Until then the snapshot matches the server (signed out). */
export function bootAuthCookie() {
  if (clientReady || typeof window === "undefined") return;
  clientReady = true;
  notifyAuthCookie();
}

/**
 * Session cookie on the client. `assumeSignedIn` is the first paint:
 * false hides private UI until the cookie is read; true skips guest CTAs
 * until we know they are actually signed out.
 */
export function useAuthCookie(assumeSignedIn = false) {
  const pathname = usePathname();
  const [hasCookie, setHasCookie] = useState(assumeSignedIn);

  useLayoutEffect(() => {
    bootAuthCookie();
    function read() {
      setHasCookie(documentHasAuthCookie());
    }
    read();
    window.addEventListener("focus", read);
    document.addEventListener("visibilitychange", read);
    window.addEventListener(AUTH_EVENT, read);
    return () => {
      window.removeEventListener("focus", read);
      document.removeEventListener("visibilitychange", read);
      window.removeEventListener(AUTH_EVENT, read);
    };
  }, [pathname]);

  return hasCookie;
}
