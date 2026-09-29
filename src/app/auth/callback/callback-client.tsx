"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { OAUTH_HASH_STORAGE_KEY } from "@/lib/analytics";
import { clearAuthNextCookie, readAuthNextCookie, safePath } from "@/lib/auth-redirect";

export function AuthCallbackClient() {
  const router = useRouter();

  useEffect(() => {
    try {
      sessionStorage.removeItem(OAUTH_HASH_STORAGE_KEY);
    } catch {
      /* private mode */
    }
    const arriving = new URLSearchParams(window.location.search);
    if (arriving.has("token_hash")) {
      window.location.replace(`/auth/confirm${window.location.search}`);
      return;
    }
    if (
      arriving.has("code") ||
      arriving.has("error") ||
      arriving.has("error_description")
    ) {
      window.location.replace(`/auth/pkce${window.location.search}`);
      return;
    }
    const next = safePath(readAuthNextCookie());
    clearAuthNextCookie();
    router.replace(next);
    router.refresh();
  }, [router]);

  return (
    <div className="mx-auto w-full max-w-md px-4 py-10">
      <h1>Signing in</h1>
      <p className="type-lede mt-2 text-muted-foreground">Continuing…</p>
    </div>
  );
}
