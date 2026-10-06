"use client";

import { useActionState } from "react";
import { flagItem, unflagItem } from "@/app/actions/presence";
import { Button } from "@/components/ui/button";

export function FlagButton({
  table,
  id,
  flagged,
}: {
  table: "posts" | "reviews";
  id: string;
  flagged: boolean;
}) {
  const [state, action, pending] = useActionState(async () => {
    return flagged ? unflagItem(table, id) : flagItem(table, id);
  }, undefined);

  return (
    <form action={action} className="mt-2">
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? "Saving…" : flagged ? "Restore" : "Flag"}
      </Button>
      {state?.error ? <p className="mt-2 text-sm text-destructive">{state.error}</p> : null}
    </form>
  );
}
