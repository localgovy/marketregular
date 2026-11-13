"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUpWithPassword } from "@/app/actions/auth";
import { GoogleSignIn } from "@/components/google-sign-in";
import { AuthLegalNote } from "@/components/auth-legal-note";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { siteCopy } from "@/content/site-copy";
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
        <p className="type-column">Accounts are still connecting</p>
        <p className="mt-2 text-sm text-muted-foreground">The directory is open.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-8">
      <div className="grid gap-3">
        <GoogleSignIn next={next} />
        <AuthLegalNote mode="signup" />
      </div>

      <p className="text-sm text-muted-foreground">or use email</p>

      <form action={submit} className="grid gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="display_name">{siteCopy["/signup"].nameOnPosts}</Label>
          <Input id="display_name" name="display_name" required autoComplete="nickname" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="email">{siteCopy["/signup"].email}</Label>
          <Input id="email" name="email" type="email" required autoComplete="email" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="password">{siteCopy["/signup"].password}</Label>
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
          <Label htmlFor="confirm">{siteCopy["/signup"].confirmPassword}</Label>
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
          {pending ? siteCopy["/signup"].creating : siteCopy["/signup"].createAccount}
        </Button>
        {state && "error" in state && state.error ? (
          <p className="text-sm text-destructive">{state.error}</p>
        ) : null}
        {state && "message" in state && state.message ? (
          <p className="text-sm text-primary">{state.message}</p>
        ) : null}
      </form>

      <p className="text-sm text-muted-foreground">
        {siteCopy["/signup"].already}{" "}
        <Link
          href={loginHref(next)}
          rel="nofollow"
          className="font-medium text-foreground hover:underline"
        >
          {siteCopy["/signup"].signIn}
        </Link>
      </p>
    </div>
  );
}
