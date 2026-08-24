"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUpWithPassword } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isSupabaseConfigured } from "@/lib/constants";

type AuthResult = { error: string | null; message?: string } | void;

function loginHref(next: string) {
  return next && next !== "/account" ? `/login?next=${encodeURIComponent(next)}` : "/login";
}

export function SignupForm({ next = "/account" }: { next?: string }) {
  const configured = isSupabaseConfigured();

  async function signUpAction(_prev: AuthResult, formData: FormData) {
    formData.set("next", next);
    return signUpWithPassword(formData);
  }

  const [state, submit, pending] = useActionState(signUpAction, undefined);

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
      <form action={submit} className="grid gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="display_name">Name on posts</Label>
          <Input id="display_name" name="display_name" required autoComplete="nickname" />
        </div>
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
            minLength={8}
            autoComplete="new-password"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="confirm">Confirm password</Label>
          <Input
            id="confirm"
            name="confirm"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
          />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create account"}
        </Button>
        {state && "error" in state && state.error ? (
          <p className="text-sm text-destructive">{state.error}</p>
        ) : null}
        {state && "message" in state && state.message ? (
          <p className="text-sm text-primary">{state.message}</p>
        ) : null}
      </form>

      <p className="text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href={loginHref(next)} className="font-medium text-foreground hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
