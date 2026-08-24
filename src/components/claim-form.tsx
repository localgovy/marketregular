"use client";

import { useActionState } from "react";
import Link from "next/link";
import { submitClaim } from "@/app/actions/claims";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function ClaimForm({
  targetType,
  targetId,
  signedIn,
  nextPath,
}: {
  targetType: "market" | "vendor";
  targetId: string;
  signedIn: boolean;
  nextPath: string;
}) {
  const [state, action, pending] = useActionState(
    async (_prev: { error: string | null; message?: string } | null, formData: FormData) => {
      return submitClaim(formData);
    },
    null,
  );

  if (!signedIn) {
    return (
      <p className="mt-4 text-sm">
        <Link
          href={`/login?next=${encodeURIComponent(nextPath)}`}
          className="font-medium hover:underline"
        >
          Sign in
        </Link>{" "}
        to request a claim.
      </p>
    );
  }

  return (
    <form action={action} className="mt-4 grid gap-2">
      <input type="hidden" name="target_type" value={targetType} />
      <input type="hidden" name="target_id" value={targetId} />
      <Textarea
        name="evidence"
        required
        minLength={20}
        placeholder="How can we verify you run this listing? Website, stall name, or market manager email."
      />
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? "Sending…" : "Request to claim this listing"}
      </Button>
      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state?.message ? <p className="text-sm text-primary">{state.message}</p> : null}
    </form>
  );
}
