"use client";

import { useActionState } from "react";
import { updateProfile } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Result = { error: string | null };

export function AccountNameForm({ displayName }: { displayName: string }) {
  const [state, action, pending] = useActionState(
    async (_prev: Result | undefined, formData: FormData): Promise<Result> =>
      updateProfile(formData),
    undefined,
  );

  return (
    <form action={action} className="grid gap-3">
      <div className="grid gap-1.5">
        <Label htmlFor="display_name" className="text-chalk">
          Name on posts
        </Label>
        <Input
          id="display_name"
          name="display_name"
          defaultValue={displayName}
          className="border-primary-foreground/35 bg-primary-foreground text-foreground"
        />
      </div>
      {state?.error ? (
        <p role="alert" className="text-base font-medium text-chalk">
          {state.error}
        </p>
      ) : null}
      <Button
        type="submit"
        disabled={pending}
        className="w-fit bg-primary-foreground text-primary hover:bg-chalk"
      >
        {pending ? "Saving…" : "Save name"}
      </Button>
    </form>
  );
}
