"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { takeGoogleOAuthHandoff } from "@/lib/google-oauth";
import { safePath } from "@/lib/auth-redirect";

type CallbackPayload = {
  oauthError: string | null;
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
    oauthError:
      hash.get("error_description") ??
      hash.get("error") ??
      query.get("error_description") ??
      query.get("error"),
    token: hash.get("id_token"),
    state: hash.get("state") ?? query.get("state"),
    handoff: takeGoogleOAuthHandoff(),
  };
  window.history.replaceState(null, "", window.location.pathname);
  return payload;
}

export function GoogleCallbackClient() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const { oauthError, token, state, handoff } = consumeGoogleCallback();

      if (oauthError) {
        if (!cancelled) setError(oauthError.slice(0, 280));
        return;
      }
      if (!token || !state || !handoff || state !== handoff.state) {
        if (!cancelled) setError("Google sign-in did not finish. Try again.");
        return;
      }

      const supabase = createBrowserSupabaseClient();
      if (!supabase) {
        if (!cancelled) setError("Supabase is not configured yet.");
        return;
      }

      const first = await supabase.auth.signInWithIdToken({
        provider: "google",
        token,
        nonce: handoff.nonce,
      });
      const result = first.error
        ? await supabase.auth.signInWithIdToken({ provider: "google", token })
        : first;
      if (result.error) {
        if (!cancelled) setError(result.error.message);
        return;
      }

      if (cancelled) return;
      router.replace(safePath(handoff.next));
      router.refresh();
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="mx-auto w-full max-w-md px-4 py-10">
      <h1>{error ? "Sign in" : "Signing in"}</h1>
      {error ? (
        <p className="type-lede mt-2 text-muted-foreground">
          {error}{" "}
          <Link href="/login" className="font-medium text-foreground hover:underline">
            Back to sign in
          </Link>
        </p>
      ) : (
        <p className="type-lede mt-2 text-muted-foreground">Continuing with Google…</p>
      )}
    </div>
  );
}
