"use client";

import { useActionState } from "react";
import { updatePassword } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Result = { error: string | null } | void;

export function PasswordForm() {
  const [state, action, pending] = useActionState(
    async (_prev: Result, formData: FormData) => updatePassword(formData),
    undefined,
  );

  return (
    <form action={action} className="mt-8 grid gap-3">
      <div className="grid gap-1.5">
        <Label htmlFor="password">New password</Label>
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
      <Button type="submit" className="w-fit" disabled={pending}>
        {pending ? "Saving…" : "Save password"}
      </Button>
      {state && "error" in state && state.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}
    </form>
  );
}
