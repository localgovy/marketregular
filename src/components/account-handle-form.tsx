"use client";

import { useActionState } from "react";
import { updateUsername } from "@/app/actions/onboarding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Result = { error: string | null };

export function AccountHandleForm({ username }: { username: string | null }) {
  const [state, action, pending] = useActionState(
    async (_prev: Result | undefined, formData: FormData): Promise<Result> =>
      updateUsername(formData),
    undefined,
  );

  return (
    <form action={action} className="grid gap-3">
      <div className="grid gap-1.5">
        <Label htmlFor="username" className="text-chalk">
          Handle
        </Label>
        <Input
          id="username"
          name="username"
          defaultValue={username ?? ""}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          autoComplete="username"
          className="border-primary-foreground/35 bg-primary-foreground text-foreground"
        />
      </div>
      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <Button type="submit" disabled={pending} className="w-fit bg-primary-foreground text-primary hover:bg-chalk">
        {pending ? "Saving…" : "Save handle"}
      </Button>
    </form>
  );
}
