"use client";

import { useActionState, useState } from "react";
import { decideApplication, type ApplicationDecision } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ClaimTarget } from "@/types/database";

export function ApplicationDecisionForm({
  id,
  kind,
  suggested,
}: {
  id: string;
  kind: ClaimTarget;
  suggested: { id: string; name: string } | null;
}) {
  const stall = kind === "vendor";
  const [state, action, pending] = useActionState(decideApplication, undefined);
  const [query, setQuery] = useState("");

  return (
    <div className="mt-4 grid gap-4">
      {suggested ? (
        <form action={action} className="flex flex-wrap items-center gap-3">
          <input type="hidden" name="application_id" value={id} />
          <input type="hidden" name="intent" value="assign" />
          <input type="hidden" name="target_id" value={suggested.id} />
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : stall ? "Assign this stall" : "Assign this market"}
          </Button>
        </form>
      ) : null}
      <form action={action} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <input type="hidden" name="application_id" value={id} />
        <input type="hidden" name="intent" value="find" />
        <div className="grid gap-1.5">
          <Label htmlFor={`${id}-q`}>{stall ? "Find a stall" : "Find a market"}</Label>
          <Input
            id={`${id}-q`}
            name="q"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Listing name"
          />
        </div>
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? "Searching…" : "Search"}
        </Button>
      </form>
      {state?.matches?.length ? (
        <ul className="grid gap-2">
          {state.matches.map((listing) => (
            <li key={listing.id} className="flex flex-wrap items-baseline justify-between gap-3">
              <span className="text-base font-medium">
                {listing.name}
                {listing.status === "published" ? null : (
                  <span className="ml-2 text-sm font-normal text-muted-foreground">Draft</span>
                )}
              </span>
              <form action={action}>
                <input type="hidden" name="application_id" value={id} />
                <input type="hidden" name="intent" value="assign" />
                <input type="hidden" name="target_id" value={listing.id} />
                <Button type="submit" disabled={pending}>
                  Assign
                </Button>
              </form>
            </li>
          ))}
        </ul>
      ) : null}
      <form action={action}>
        <input type="hidden" name="application_id" value={id} />
        <input type="hidden" name="intent" value="reject" />
        <Button type="submit" variant="outline" disabled={pending}>
          Turn down
        </Button>
      </form>
      <DecisionNote state={state} />
    </div>
  );
}

function DecisionNote({ state }: { state: ApplicationDecision | undefined }) {
  if (state?.error) return <p className="text-sm text-destructive">{state.error}</p>;
  if (state?.message) return <p className="text-sm text-primary">{state.message}</p>;
  return null;
}
