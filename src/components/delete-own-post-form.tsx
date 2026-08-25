"use client";

import { useActionState } from "react";
import { deleteOwnPost } from "@/app/actions/presence";
import { Button } from "@/components/ui/button";

type Result = { error: string | null };

export function DeleteOwnPostForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(
    async (_prev: Result | undefined, formData: FormData): Promise<Result> =>
      deleteOwnPost(formData),
    undefined,
  );

  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <Button type="submit" variant="ghost" size="sm" disabled={pending}>
        {pending ? "Deleting…" : "Delete"}
      </Button>
      {state?.error ? <p className="mt-1 text-sm text-destructive">{state.error}</p> : null}
    </form>
  );
}
