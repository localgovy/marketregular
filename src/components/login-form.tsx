"use client";

import { useActionState } from "react";
import {
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

  async function passwordAction(_prev: AuthResult, formData: FormData) {
    formData.set("next", next);
    return signInWithPassword(formData);
  }
  async function signUpAction(_prev: AuthResult, formData: FormData) {
    return signUpWithPassword(formData);
  }
  async function magicAction(_prev: AuthResult, formData: FormData) {
    return signInWithMagicLink(formData);
  }

  const [passState, passSubmit, passPending] = useActionState(passwordAction, undefined);
  const [upState, upSubmit, upPending] = useActionState(signUpAction, undefined);
  const [magicState, magicSubmit, magicPending] = useActionState(magicAction, undefined);

  if (!configured) {
    return (
      <div className="rounded-xl bg-card p-6 ring-1 ring-foreground/10">
        <p className="font-heading text-xl">Accounts are almost ready</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Connect a Supabase project (see README) to enable sign-in, on-site posts, and reviews.
          The directory already works without it.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-8">
      <form action={passSubmit} className="grid gap-3">
        <h2 className="font-heading text-xl">Sign in</h2>
        <div className="grid gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required autoComplete="email" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" required autoComplete="current-password" />
        </div>
        <Button type="submit" disabled={passPending}>
          {passPending ? "Signing in…" : "Sign in"}
        </Button>
        {passState && "error" in passState && passState.error ? (
          <p className="text-sm text-destructive">{passState.error}</p>
        ) : null}
      </form>

      <form action={upSubmit} className="grid gap-3">
        <h2 className="font-heading text-xl">Create an account</h2>
        <div className="grid gap-1.5">
          <Label htmlFor="display_name">Name on posts</Label>
          <Input id="display_name" name="display_name" required />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="signup-email">Email</Label>
          <Input id="signup-email" name="email" type="email" required />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="signup-password">Password</Label>
          <Input id="signup-password" name="password" type="password" required minLength={8} />
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
        <h2 className="font-heading text-xl">Magic link</h2>
        <Input name="email" type="email" required placeholder="you@email.com" />
        <Button type="submit" variant="secondary" disabled={magicPending}>
          Email me a link
        </Button>
        {magicState && "message" in magicState && magicState.message ? (
          <p className="text-sm text-primary">{magicState.message}</p>
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
