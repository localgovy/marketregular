"use client";

import { useState } from "react";
import { authNextCookie, safePath } from "@/lib/auth-redirect";
import {
  buildGoogleAuthUrl,
  googleRedirectUri,
  hashNonce,
  isSiteOwnedOrigin,
  randomOAuthValue,
  storeGoogleOAuthHandoff,
} from "@/lib/google-oauth";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";
import { Button } from "@/components/ui/button";

export function GoogleSignIn({
  next = "/account",
  error: initialError,
}: {
  next?: string;
  error?: string;
}) {
  const [error, setError] = useState(initialError ?? null);
  const [pending, setPending] = useState(false);

  async function onClick() {
    setError(null);
    setPending(true);
    const supabase = createBrowserSupabaseClient();
    const url = supabaseUrl();
    const key = supabaseAnonKey();
    if (!supabase || !url || !key) {
      setPending(false);
      setError("Supabase is not configured yet.");
      return;
    }

    try {
      const settingsRes = await fetch(`${url}/auth/v1/settings`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
      });
      const settings = (await settingsRes.json()) as {
        external?: { google?: boolean };
      };
      if (!settings.external?.google) {
        setPending(false);
        setError("Google sign-in is not enabled yet. Use email and password.");
        return;
      }

      const origin = window.location.origin;
      if (isSiteOwnedOrigin(origin)) {
        const paramsRes = await fetch("/auth/google/params");
        const params = (await paramsRes.json()) as { clientId: string | null };
        if (!params.clientId) {
          setPending(false);
          setError("Google sign-in is not ready yet. Use email and password.");
          return;
        }
        const state = randomOAuthValue();
        const nonce = randomOAuthValue();
        document.cookie = authNextCookie(next);
        storeGoogleOAuthHandoff({ state, nonce, next: safePath(next) });
        window.location.assign(
          buildGoogleAuthUrl({
            clientId: params.clientId,
            redirectUri: googleRedirectUri(origin),
            state,
            nonce: await hashNonce(nonce),
          }),
        );
        return;
      }

      document.cookie = authNextCookie(next);
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          // No query string — exact allow-list entries fail when `?next=` is appended,
          // and GoTrue then falls back to Site URL (often localhost).
          redirectTo: `${origin}/auth/callback`,
          skipBrowserRedirect: true,
          queryParams: { access_type: "offline", prompt: "select_account" },
        },
      });
      if (oauthError || !data.url) {
        setPending(false);
        setError("Google sign-in failed.");
        return;
      }
      window.location.assign(data.url);
    } catch {
      setPending(false);
      setError("Google sign-in failed.");
    }
  }

  return (
    <div>
      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={pending}
        onClick={onClick}
      >
        {pending ? "Opening Google…" : "Continue with Google"}
      </Button>
      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
