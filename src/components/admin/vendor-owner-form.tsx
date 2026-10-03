"use client";

import { useActionState } from "react";
import { assignVendorOwner } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function VendorOwnerForm({
  vendorId,
  ownerEmail,
}: {
  vendorId: string;
  ownerEmail: string | null;
}) {
  const [state, action, pending] = useActionState(assignVendorOwner, undefined);

  return (
    <form action={action} className="grid max-w-md gap-3">
      <input type="hidden" name="vendor_id" value={vendorId} />
      {ownerEmail ? (
        <p className="text-sm text-muted-foreground">Current owner: {ownerEmail}</p>
      ) : (
        <p className="text-sm text-muted-foreground">No one can edit this stall yet.</p>
      )}
      <div className="grid gap-1.5">
        <Label htmlFor="owner-email">Account email</Label>
        <Input
          id="owner-email"
          name="email"
          type="email"
          required
          autoComplete="off"
          placeholder="stall@example.com"
          defaultValue={ownerEmail ?? ""}
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Give them this stall"}
        </Button>
        {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
        {state?.message ? <p className="text-sm text-primary">{state.message}</p> : null}
      </div>
    </form>
  );
}
