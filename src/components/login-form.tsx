"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { requestPasswordReset, signInWithPassword } from "@/app/actions/auth";
import { GoogleSignIn } from "@/components/google-sign-in";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isSupabaseConfigured } from "@/lib/constants";

type AuthResult = { error: string | null; message?: string } | void;

function signupHref(next: string) {
  return next && next !== "/account" ? `/signup?next=${encodeURIComponent(next)}` : "/signup";
}

export function LoginForm({
  next = "/account",
  oauthError,
}: {
  next?: string;
  oauthError?: string;
}) {
  const configured = isSupabaseConfigured();
  const router = useRouter();
  const [forgot, setForgot] = useState(false);
  const [queryError, setQueryError] = useState(oauthError ?? null);

  useEffect(() => {
    if (!oauthError) return;
    const params = new URLSearchParams(window.location.search);
    if (!params.has("error")) return;
    params.delete("error");
    const qs = params.toString();
    router.replace(qs ? `/login?${qs}` : "/login", { scroll: false });
  }, [oauthError, router]);

  async function passwordAction(_prev: AuthResult, formData: FormData) {
    setQueryError(null);
    formData.set("next", next);
    return signInWithPassword(formData);
  }
  async function resetAction(_prev: AuthResult, formData: FormData) {
    return requestPasswordReset(formData);
  }

  const [passState, passSubmit, passPending] = useActionState(passwordAction, undefined);
  const [resetState, resetSubmit, resetPending] = useActionState(resetAction, undefined);

  if (!configured) {
    return (
      <div className="rounded-xl bg-card p-6 ring-1 ring-foreground/10">
        <p className="type-column">The desk is still connecting accounts</p>
        <p className="mt-2 text-sm text-muted-foreground">The directory is open.</p>
      </div>
    );
  }

  if (forgot) {
    return (
      <form action={resetSubmit} className="grid gap-3">
        <p className="text-sm text-muted-foreground">
          We&apos;ll email a link to set a new password.
        </p>
        <div className="grid gap-1.5">
          <Label htmlFor="reset-email">Email</Label>
          <Input id="reset-email" name="email" type="email" required autoComplete="email" />
        </div>
        <Button type="submit" disabled={resetPending}>
          {resetPending ? "Sending…" : "Send reset link"}
        </Button>
        <button
          type="button"
          className="text-sm font-medium hover:underline"
          onClick={() => setForgot(false)}
        >
          Back to sign in
        </button>
        {resetState && "error" in resetState && resetState.error ? (
          <p className="text-sm text-destructive">{resetState.error}</p>
        ) : null}
        {resetState && "message" in resetState && resetState.message ? (
          <p className="text-sm text-primary">{resetState.message}</p>
        ) : null}
      </form>
    );
  }

  return (
    <div className="grid gap-8">
      <form action={passSubmit} className="grid gap-3">
        {queryError ? <p className="text-sm text-destructive">{queryError}</p> : null}
        <div className="grid gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required autoComplete="email" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
          />
        </div>
        <Button type="submit" disabled={passPending}>
          {passPending ? "Signing in…" : "Sign in"}
        </Button>
        <button
          type="button"
          className="justify-self-start text-sm font-medium hover:underline"
          onClick={() => setForgot(true)}
        >
          Forgot password
        </button>
        {passState && "error" in passState && passState.error ? (
          <p className="text-sm text-destructive">{passState.error}</p>
        ) : null}
      </form>

      <GoogleSignIn next={next} />

      <p className="text-sm text-muted-foreground">
        No account?{" "}
        <Link href={signupHref(next)} className="font-medium text-foreground hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
