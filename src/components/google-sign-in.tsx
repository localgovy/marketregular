"use client";

import { useState } from "react";
import { authNextCookie } from "@/lib/auth-redirect";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
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
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
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
