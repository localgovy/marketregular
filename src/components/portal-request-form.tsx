"use client";

import { useActionState } from "react";
import { submitPortalApplication } from "@/app/actions/portal-application";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ClaimTarget } from "@/types/database";

type Result = { error: string | null; message?: string } | undefined;

export function PortalRequestForm({
  kind,
  request,
  organizationDefault,
  rejected,
  instead,
}: {
  kind: ClaimTarget;
  request: { id: string; name: string } | null;
  organizationDefault?: string | null;
  rejected?: boolean;
  instead?: boolean;
}) {
  const stall = kind === "vendor";
  const [state, action, pending] = useActionState(
    async (_prev: Result, formData: FormData) => submitPortalApplication(formData),
    undefined,
  );

  if (state?.message) {
    return <p className="text-base">{state.message}</p>;
  }

  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="kind" value={kind} />
      <p className="sr-only" aria-hidden="true">
        <label htmlFor={`${kind}-request-gotcha`}>Company</label>
        <input id={`${kind}-request-gotcha`} name="_gotcha" tabIndex={-1} autoComplete="off" />
      </p>
      {rejected ? (
        <p className="text-base text-muted-foreground">
          We couldn&apos;t assign a listing to this account. You can send another request.
        </p>
      ) : null}
      {request ? (
        <>
          <input type="hidden" name="request_id" value={request.id} />
          <p className="text-base">
            {instead ? "Request " : "This account is for "}
            <span className="font-medium">{request.name}</span>
            {instead ? " instead." : "."}
          </p>
        </>
      ) : (
        <div className="grid gap-1.5">
          <Label htmlFor={`${kind}-organization`}>Organization</Label>
          <Input
            id={`${kind}-organization`}
            name="organization_name"
            required
            maxLength={120}
            defaultValue={organizationDefault ?? ""}
            autoComplete="organization"
          />
        </div>
      )}
      <Button type="submit" disabled={pending}>
        {pending
          ? "Sending…"
          : request
            ? instead
              ? stall
                ? "Request this stall instead"
                : "Request this market instead"
              : stall
                ? "Request this stall"
                : "Request this market"
            : "Request access"}
      </Button>
      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
    </form>
  );
}
