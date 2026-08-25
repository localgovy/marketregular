"use client";

import { useActionState } from "react";
import { deleteAccount } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Result = { error: string | null } | void;

export function DeleteAccountForm() {
  const [state, action, pending] = useActionState(
    async (_prev: Result, formData: FormData) => deleteAccount(formData),
    undefined,
  );

  return (
    <form action={action} className="mt-3 grid max-w-sm gap-3">
      <Label htmlFor="delete-current">Current password</Label>
      <Input
        id="delete-current"
        name="current_password"
        type="password"
        autoComplete="current-password"
      />
      <Label htmlFor="delete-confirm">Type delete to confirm</Label>
      <Input id="delete-confirm" name="confirm" autoComplete="off" />
      <Button type="submit" variant="destructive" className="w-fit" disabled={pending}>
        {pending ? "Deleting…" : "Delete account"}
      </Button>
      {state && "error" in state && state.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}
    </form>
  );
}
