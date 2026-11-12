"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cancelBuyerOrder } from "@/app/actions/selling";
import { Button } from "@/components/ui/button";

export function OrderCancel({
  orderId,
  reserved,
}: {
  orderId: string;
  reserved: boolean;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    (_prev: { error: string | null; message?: string } | undefined, formData: FormData) =>
      cancelBuyerOrder(formData),
    undefined,
  );
  useEffect(() => {
    if (state?.message) router.refresh();
  }, [state, router]);
  return (
    <form action={action} className="mt-6 grid gap-2">
      <input type="hidden" name="order_id" value={orderId} />
      <p className="text-sm text-muted-foreground">
        {reserved
          ? "You can cancel this reservation until the stall marks it ready."
          : "Cancelling now returns the item price and the service fee."}
      </p>
      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state?.message ? <p className="text-sm text-muted-foreground">{state.message}</p> : null}
      <Button type="submit" variant="outline" className="w-fit" disabled={pending}>
        {pending ? "Cancelling…" : "Cancel"}
      </Button>
    </form>
  );
}
