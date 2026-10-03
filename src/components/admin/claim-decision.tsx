"use client";

import { useActionState } from "react";
import { decideClaim } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";

export function ClaimDecision({ id }: { id: string }) {
  const [state, action, pending] = useActionState(
    async (_prev: { error: string | null }, formData: FormData) => {
      const status = String(formData.get("status"));
      if (status === "rejected") return decideClaim(id, "rejected", "Not enough evidence");
      return decideClaim(id, "approved");
    },
    { error: null },
  );

  return (
    <form action={action} className="mt-3 flex flex-wrap items-center gap-2">
      <Button type="submit" name="status" value="approved" disabled={pending}>
        {pending ? "Saving…" : "Approve"}
      </Button>
      <Button type="submit" name="status" value="rejected" variant="outline" disabled={pending}>
        Reject
      </Button>
      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
    </form>
  );
}
