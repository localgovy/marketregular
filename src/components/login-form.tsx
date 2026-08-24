"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { requestPasswordReset, signInWithGoogle, signInWithPassword } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isSupabaseConfigured } from "@/lib/constants";

type AuthResult = { error: string | null; message?: string } | void;

function signupHref(next: string) {
  return next && next !== "/account" ? `/signup?next=${encodeURIComponent(next)}` : "/signup";
}

export function LoginForm({ next = "/account" }: { next?: string }) {
  const configured = isSupabaseConfigured();
  const [forgot, setForgot] = useState(false);

  async function passwordAction(_prev: AuthResult, formData: FormData) {
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

      <form
        action={async () => {
          await signInWithGoogle(next);
        }}
      >
        <Button type="submit" variant="outline" className="w-full">
          Continue with Google
        </Button>
      </form>

      <p className="text-sm text-muted-foreground">
        No account?{" "}
        <Link href={signupHref(next)} className="font-medium text-foreground hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
