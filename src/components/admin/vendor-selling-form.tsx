"use client";

import { useActionState } from "react";
import { setVendorSelling } from "@/app/actions/selling";
import { Button } from "@/components/ui/button";

export function VendorSellingForm({
  vendorId,
  approved,
}: {
  vendorId: string;
  approved: boolean;
}) {
  const [state, action, pending] = useActionState(
    (_prev: { error: string | null; message?: string } | undefined, formData: FormData) =>
      setVendorSelling(formData),
    undefined,
  );

  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="vendor_id" value={vendorId} />
      <label className="flex items-baseline gap-2 text-sm">
        <input
          type="checkbox"
          name="selling_approved"
          defaultChecked={approved}
          className="accent-primary"
        />
        <span>This stall can sell to signed-in buyers</span>
      </label>
      <p className="text-sm text-muted-foreground">
        Buy stays off while listing for sale is paused. This switch is saved, and it does not reopen checkout.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save selling"}
        </Button>
        {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
        {state?.message ? <p className="text-sm text-primary">{state.message}</p> : null}
      </div>
    </form>
  );
}
