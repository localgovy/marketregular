"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { mergeSaves } from "@/app/actions/saves";
import { oauthValuesMatch, takeGoogleOAuthHandoff } from "@/lib/google-oauth";
import { LOGIN_ERROR_COPY } from "@/lib/public-error";
import { clearAuthNextCookie, readAuthNextCookie, safePath } from "@/lib/auth-redirect";
import { getSaves } from "@/lib/saves";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type CallbackPayload = {
  cancelled: boolean;
  token: string | null;
  state: string | null;
  handoff: ReturnType<typeof takeGoogleOAuthHandoff>;
};

let payload: CallbackPayload | undefined;

function consumeGoogleCallback(): CallbackPayload {
  if (payload) return payload;
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const query = new URLSearchParams(window.location.search);
  payload = {
    cancelled: Boolean(
      hash.get("error") ||
        hash.get("error_description") ||
        query.get("error") ||
        query.get("error_description"),
    ),
    token: hash.get("id_token"),
    state: hash.get("state") ?? query.get("state"),
    handoff: takeGoogleOAuthHandoff(),
  };
  window.history.replaceState(null, "", window.location.pathname);
  return payload;
}

function loginHref(next: string, key: "oauth" | "session") {
  const url = new URL("/login", window.location.origin);
  url.searchParams.set("error", key);
  if (next !== "/account") url.searchParams.set("next", next);
  return `${url.pathname}${url.search}`;
}

export function AuthCallbackClient() {
  const router = useRouter();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const arriving = new URLSearchParams(window.location.search);
      if (
        arriving.has("code") ||
        arriving.has("error") ||
        arriving.has("error_description")
      ) {
        window.location.replace(`/auth/pkce${window.location.search}`);
        return;
      }

      const { cancelled: oauthCancelled, token, state, handoff } = consumeGoogleCallback();
      const next = safePath(handoff?.next ?? readAuthNextCookie());

      const fail = (key: "oauth" | "session") => {
        clearAuthNextCookie();
        if (!cancelled) {
          setFailed(true);
          router.replace(loginHref(next, key));
        }
      };

      if (oauthCancelled) {
        fail("oauth");
        return;
      }
      if (!token) {
        clearAuthNextCookie();
        if (!cancelled) router.replace(next);
        return;
      }
      if (!handoff || !state || !oauthValuesMatch(state, handoff.state)) {
        fail("oauth");
        return;
      }

      const supabase = createBrowserSupabaseClient();
      if (!supabase) {
        fail("session");
        return;
      }

      const { error } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token,
        nonce: handoff.nonce,
      });
      if (error) {
        fail("session");
        return;
      }

      try {
        await mergeSaves(getSaves());
      } catch {
        /* Account hydrator retries. */
      }

      if (cancelled) return;
      clearAuthNextCookie();
      router.replace(next);
      router.refresh();
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="mx-auto w-full max-w-md px-4 py-10">
      <h1>{failed ? "Sign in" : "Signing in"}</h1>
      <p className="type-lede mt-2 text-muted-foreground">
        {failed ? (
          <>
            {LOGIN_ERROR_COPY.oauth}{" "}
            <Link href="/login" className="font-medium text-foreground hover:underline">
              Back to sign in
            </Link>
          </>
        ) : (
          "Continuing with Google…"
        )}
      </p>
    </div>
  );
}
