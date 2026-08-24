"use client";

import { useActionState, useState } from "react";
import {
  requestPasswordReset,
  signInWithGoogle,
  signInWithMagicLink,
  signInWithPassword,
  signUpWithPassword,
} from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isSupabaseConfigured } from "@/lib/constants";

type AuthResult = { error: string | null; message?: string } | void;

export function LoginForm({ next = "/account" }: { next?: string }) {
  const configured = isSupabaseConfigured();
  const [forgot, setForgot] = useState(false);

  async function passwordAction(_prev: AuthResult, formData: FormData) {
    formData.set("next", next);
    return signInWithPassword(formData);
  }
  async function signUpAction(_prev: AuthResult, formData: FormData) {
    formData.set("next", next);
    return signUpWithPassword(formData);
  }
  async function magicAction(_prev: AuthResult, formData: FormData) {
    formData.set("next", next);
    return signInWithMagicLink(formData);
  }
  async function resetAction(_prev: AuthResult, formData: FormData) {
    return requestPasswordReset(formData);
  }

  const [passState, passSubmit, passPending] = useActionState(passwordAction, undefined);
  const [upState, upSubmit, upPending] = useActionState(signUpAction, undefined);
  const [magicState, magicSubmit, magicPending] = useActionState(magicAction, undefined);
  const [resetState, resetSubmit, resetPending] = useActionState(resetAction, undefined);

  if (!configured) {
    return (
      <div className="rounded-xl bg-card p-6 ring-1 ring-foreground/10">
        <p className="type-column">The desk is still connecting accounts</p>
        <p className="mt-2 text-sm text-muted-foreground">The directory is open.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-8">
      {forgot ? (
        <form action={resetSubmit} className="grid gap-3">
          <h3>Forgot password</h3>
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
      ) : (
        <form action={passSubmit} className="grid gap-3">
          <h3>Sign in</h3>
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
            className="text-sm font-medium hover:underline"
            onClick={() => setForgot(true)}
          >
            Forgot password
          </button>
          {passState && "error" in passState && passState.error ? (
            <p className="text-sm text-destructive">{passState.error}</p>
          ) : null}
        </form>
      )}

      <form action={upSubmit} className="grid gap-3">
        <h3>Create an account</h3>
        <div className="grid gap-1.5">
          <Label htmlFor="display_name">Name on posts</Label>
          <Input id="display_name" name="display_name" required autoComplete="nickname" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="signup-email">Email</Label>
          <Input id="signup-email" name="email" type="email" required autoComplete="email" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="signup-password">Password</Label>
          <Input
            id="signup-password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
          />
        </div>
        <Button type="submit" variant="outline" disabled={upPending}>
          {upPending ? "Creating…" : "Create account"}
        </Button>
        {upState && "error" in upState && upState.error ? (
          <p className="text-sm text-destructive">{upState.error}</p>
        ) : null}
        {upState && "message" in upState && upState.message ? (
          <p className="text-sm text-primary">{upState.message}</p>
        ) : null}
      </form>

      <form action={magicSubmit} className="grid gap-3">
        <h3>Magic link</h3>
        <Input name="email" type="email" required placeholder="you@email.com" autoComplete="email" />
        <Button type="submit" variant="secondary" disabled={magicPending}>
          Email me a link
        </Button>
        {magicState && "message" in magicState && magicState.message ? (
          <p className="text-sm text-primary">{magicState.message}</p>
        ) : null}
        {magicState && "error" in magicState && magicState.error ? (
          <p className="text-sm text-destructive">{magicState.error}</p>
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
    </div>
  );
}
