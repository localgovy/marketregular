"use client";

import { useActionState } from "react";
import { signUpForPortal } from "@/app/actions/auth";
import { AuthLegalNote } from "@/components/auth-legal-note";
import { GoogleSignIn } from "@/components/google-sign-in";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isSupabaseConfigured } from "@/lib/constants";
import { portalHomePath } from "@/lib/portal-application";
import type { ClaimTarget } from "@/types/database";

type AuthResult = { error: string | null; message?: string } | void;

export function PortalSignupForm({
  kind,
  requestId,
  listingName,
}: {
  kind: ClaimTarget;
  requestId?: string | null;
  listingName?: string | null;
}) {
  const configured = isSupabaseConfigured();
  const stall = kind === "vendor";
  const next = portalHomePath(kind, requestId);

  async function signUpAction(_prev: AuthResult, formData: FormData) {
    formData.set("kind", kind);
    if (requestId) formData.set("request_id", requestId);
    return signUpForPortal(formData);
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
      <div className="grid gap-3">
        <GoogleSignIn next={next} />
        <AuthLegalNote mode="signup" />
      </div>

      <p className="text-sm text-muted-foreground">or use email</p>

      <form action={submit} className="grid gap-3">
        <p className="sr-only" aria-hidden="true">
          <label htmlFor={`${kind}-gotcha`}>Company</label>
          <input id={`${kind}-gotcha`} name="_gotcha" tabIndex={-1} autoComplete="off" />
        </p>
        {listingName ? (
          <p className="text-base">
            This account is for <span className="font-medium">{listingName}</span>.
          </p>
        ) : null}
        <div className="grid gap-1.5">
          <Label htmlFor={`${kind}-name`}>Your name</Label>
          <Input id={`${kind}-name`} name="display_name" required minLength={2} maxLength={60} autoComplete="name" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${kind}-email`}>Email</Label>
          <Input id={`${kind}-email`} name="email" type="email" required maxLength={120} autoComplete="email" />
          <p className="text-sm text-muted-foreground">
            The email you use for the {stall ? "business" : "organization"}. A Gmail address is fine.
          </p>
        </div>
        {requestId ? null : (
          <div className="grid gap-1.5">
            <Label htmlFor={`${kind}-org`}>Organization</Label>
            <Input
              id={`${kind}-org`}
              name="organization_name"
              required
              maxLength={120}
              autoComplete="organization"
            />
          </div>
        )}
        <div className="grid gap-1.5">
          <Label htmlFor={`${kind}-password`}>Password</Label>
          <Input
            id={`${kind}-password`}
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${kind}-confirm`}>Confirm password</Label>
          <Input
            id={`${kind}-confirm`}
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
          <p className="text-sm">{state.message}</p>
        ) : null}
      </form>
    </div>
  );
}
